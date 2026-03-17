import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyCartState } from "@/features/cart/cart";
import { emptyCartMergeSummary } from "@/features/cart/merge-summary";
import { useCartStore } from "@/features/cart/cart-store";

describe("zustand cart store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    useCartStore.setState({
      cart: emptyCartState,
      mergeSummary: emptyCartMergeSummary,
      lastSyncSummary: emptyCartMergeSummary,
      syncStatus: "idle",
      syncError: null,
      pendingVariantIds: [],
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

  it("coalesces rapid cart updates into trailing sync", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cart: {
          items: [
            {
              productId: "p1",
              variantId: "v1",
              name: "Product One",
              variantName: "Default",
              href: "/catalog/category/product-one",
              currency: "MXN",
              unitPriceCents: 2000,
              stockOnHand: 10,
              quantity: 3,
            },
          ],
        },
        summary: emptyCartMergeSummary,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

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

    useCartStore.getState().updateQuantity("v1", 3);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    await vi.waitFor(() => {
      expect(useCartStore.getState().cart.items[0]?.quantity).toBe(3);
      expect(useCartStore.getState().pendingVariantIds).toHaveLength(0);
      expect(useCartStore.getState().syncStatus).toBe("idle");
    });
  });
});
