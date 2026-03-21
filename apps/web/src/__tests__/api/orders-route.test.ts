import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, listOrdersForUserMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  listOrdersForUserMock: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/server/orders/service", () => ({
  listOrdersForUser: listOrdersForUserMock,
}));

import { GET } from "@/app/api/orders/route";

describe("api/orders route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    getSessionUserMock.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns mapped user orders", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    listOrdersForUserMock.mockResolvedValue([
      {
        order: {
          id: "order-1",
          orderNumber: "ORD-1",
          status: "paid",
          paymentStatus: "succeeded",
          totalCents: 9900,
          currency: "USD",
          itemCount: 2,
          createdAt: new Date("2026-03-18T10:00:00.000Z"),
        },
        leadItem: {
          name: "GPU",
        },
      },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      orders: [
        {
          id: "order-1",
          orderNumber: "ORD-1",
          status: "paid",
          paymentStatus: "succeeded",
          totalCents: 9900,
          currency: "USD",
          itemCount: 2,
          createdAt: "2026-03-18T10:00:00.000Z",
          leadItemName: "GPU",
        },
      ],
    });
  });

  it("maps missing lead item to null", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    listOrdersForUserMock.mockResolvedValue([
      {
        order: {
          id: "order-2",
          orderNumber: "ORD-2",
          status: "pending_payment",
          paymentStatus: "pending",
          totalCents: 1500,
          currency: "USD",
          itemCount: 1,
          createdAt: new Date("2026-03-18T11:00:00.000Z"),
        },
        leadItem: null,
      },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      orders: [
        {
          id: "order-2",
          orderNumber: "ORD-2",
          status: "pending_payment",
          paymentStatus: "pending",
          totalCents: 1500,
          currency: "USD",
          itemCount: 1,
          createdAt: "2026-03-18T11:00:00.000Z",
          leadItemName: null,
        },
      ],
    });
  });
});
