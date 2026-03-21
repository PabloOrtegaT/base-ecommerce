import { ZodError } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  createCheckoutSessionForUserMock,
  parseCheckoutRequestMock,
  CheckoutStockConflictErrorMock,
  listCheckoutProviderOptionsMock,
  enforceRateLimitMock,
  getClientIpFromRequestMock,
  trackErrorMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  createCheckoutSessionForUserMock: vi.fn(),
  parseCheckoutRequestMock: vi.fn((payload: unknown) => payload),
  CheckoutStockConflictErrorMock: class CheckoutStockConflictError extends Error {
    code = "insufficient_stock";
    lines: Array<{
      variantId: string;
      requestedQty: number;
      availableQty: number;
      reason: string;
    }>;

    constructor(lines: Array<{ variantId: string; requestedQty: number; availableQty: number; reason: string }>) {
      super("Cart no longer has enough stock.");
      this.lines = lines;
    }
  },
  listCheckoutProviderOptionsMock: vi.fn(
    () =>
      [] as Array<{
        method: "card" | "mercadopago" | "paypal";
        label: string;
        activeProvider: string;
        mode: "live" | "mock";
      }>,
  ),
  enforceRateLimitMock: vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 })),
  getClientIpFromRequestMock: vi.fn(() => "127.0.0.1"),
  trackErrorMock: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/server/payments/checkout-service", () => ({
  createCheckoutSessionForUser: createCheckoutSessionForUserMock,
  parseCheckoutRequest: parseCheckoutRequestMock,
  CheckoutStockConflictError: CheckoutStockConflictErrorMock,
}));

vi.mock("@/server/payments/provider", () => ({
  listCheckoutProviderOptions: listCheckoutProviderOptionsMock,
}));

vi.mock("@/server/security/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
  getClientIpFromRequest: getClientIpFromRequestMock,
}));

vi.mock("@/server/observability/telemetry", () => ({
  trackError: trackErrorMock,
}));

import { GET, POST } from "@/app/api/checkout/session/route";

describe("api/checkout/session route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCheckoutProviderOptionsMock.mockReturnValue([
      {
        method: "card",
        label: "Card (Primary)",
        activeProvider: "mock-card",
        mode: "mock",
      },
    ]);
    createCheckoutSessionForUserMock.mockResolvedValue({
      orderId: "order-1",
      orderNumber: "ORD-20260318-ABCD",
      providerId: "mock-card",
      providerDisplayName: "Mock Card Checkout",
      paymentSessionId: "mock_session_1",
      checkoutUrl: "http://localhost:3000/checkout/mock?session=mock_session_1",
      totals: {
        subtotalCents: 1000,
        discountCents: 0,
        shippingCents: 0,
        totalCents: 1000,
        itemCount: 1,
        currency: "USD",
      },
      coupon: null,
    });
  });

  it("GET returns provider options", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      providers: [
        {
          method: "card",
          label: "Card (Primary)",
          activeProvider: "mock-card",
          mode: "mock",
        },
      ],
    });
  });

  it("POST returns 401 when unauthenticated", async () => {
    getSessionUserMock.mockResolvedValue(null);
    const request = new Request("http://localhost:3000/api/checkout/session", {
      method: "POST",
      body: JSON.stringify({ provider: "card" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("POST returns 403 when user email is not verified", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: false,
    });
    const request = new Request("http://localhost:3000/api/checkout/session", {
      method: "POST",
      body: JSON.stringify({ provider: "card" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Please verify your email before starting checkout.",
    });
  });

  it("POST returns 429 when rate limited", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: true,
    });
    enforceRateLimitMock.mockReturnValueOnce({
      allowed: false,
      retryAfterSeconds: 9,
    });

    const request = new Request("http://localhost:3000/api/checkout/session", {
      method: "POST",
      body: JSON.stringify({ provider: "card" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("9");
  });

  it("POST returns 400 for invalid payload", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: true,
    });
    parseCheckoutRequestMock.mockImplementationOnce(() => {
      throw new ZodError([]);
    });

    const request = new Request("http://localhost:3000/api/checkout/session", {
      method: "POST",
      body: JSON.stringify({ provider: "bad-provider" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid checkout payload." });
  });

  it("POST returns domain validation errors as 400", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: true,
    });
    createCheckoutSessionForUserMock.mockRejectedValueOnce(new Error("Cart is empty."));

    const request = new Request("http://localhost:3000/api/checkout/session", {
      method: "POST",
      body: JSON.stringify({ provider: "card" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Cart is empty." });
  });

  it("POST returns 409 with insufficient_stock payload when reserve fails", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: true,
    });
    createCheckoutSessionForUserMock.mockRejectedValueOnce(
      new CheckoutStockConflictErrorMock([
        { variantId: "variant-1", requestedQty: 2, availableQty: 1, reason: "insufficient_stock" },
      ]),
    );

    const request = new Request("http://localhost:3000/api/checkout/session", {
      method: "POST",
      body: JSON.stringify({ provider: "card" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "One or more products no longer have enough stock.",
      code: "insufficient_stock",
      lines: [{ variantId: "variant-1", requestedQty: 2, availableQty: 1, reason: "insufficient_stock" }],
    });
  });

  it("POST maps missing orders schema to a migration hint", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: true,
    });
    const cause = new Error("no such table: order");
    const error = new Error("db failed");
    (error as Error & { cause?: unknown }).cause = cause;
    createCheckoutSessionForUserMock.mockRejectedValueOnce(error);

    const request = new Request("http://localhost:3000/api/checkout/session", {
      method: "POST",
      body: JSON.stringify({ provider: "card" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Orders schema is missing. Run `npm run db:migrate:local` and retry checkout.",
    });
  });

  it("POST maps foreign key constraint failures to stale-session response", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: true,
    });
    createCheckoutSessionForUserMock.mockRejectedValueOnce(
      new Error("FOREIGN KEY CONSTRAINT FAILED"),
    );

    const request = new Request("http://localhost:3000/api/checkout/session", {
      method: "POST",
      body: JSON.stringify({ provider: "card" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Your session is stale. Please sign out and sign in again.",
    });
  });

  it("POST creates checkout session when payload is valid", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: true,
    });

    const request = new Request("http://localhost:3000/api/checkout/session", {
      method: "POST",
      body: JSON.stringify({ provider: "card", couponCode: "SAVE10" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(createCheckoutSessionForUserMock).toHaveBeenCalledWith({
      userId: "user-1",
      customerEmail: "user@example.com",
      provider: "card",
      couponCode: "SAVE10",
      successPath: undefined,
      cancelPath: undefined,
    });
  });

  it("POST returns 500 and tracks unexpected failures", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: true,
    });
    createCheckoutSessionForUserMock.mockRejectedValueOnce(new Error("provider unavailable"));

    const request = new Request("http://localhost:3000/api/checkout/session", {
      method: "POST",
      body: JSON.stringify({ provider: "card" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Could not create checkout session." });
    expect(trackErrorMock).toHaveBeenCalled();
  });

  it("POST tracks non-Error failures as generic 500", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerified: true,
    });
    createCheckoutSessionForUserMock.mockRejectedValueOnce("unknown");

    const request = new Request("http://localhost:3000/api/checkout/session", {
      method: "POST",
      body: JSON.stringify({ provider: "card" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Could not create checkout session." });
    expect(trackErrorMock).toHaveBeenCalledWith("api.checkout.session.post", "unknown", { userId: "user-1" });
  });
});
