import { describe, expect, it, vi } from "vitest";
import { getActiveStoreProfile } from "@/server/config/store-profile";
import { getProfileRuntimeStore } from "@/server/data/runtime-store";
import { reconcileCartState } from "@/server/cart/service";

vi.mock("@/server/inventory/service", () => ({
  getCanonicalVariantAvailability: vi.fn(async (variantId: string) => {
    const profile = getActiveStoreProfile();
    const store = getProfileRuntimeStore(profile);
    const variant = store.variants.find((entry) => entry.id === variantId);
    if (!variant) {
      return {
        variantId,
        stockOnHand: 0,
        availableToSell: 0,
        reservedQty: 0,
        isPurchasable: false,
        reason: "Variant not found.",
      };
    }
    return {
      variantId,
      stockOnHand: variant.stockOnHand,
      availableToSell: variant.stockOnHand,
      reservedQty: 0,
      isPurchasable: variant.stockOnHand > 0,
      ...(variant.stockOnHand > 0 ? {} : { reason: "Variant is out of stock." }),
    };
  }),
}));

describe("server cart reconciliation", () => {
  it("clamps quantity to stock and keeps unavailable lines", async () => {
    const profile = getActiveStoreProfile();
    const store = getProfileRuntimeStore(profile);
    const availableVariant = store.variants[0];

    expect(availableVariant).toBeDefined();
    if (!availableVariant) {
      return;
    }

    const product = store.products.find((entry) => entry.id === availableVariant.productId);
    const category = product ? store.categories.find((entry) => entry.id === product.categoryId) : null;
    expect(product).toBeDefined();
    expect(category).toBeDefined();
    if (!product || !category) {
      return;
    }

    product.status = "active";
    availableVariant.stockOnHand = Math.max(2, availableVariant.stockOnHand);

    const result = await reconcileCartState({
      items: [
        {
          productId: product.id,
          variantId: availableVariant.id,
          name: product.name,
          variantName: availableVariant.name,
          href: `/catalog/${category.slug}/${product.slug}`,
          currency: product.currency,
          unitPriceCents: availableVariant.priceCents,
          stockOnHand: availableVariant.stockOnHand,
          quantity: availableVariant.stockOnHand + 3,
        },
        {
          productId: "missing-product",
          variantId: "missing-variant",
          name: "Missing",
          variantName: "Missing",
          href: "/catalog/missing/missing",
          currency: "MXN",
          unitPriceCents: 1000,
          stockOnHand: 0,
          quantity: 2,
        },
      ],
    });

    const adjustedLine = result.summary.adjustedLines.find((entry) => entry.variantId === availableVariant.id);
    const unavailableLine = result.summary.unavailableLines.find((entry) => entry.variantId === "missing-variant");
    const clampedItem = result.cart.items.find((entry) => entry.variantId === availableVariant.id);
    const missingItem = result.cart.items.find((entry) => entry.variantId === "missing-variant");

    expect(adjustedLine).toBeDefined();
    expect(unavailableLine).toBeDefined();
    expect(clampedItem?.quantity).toBe(availableVariant.stockOnHand);
    expect(missingItem?.unavailableReason).toBe("Variant not found.");
    expect(result.summary.messages.length).toBeGreaterThan(0);
  });
});
