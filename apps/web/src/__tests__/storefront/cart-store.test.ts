import { beforeEach, describe, expect, it } from "vitest";
import { emptyCartState } from "@/features/cart/cart";
import { emptyCartMergeSummary } from "@/features/cart/merge-summary";
import { useCartStore } from "@/features/cart/cart-store";

describe("zustand cart store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useCartStore.setState({
      cart: emptyCartState,
      mergeSummary: emptyCartMergeSummary,
    });
  });

  it("adds item and persists cart", () => {
    useCartStore.getState().addItem(
      {
        productId: "p1",
        variantId: "v1",
        name: "Product One",
        variantName: "Default",
        href: "/catalog/category/product-one",
        currency: "MXN",
        unitPriceCents: 2000,
        stockOnHand: 10,
      },
      1,
    );

    expect(useCartStore.getState().cart.items[0]?.variantId).toBe("v1");
    expect(window.localStorage.getItem("base-ecommerce-cart")).toContain("\"variantId\":\"v1\"");
  });

  it("applies merge summary and allows clear", () => {
    useCartStore.getState().applyMergeSummary({
      mergedLines: ["v1"],
      adjustedLines: [],
      unavailableLines: [],
      messages: ["Merged 1 item(s)."],
    });
    expect(useCartStore.getState().mergeSummary.messages).toHaveLength(1);

    useCartStore.getState().clearMergeSummary();
    expect(useCartStore.getState().mergeSummary.messages).toHaveLength(0);
  });
});

