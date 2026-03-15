"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/features/cart/cart-store";
import { readCartFromStorage } from "@/features/cart/storage";

type MergeResponse = {
  cart: {
    items: Array<{
      productId: string;
      variantId: string;
      name: string;
      variantName: string;
      href: string;
      currency: "MXN" | "USD";
      unitPriceCents: number;
      stockOnHand: number;
      quantity: number;
      unavailableReason?: string;
    }>;
  };
  summary: {
    mergedLines: string[];
    adjustedLines: Array<{
      variantId: string;
      previousQuantity: number;
      nextQuantity: number;
    }>;
    unavailableLines: Array<{
      variantId: string;
      reason: string;
    }>;
    messages: string[];
  };
};

export function CartSyncClient() {
  const router = useRouter();
  const hydrateCart = useCartStore((state) => state.hydrateCart);
  const applyMergeSummary = useCartStore((state) => state.applyMergeSummary);
  const [error, setError] = useState<string | null>(null);
  const guestCart = useMemo(() => readCartFromStorage(), []);

  useEffect(() => {
    const hasSameLineQuantities = (left: MergeResponse["cart"], right: MergeResponse["cart"]) => {
      const leftByVariant = new Map(left.items.map((item) => [item.variantId, item.quantity]));
      const rightByVariant = new Map(right.items.map((item) => [item.variantId, item.quantity]));
      if (leftByVariant.size !== rightByVariant.size) {
        return false;
      }
      for (const [variantId, quantity] of leftByVariant.entries()) {
        if (rightByVariant.get(variantId) !== quantity) {
          return false;
        }
      }
      return true;
    };

    const run = async () => {
      try {
        const serverCartResponse = await fetch("/api/cart", { method: "GET" });
        if (!serverCartResponse.ok) {
          setError("Could not sync cart. You can continue and review your cart manually.");
          return;
        }

        const serverPayload = (await serverCartResponse.json()) as { cart: MergeResponse["cart"] };
        if (guestCart.items.length === 0 || hasSameLineQuantities(guestCart, serverPayload.cart)) {
          hydrateCart(serverPayload.cart);
          router.replace("/cart");
          return;
        }

        const response = await fetch("/api/cart/merge", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(guestCart),
        });

        if (!response.ok) {
          hydrateCart(serverPayload.cart);
          setError("Could not sync cart. You can continue and review your cart manually.");
          return;
        }

        const payload = (await response.json()) as MergeResponse;
        hydrateCart(payload.cart);
        applyMergeSummary(payload.summary);
        router.replace("/cart");
      } catch {
        setError("Could not sync cart. You can continue and review your cart manually.");
      }
    };

    run();
  }, [applyMergeSummary, guestCart, hydrateCart, router]);

  if (error) {
    return (
      <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => {
            router.replace("/cart");
          }}
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          Continue to cart
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-2 rounded-lg border bg-card p-6 text-card-foreground">
      <p className="text-sm font-medium">Syncing your guest cart...</p>
      <p className="text-xs text-muted-foreground">Please wait while we merge your items.</p>
    </section>
  );
}
