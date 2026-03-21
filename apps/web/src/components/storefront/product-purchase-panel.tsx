"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@base-ecommerce/ui";
import { showClientToast } from "@/components/feedback/client-toast";
import { calculateCartTotals } from "@/features/cart/cart";
import { useCartStore } from "@/features/cart/cart-store";
import { formatCurrencyFromCents, getPriceDisplay } from "@/features/catalog/pricing";
import { runSingleFlight } from "@/lib/single-flight";

type VariantItem = {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
  compareAtPriceCents?: number | undefined;
  stockOnHand: number;
};

type ProductPurchasePanelProps = {
  productId: string;
  productName: string;
  categorySlug: string;
  productSlug: string;
  currency: "MXN" | "USD";
  variants: VariantItem[];
};

type VariantAvailability = {
  variantId: string;
  stockOnHand: number;
  isPurchasable: boolean;
  reason?: string;
};

export function ProductPurchasePanel({
  productId,
  productName,
  categorySlug,
  productSlug,
  currency,
  variants,
}: ProductPurchasePanelProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [availability, setAvailability] = useState<VariantAvailability | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? variants[0] ?? null,
    [selectedVariantId, variants],
  );

  useEffect(() => {
    if (!selectedVariant) {
      return;
    }

    let active = true;
    const run = async () => {
      setIsCheckingAvailability(true);
      try {
        const payload = await runSingleFlight<VariantAvailability | null>(
          `catalog-availability:${selectedVariant.id}`,
          async () => {
            const url = new URL("/api/catalog/availability", window.location.origin);
            url.searchParams.set("variantId", selectedVariant.id);
            const response = await fetch(url, { method: "GET", cache: "no-store" });
            if (!response.ok) {
              return null;
            }
            return (await response.json()) as VariantAvailability;
          },
        );

        if (!active) {
          return;
        }
        setAvailability(payload);
      } catch {
        if (active) {
          setAvailability(null);
        }
      } finally {
        if (active) {
          setIsCheckingAvailability(false);
        }
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [selectedVariant]);

  useEffect(() => {
    if (!selectedVariant) {
      return;
    }
    const resolvedStock =
      availability && availability.variantId === selectedVariant.id ? availability.stockOnHand : selectedVariant.stockOnHand;
    setQuantity((current) => Math.max(1, Math.min(current, Math.max(1, resolvedStock))));
  }, [availability, selectedVariant]);

  if (!selectedVariant) {
    return (
      <section className="rounded-lg border bg-card p-5 text-card-foreground">
        <p className="text-sm text-muted-foreground">This product has no variants configured yet.</p>
      </section>
    );
  }

  const price = getPriceDisplay(selectedVariant.priceCents, selectedVariant.compareAtPriceCents);
  const resolvedAvailability =
    availability && availability.variantId === selectedVariant.id
      ? availability
      : {
          variantId: selectedVariant.id,
          stockOnHand: selectedVariant.stockOnHand,
          isPurchasable: selectedVariant.stockOnHand > 0,
        };
  const resolvedStock = resolvedAvailability.stockOnHand;
  const isOutOfStock = !resolvedAvailability.isPurchasable || resolvedStock <= 0;
  const canAddToCart = !isOutOfStock && !isCheckingAvailability && quantity <= resolvedStock;

  const onAddToCart = () => {
    if (!canAddToCart) {
      const message = resolvedAvailability.reason ?? "This item is no longer available in stock.";
      setFeedback(message);
      showClientToast({
        type: "error",
        code: "out_of_stock",
        message,
      });
      return;
    }
    addItem(
      {
        productId,
        variantId: selectedVariant.id,
        name: productName,
        variantName: selectedVariant.name,
        href: `/catalog/${categorySlug}/${productSlug}`,
        currency,
        unitPriceCents: selectedVariant.priceCents,
        stockOnHand: resolvedStock,
      },
      quantity,
    );
    const totals = calculateCartTotals(useCartStore.getState().cart);
    setFeedback(`Added to cart. You now have ${totals.itemCount} item(s).`);
  };

  return (
    <section className="space-y-4 rounded-lg border bg-card p-5 text-card-foreground">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Choose variant</p>
        <select
          value={selectedVariant.id}
          onChange={(event) => {
            setSelectedVariantId(event.target.value);
            setQuantity(1);
            setFeedback(null);
          }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          aria-label="Variant"
        >
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Price</p>
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold">
            {formatCurrencyFromCents(price.currentCents, currency)}
          </p>
          {price.hasDiscount && (
            <>
              <p className="text-sm text-muted-foreground line-through">
                {formatCurrencyFromCents(price.compareAtCents ?? 0, currency)}
              </p>
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                -{price.discountPercent}%
              </span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Stock</p>
        <p data-testid="stock-status" className="text-sm">
          {isOutOfStock ? "Out of stock" : `${resolvedStock} available`}
        </p>
        {resolvedAvailability.reason && <p className="text-xs text-muted-foreground">{resolvedAvailability.reason}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="qty" className="text-sm text-muted-foreground">
          Quantity
        </label>
        <input
          id="qty"
          type="number"
          min={1}
          max={Math.max(1, resolvedStock)}
          value={quantity}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isNaN(parsed)) {
              return;
            }
            const bounded = Math.max(1, Math.min(parsed, Math.max(1, resolvedStock)));
            setQuantity(bounded);
          }}
          className="w-24 rounded-md border bg-background px-3 py-2 text-sm"
          disabled={isOutOfStock || isCheckingAvailability}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          data-testid="add-to-cart"
          onClick={onAddToCart}
          disabled={!canAddToCart}
          aria-disabled={!canAddToCart}
        >
          Add to cart
        </Button>
        <Button asChild variant="outline">
          <Link href="/cart">Go to cart</Link>
        </Button>
      </div>

      {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
    </section>
  );
}
