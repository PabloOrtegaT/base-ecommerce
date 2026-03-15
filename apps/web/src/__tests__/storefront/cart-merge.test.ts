import { describe, expect, it } from "vitest";
import type { CartState } from "@/features/cart/cart";
import { mergeCartStates } from "@/server/cart/merge";

const guestCart: CartState = {
  items: [
    {
      productId: "p1",
      variantId: "v1",
      name: "Product One",
      variantName: "Default",
      href: "/catalog/category/product-one",
      currency: "MXN",
      unitPriceCents: 1000,
      stockOnHand: 5,
      quantity: 2,
    },
  ],
};

describe("cart merge engine", () => {
  it("adds guest lines when server cart is empty", async () => {
    const result = await mergeCartStates({
      guestCart,
      serverCart: { items: [] },
      resolveVariant: () => ({
        status: "available",
        item: {
          productId: "p1",
          variantId: "v1",
          name: "Product One",
          variantName: "Default",
          href: "/catalog/category/product-one",
          currency: "MXN",
          unitPriceCents: 1000,
          stockOnHand: 10,
        },
        stockOnHand: 10,
      }),
    });

    expect(result.cart.items[0]?.quantity).toBe(2);
    expect(result.summary.mergedLines).toHaveLength(0);
  });

  it("clamps quantity when stock is lower than merged demand", async () => {
    const result = await mergeCartStates({
      guestCart,
      serverCart: {
        items: [
          {
            ...guestCart.items[0]!,
            quantity: 4,
          },
        ],
      },
      resolveVariant: () => ({
        status: "available",
        item: {
          productId: "p1",
          variantId: "v1",
          name: "Product One",
          variantName: "Default",
          href: "/catalog/category/product-one",
          currency: "MXN",
          unitPriceCents: 1000,
          stockOnHand: 3,
        },
        stockOnHand: 3,
      }),
    });

    expect(result.cart.items[0]?.quantity).toBe(3);
    expect(result.summary.adjustedLines).toHaveLength(1);
    expect(result.summary.mergedLines).toEqual(["v1"]);
  });

  it("keeps unavailable lines with warning reason", async () => {
    const result = await mergeCartStates({
      guestCart,
      serverCart: { items: [] },
      resolveVariant: () => ({
        status: "unavailable",
        reason: "Variant retired",
      }),
    });

    expect(result.cart.items[0]?.unavailableReason).toBe("Variant retired");
    expect(result.summary.unavailableLines).toHaveLength(1);
  });
});

