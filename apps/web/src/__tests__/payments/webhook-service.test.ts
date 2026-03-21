import { beforeEach, describe, expect, it, vi } from "vitest";
import { paymentAttemptsTable, paymentWebhookEventsTable } from "@/server/db/schema";

const { getDbMock, getOrderByIdMock, getOrderByPaymentSessionIdMock, updateOrderPaymentStateMock } = vi.hoisted(
  () => ({
    getDbMock: vi.fn(),
    getOrderByIdMock: vi.fn(),
    getOrderByPaymentSessionIdMock: vi.fn(),
    updateOrderPaymentStateMock: vi.fn(),
  }),
);

const { decrementInventoryForPaidOrderMock } = vi.hoisted(() => ({
  decrementInventoryForPaidOrderMock: vi.fn(async () => ({ decrementedCount: 1 })),
}));

vi.mock("@/server/db/client", () => ({
  getDb: getDbMock,
}));

vi.mock("@/server/orders/service", () => ({
  getOrderById: getOrderByIdMock,
  getOrderByPaymentSessionId: getOrderByPaymentSessionIdMock,
  updateOrderPaymentState: updateOrderPaymentStateMock,
}));

vi.mock("@/server/inventory/service", () => ({
  decrementInventoryForPaidOrder: decrementInventoryForPaidOrderMock,
}));

import { processPaymentWebhookEvent } from "@/server/payments/webhook-service";

function createDbStub(inserted: boolean) {
  return {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({
          returning: vi.fn(async () => (inserted ? [{ id: "webhook-row-1" }] : [])),
        })),
      })),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => {
          if (table === paymentAttemptsTable || table === paymentWebhookEventsTable) {
            return undefined;
          }
          return undefined;
        }),
      })),
    })),
  };
}

describe("payments webhook service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOrderByIdMock.mockResolvedValue(null);
    getOrderByPaymentSessionIdMock.mockResolvedValue(null);
    updateOrderPaymentStateMock.mockResolvedValue(undefined);
  });

  it("returns duplicate when provider/event was already processed", async () => {
    getDbMock.mockReturnValue(createDbStub(false));

    const result = await processPaymentWebhookEvent({
      providerId: "mock-card",
      eventId: "evt_1",
      eventType: "mock.checkout.succeeded",
      occurredAt: new Date(),
      orderId: "order-1",
      providerSessionId: "session-1",
      outcome: "succeeded",
      payload: "{}",
    });

    expect(result).toEqual({
      kind: "duplicate",
      eventId: "evt_1",
    });
    expect(updateOrderPaymentStateMock).not.toHaveBeenCalled();
    expect(decrementInventoryForPaidOrderMock).not.toHaveBeenCalled();
  });

  it("updates order state and decrements inventory on first success", async () => {
    getDbMock.mockReturnValue(createDbStub(true));
    getOrderByIdMock.mockResolvedValueOnce({
      id: "order-1",
      status: "pending_payment",
      paymentStatus: "pending",
    });

    const result = await processPaymentWebhookEvent({
      providerId: "mock-card",
      eventId: "evt_2",
      eventType: "mock.checkout.succeeded",
      occurredAt: new Date(),
      orderId: "order-1",
      providerSessionId: "session-1",
      paymentReference: "payment-ref",
      outcome: "succeeded",
      payload: "{}",
    });

    expect(result).toEqual({
      kind: "processed",
      eventId: "evt_2",
      orderId: "order-1",
      outcome: "succeeded",
    });
    expect(decrementInventoryForPaidOrderMock).toHaveBeenCalledWith("order-1");
    expect(updateOrderPaymentStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        status: "paid",
        paymentStatus: "succeeded",
      }),
    );
  });

  it("does not decrement inventory again for an already paid order", async () => {
    getDbMock.mockReturnValue(createDbStub(true));
    getOrderByIdMock.mockResolvedValueOnce({
      id: "order-1",
      status: "paid",
      paymentStatus: "succeeded",
    });

    await processPaymentWebhookEvent({
      providerId: "mock-card",
      eventId: "evt_3",
      eventType: "mock.checkout.succeeded",
      occurredAt: new Date(),
      orderId: "order-1",
      providerSessionId: "session-1",
      outcome: "succeeded",
      payload: "{}",
    });

    expect(decrementInventoryForPaidOrderMock).not.toHaveBeenCalled();
    expect(updateOrderPaymentStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        status: "paid",
        paymentStatus: "succeeded",
      }),
    );
  });

  it("updates order state without inventory restoration on failure", async () => {
    getDbMock.mockReturnValue(createDbStub(true));
    getOrderByIdMock.mockResolvedValueOnce({
      id: "order-1",
      status: "pending_payment",
      paymentStatus: "pending",
    });

    await processPaymentWebhookEvent({
      providerId: "mock-card",
      eventId: "evt_4",
      eventType: "mock.checkout.failed",
      occurredAt: new Date(),
      orderId: "order-1",
      providerSessionId: "session-1",
      outcome: "failed",
      payload: "{}",
    });

    expect(decrementInventoryForPaidOrderMock).not.toHaveBeenCalled();
    expect(updateOrderPaymentStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        status: "payment_failed",
        paymentStatus: "failed",
      }),
    );
  });
});
