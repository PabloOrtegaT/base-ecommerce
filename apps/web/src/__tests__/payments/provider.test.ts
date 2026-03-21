import { beforeEach, describe, expect, it, vi } from "vitest";

type PaymentRuntimeConfigShape = {
  stripeSecretKey: string | undefined;
  stripeWebhookSecret: string | undefined;
  mercadoPagoAccessToken: string | undefined;
  mercadoPagoWebhookSecret: string | undefined;
  paypalClientId: string | undefined;
  paypalClientSecret: string | undefined;
  paypalWebhookId: string | undefined;
  mockWebhookSecret: string | undefined;
};

const { getHostRuntimeConfigMock, getPaymentRuntimeConfigMock, getPaymentProviderFlagsMock } = vi.hoisted(() => ({
  getHostRuntimeConfigMock: vi.fn(() => ({
    appBaseUrl: "http://storefront.lvh.me:3000",
    adminBaseUrl: "http://admin.lvh.me:3000",
    adminRequireCfAccess: false,
  })),
  getPaymentRuntimeConfigMock: vi.fn<() => PaymentRuntimeConfigShape>(() => ({
    stripeSecretKey: undefined,
    stripeWebhookSecret: undefined,
    mercadoPagoAccessToken: undefined,
    mercadoPagoWebhookSecret: undefined,
    paypalClientId: undefined,
    paypalClientSecret: undefined,
    paypalWebhookId: undefined,
    mockWebhookSecret: undefined,
  })),
  getPaymentProviderFlagsMock: vi.fn(() => ({
    stripeEnabled: false,
    mercadoPagoEnabled: false,
    paypalEnabled: false,
  })),
}));

vi.mock("@/server/config/runtime-env", () => ({
  getHostRuntimeConfig: getHostRuntimeConfigMock,
  getPaymentRuntimeConfig: getPaymentRuntimeConfigMock,
  getPaymentProviderFlags: getPaymentProviderFlagsMock,
}));

import {
  listCheckoutProviderOptions,
  resolvePaymentProvider,
  resolveProviderFromWebhookRoute,
} from "@/server/payments/provider";

describe("payments provider abstraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to mock providers when live credentials are missing", () => {
    const card = resolvePaymentProvider("card");
    const mercadoPago = resolvePaymentProvider("mercadopago");
    const paypal = resolvePaymentProvider("paypal");

    expect(card.id).toBe("mock-card");
    expect(mercadoPago.id).toBe("mock-mercadopago");
    expect(paypal.id).toBe("mock-paypal");
  });

  it("returns checkout option metadata with provider mode", () => {
    const options = listCheckoutProviderOptions();
    expect(options).toEqual([
      {
        method: "card",
        label: "Card (Primary)",
        activeProvider: "mock-card",
        mode: "mock",
      },
      {
        method: "mercadopago",
        label: "Mercado Pago (Other payment forms)",
        activeProvider: "mock-mercadopago",
        mode: "mock",
      },
      {
        method: "paypal",
        label: "PayPal (Other payment forms)",
        activeProvider: "mock-paypal",
        mode: "mock",
      },
    ]);
  });

  it("throws when live webhook route is requested without credentials", () => {
    expect(() => resolveProviderFromWebhookRoute("stripe")).toThrow(
      "Stripe webhook route is disabled because STRIPE_SECRET_KEY is not configured.",
    );
  });

  it("parses mock webhook events", async () => {
    const provider = resolveProviderFromWebhookRoute("mock-card");
    const request = new Request("http://localhost:3000/api/payments/webhook/mock-card", {
      method: "POST",
      body: JSON.stringify({
        eventId: "evt_mock_1",
        eventType: "mock.checkout.succeeded",
        orderId: "order-1",
        providerSessionId: "session-1",
        outcome: "succeeded",
      }),
    });

    const event = await provider.parseWebhookEvent(request);
    expect(event.providerId).toBe("mock-card");
    expect(event.eventId).toBe("evt_mock_1");
    expect(event.outcome).toBe("succeeded");
  });

  it("builds mock checkout URLs without reservation metadata", async () => {
    const provider = resolvePaymentProvider("card");
    const session = await provider.createCheckoutSession({
      orderId: "order-1",
      orderNumber: "ORD-20260320-1234",
      totals: {
        subtotalCents: 1000,
        discountCents: 0,
        shippingCents: 0,
        totalCents: 1000,
        itemCount: 1,
        currency: "USD",
      },
      successUrl: "http://localhost:3000/checkout/success?order=order-1",
      cancelUrl: "http://localhost:3000/checkout/cancel?order=order-1",
      customerEmail: "owner@example.com",
    });

    expect(session.checkoutUrl).not.toContain("holdExpiresAt=");
  });

  it("creates stripe checkout without injecting reservation expiry", async () => {
    getPaymentProviderFlagsMock.mockReturnValue({
      stripeEnabled: true,
      mercadoPagoEnabled: false,
      paypalEnabled: false,
    });
    getPaymentRuntimeConfigMock.mockReturnValue({
      stripeSecretKey: "sk_test_123",
      stripeWebhookSecret: "whsec_123",
      mercadoPagoAccessToken: undefined,
      mercadoPagoWebhookSecret: undefined,
      paypalClientId: undefined,
      paypalClientSecret: undefined,
      paypalWebhookId: undefined,
      mockWebhookSecret: undefined,
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "cs_test_123",
          url: "https://checkout.stripe.test/session/cs_test_123",
          expires_at: 1_777_000_000,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    try {
      const provider = resolvePaymentProvider("card");
      await provider.createCheckoutSession({
        orderId: "order-1",
        orderNumber: "ORD-20260320-1234",
        totals: {
          subtotalCents: 1000,
          discountCents: 0,
          shippingCents: 0,
          totalCents: 1000,
          itemCount: 1,
          currency: "USD",
        },
        successUrl: "http://localhost:3000/checkout/success?order=order-1",
        cancelUrl: "http://localhost:3000/checkout/cancel?order=order-1",
        customerEmail: "owner@example.com",
      });

      const [, init] = fetchMock.mock.calls[0] ?? [];
      const body = typeof init?.body === "string" ? init.body : "";
      const params = new URLSearchParams(body);
      expect(params.has("expires_at")).toBe(false);
    } finally {
      fetchMock.mockRestore();
    }
  });
});
