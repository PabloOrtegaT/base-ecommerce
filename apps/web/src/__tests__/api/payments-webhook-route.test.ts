import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveProviderFromWebhookRouteMock, parseWebhookEventMock, processPaymentWebhookEventMock, trackErrorMock } =
  vi.hoisted(() => ({
    resolveProviderFromWebhookRouteMock: vi.fn(),
    parseWebhookEventMock: vi.fn(),
    processPaymentWebhookEventMock: vi.fn(),
    trackErrorMock: vi.fn(),
  }));

vi.mock("@/server/payments/provider", () => ({
  resolveProviderFromWebhookRoute: resolveProviderFromWebhookRouteMock,
}));

vi.mock("@/server/payments/webhook-service", () => ({
  processPaymentWebhookEvent: processPaymentWebhookEventMock,
}));

vi.mock("@/server/observability/telemetry", () => ({
  trackError: trackErrorMock,
}));

import { POST } from "@/app/api/payments/webhook/[provider]/route";

describe("api/payments/webhook/[provider] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveProviderFromWebhookRouteMock.mockReturnValue({
      parseWebhookEvent: parseWebhookEventMock,
    });
    parseWebhookEventMock.mockResolvedValue({
      providerId: "mock-card",
      eventId: "evt_1",
      eventType: "mock.checkout.succeeded",
      occurredAt: new Date(),
      orderId: "order-1",
      providerSessionId: "session-1",
      outcome: "succeeded",
      payload: "{}",
    });
    processPaymentWebhookEventMock.mockResolvedValue({
      kind: "processed",
      eventId: "evt_1",
      orderId: "order-1",
      outcome: "succeeded",
    });
  });

  it("returns processed payload when webhook is accepted", async () => {
    const request = new Request("http://localhost:3000/api/payments/webhook/mock-card", {
      method: "POST",
      body: "{}",
    });

    const response = await POST(request, {
      params: Promise.resolve({ provider: "mock-card" }),
    });

    expect(resolveProviderFromWebhookRouteMock).toHaveBeenCalledWith("mock-card");
    expect(processPaymentWebhookEventMock).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      received: true,
      idempotent: false,
      eventId: "evt_1",
      orderId: "order-1",
      outcome: "succeeded",
    });
  });

  it("returns idempotent response on duplicate event", async () => {
    processPaymentWebhookEventMock.mockResolvedValueOnce({
      kind: "duplicate",
      eventId: "evt_1",
    });

    const request = new Request("http://localhost:3000/api/payments/webhook/mock-card", {
      method: "POST",
      body: "{}",
    });
    const response = await POST(request, {
      params: Promise.resolve({ provider: "mock-card" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      received: true,
      idempotent: true,
      eventId: "evt_1",
    });
  });

  it("returns 400 on parsing/processing errors", async () => {
    parseWebhookEventMock.mockRejectedValueOnce(new Error("invalid signature"));
    const request = new Request("http://localhost:3000/api/payments/webhook/stripe", {
      method: "POST",
      body: "{}",
    });
    const response = await POST(request, {
      params: Promise.resolve({ provider: "stripe" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid payment webhook event." });
    expect(trackErrorMock).toHaveBeenCalled();
  });
});
