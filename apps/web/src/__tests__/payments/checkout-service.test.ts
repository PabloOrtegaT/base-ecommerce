import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getUserCartSnapshotMock,
  getHostRuntimeConfigMock,
  getActiveStoreProfileMock,
  getProfileRuntimeStoreMock,
  resolvePaymentProviderMock,
  createPendingCheckoutOrderMock,
  attachCheckoutPaymentSessionMock,
  appendOrderStatusTimelineMock,
  updateOrderPaymentStateMock,
  validateInventoryForOrderMock,
} = vi.hoisted(() => ({
  getUserCartSnapshotMock: vi.fn(),
  getHostRuntimeConfigMock: vi.fn(() => ({
    appBaseUrl: "http://storefront.lvh.me:3000",
    adminBaseUrl: "http://admin.lvh.me:3000",
    adminRequireCfAccess: false,
  })),
  getActiveStoreProfileMock: vi.fn(() => "pc-components"),
  getProfileRuntimeStoreMock: vi.fn(),
  resolvePaymentProviderMock: vi.fn(),
  createPendingCheckoutOrderMock: vi.fn(),
  attachCheckoutPaymentSessionMock: vi.fn(),
  appendOrderStatusTimelineMock: vi.fn(),
  updateOrderPaymentStateMock: vi.fn(async () => undefined),
  validateInventoryForOrderMock: vi.fn<
    () => Promise<
      | { ok: true }
      | {
          ok: false;
          code: "insufficient_stock";
          lines: Array<{
            variantId: string;
            requestedQty: number;
            availableQty: number;
            reason: string;
          }>;
        }
    >
  >(async () => ({ ok: true })),
}));

vi.mock("@/server/cart/service", () => ({
  getUserCartSnapshot: getUserCartSnapshotMock,
}));

vi.mock("@/server/config/runtime-env", () => ({
  getHostRuntimeConfig: getHostRuntimeConfigMock,
}));

vi.mock("@/server/config/store-profile", () => ({
  getActiveStoreProfile: getActiveStoreProfileMock,
}));

vi.mock("@/server/data/runtime-store", () => ({
  getProfileRuntimeStore: getProfileRuntimeStoreMock,
}));

vi.mock("@/server/payments/provider", () => ({
  resolvePaymentProvider: resolvePaymentProviderMock,
}));

vi.mock("@/server/orders/service", () => ({
  createPendingCheckoutOrder: createPendingCheckoutOrderMock,
  attachCheckoutPaymentSession: attachCheckoutPaymentSessionMock,
  appendOrderStatusTimeline: appendOrderStatusTimelineMock,
  updateOrderPaymentState: updateOrderPaymentStateMock,
}));

vi.mock("@/server/inventory/service", () => ({
  validateInventoryForOrder: validateInventoryForOrderMock,
}));

import { CheckoutStockConflictError, createCheckoutSessionForUser, parseCheckoutRequest } from "@/server/payments/checkout-service";

describe("payments checkout service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserCartSnapshotMock.mockResolvedValue({
      cart: {
        items: [
          {
            productId: "prod-1",
            variantId: "var-1",
            name: "GPU",
            variantName: "Default",
            href: "/catalog/pc-components/gpu",
            currency: "USD",
            unitPriceCents: 1000,
            stockOnHand: 3,
            quantity: 2,
          },
        ],
      },
      version: 1,
    });
    getProfileRuntimeStoreMock.mockReturnValue({
      coupons: [
        {
          id: "coupon-1",
          code: "SAVE10",
          type: "percentage",
          target: "subtotal",
          percentageOff: 10,
          startsAt: "2026-03-01T00:00:00.000Z",
          endsAt: "2026-12-31T00:00:00.000Z",
          usageCount: 0,
          isActive: true,
        },
      ],
    });
    createPendingCheckoutOrderMock.mockResolvedValue({
      id: "order-1",
      orderNumber: "ORD-20260318-ABCD",
    });
    resolvePaymentProviderMock.mockReturnValue({
      id: "mock-card",
      displayName: "Mock Card Checkout",
      createCheckoutSession: vi.fn(async () => ({
        providerId: "mock-card",
        sessionId: "session-1",
        checkoutUrl: "http://storefront.lvh.me:3000/checkout/mock?session=session-1",
      })),
    });
  });

  it("parses checkout payload with default provider", () => {
    const parsed = parseCheckoutRequest({});
    expect(parsed.provider).toBe("card");
  });

  it("creates checkout session and applies coupon totals", async () => {
    const result = await createCheckoutSessionForUser({
      userId: "user-1",
      customerEmail: "user@example.com",
      provider: "card",
      couponCode: "save10",
    });

    expect(validateInventoryForOrderMock).toHaveBeenCalledWith({
      lines: [{ variantId: "var-1", quantity: 2 }],
    });
    expect(createPendingCheckoutOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        totals: expect.objectContaining({
          subtotalCents: 2000,
          discountCents: 200,
          totalCents: 1800,
          itemCount: 2,
        }),
        couponCode: "SAVE10",
      }),
    );
    expect(attachCheckoutPaymentSessionMock).toHaveBeenCalled();
    expect(appendOrderStatusTimelineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        status: "pending_payment",
        note: "Checkout session created with mock-card.",
      }),
    );
    expect(result.checkoutUrl).toContain("/checkout/mock");
    expect(result).not.toHaveProperty("hold");
  });

  it("throws when cart has no purchasable items", async () => {
    getUserCartSnapshotMock.mockResolvedValueOnce({
      cart: {
        items: [],
      },
      version: 1,
    });

    await expect(
      createCheckoutSessionForUser({
        userId: "user-1",
        customerEmail: "user@example.com",
        provider: "card",
      }),
    ).rejects.toThrow("Cart is empty.");
  });

  it("throws stock conflict when current inventory validation fails", async () => {
    validateInventoryForOrderMock.mockResolvedValueOnce({
      ok: false as const,
      code: "insufficient_stock",
      lines: [
        {
          variantId: "var-1",
          requestedQty: 2,
          availableQty: 1,
          reason: "Variant is out of stock.",
        },
      ],
    });

    await expect(
      createCheckoutSessionForUser({
        userId: "user-1",
        customerEmail: "user@example.com",
        provider: "card",
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<CheckoutStockConflictError>>({
        code: "insufficient_stock",
        lines: [
          {
            variantId: "var-1",
            requestedQty: 2,
            availableQty: 1,
            reason: "Variant is out of stock.",
          },
        ],
      }),
    );
    expect(createPendingCheckoutOrderMock).not.toHaveBeenCalled();
  });

  it("marks the order as failed when provider session creation fails", async () => {
    resolvePaymentProviderMock.mockReturnValueOnce({
      id: "mock-card",
      displayName: "Mock Card Checkout",
      createCheckoutSession: vi.fn(async () => {
        throw new Error("provider failed");
      }),
    });

    await expect(
      createCheckoutSessionForUser({
        userId: "user-1",
        customerEmail: "user@example.com",
        provider: "card",
      }),
    ).rejects.toThrow("provider failed");

    expect(updateOrderPaymentStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: expect.any(String),
        status: "payment_failed",
        paymentStatus: "failed",
        note: "Checkout provider session failed.",
      }),
    );
  });
});
