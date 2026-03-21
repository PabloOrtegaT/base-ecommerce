import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, processPaymentWebhookEventMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  processPaymentWebhookEventMock: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/server/payments/webhook-service", () => ({
  processPaymentWebhookEvent: processPaymentWebhookEventMock,
}));

import { POST } from "@/app/api/payments/mock/complete/route";

describe("api/payments/mock/complete route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    processPaymentWebhookEventMock.mockResolvedValue({
      kind: "processed",
      eventId: "evt-1",
      orderId: "550e8400-e29b-41d4-a716-446655440000",
      outcome: "succeeded",
    });
  });

  it("returns 401 when unauthenticated", async () => {
    getSessionUserMock.mockResolvedValue(null);
    const request = new Request("http://localhost:3000/api/payments/mock/complete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid payload", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    const request = new Request("http://localhost:3000/api/payments/mock/complete", {
      method: "POST",
      body: JSON.stringify({ orderId: "bad-id" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid payload." });
  });

  it("processes mock webhook event and returns received payload", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    const request = new Request("http://localhost:3000/api/payments/mock/complete", {
      method: "POST",
      body: JSON.stringify({
        orderId: "550e8400-e29b-41d4-a716-446655440000",
        providerSessionId: "session-1",
        providerId: "mock-card",
        outcome: "succeeded",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.received).toBe(true);
    expect(processPaymentWebhookEventMock).toHaveBeenCalled();
  });
});
