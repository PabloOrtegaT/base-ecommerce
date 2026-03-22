"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingCart, ArrowRight, Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
    () => variants.find((v) => v.id === selectedVariantId) ?? variants[0] ?? null,
    [selectedVariantId, variants],
  );

  useEffect(() => {
    if (!selectedVariant) return;
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
            if (!response.ok) return null;
            return (await response.json()) as VariantAvailability;
          },
        );
        if (!active) return;
        setAvailability(payload);
      } catch {
        if (active) setAvailability(null);
      } finally {
        if (active) setIsCheckingAvailability(false);
      }
    };
    void run();
    return () => { active = false; };
  }, [selectedVariant]);

  useEffect(() => {
    if (!selectedVariant) return;
    const resolvedStock =
      availability && availability.variantId === selectedVariant.id
        ? availability.stockOnHand
        : selectedVariant.stockOnHand;
    setQuantity((current) => Math.max(1, Math.min(current, Math.max(1, resolvedStock))));
  }, [availability, selectedVariant]);

  if (!selectedVariant) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">No variants configured yet.</p>
        </CardContent>
      </Card>
    );
  }

  const price = getPriceDisplay(selectedVariant.priceCents, selectedVariant.compareAtPriceCents);
  const resolvedAvailability =
    availability && availability.variantId === selectedVariant.id
      ? availability
      : { variantId: selectedVariant.id, stockOnHand: selectedVariant.stockOnHand, isPurchasable: selectedVariant.stockOnHand > 0 };
  const resolvedStock = resolvedAvailability.stockOnHand;
  const isOutOfStock = !resolvedAvailability.isPurchasable || resolvedStock <= 0;
  const canAddToCart = !isOutOfStock && !isCheckingAvailability && quantity <= resolvedStock;

  const onAddToCart = () => {
    if (!canAddToCart) {
      const message = resolvedAvailability.reason ?? "This item is no longer available.";
      setFeedback(message);
      showClientToast({ type: "error", code: "out_of_stock", message });
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
    setFeedback(`Added! You now have ${totals.itemCount} item(s) in your cart.`);
  };

  return (
    <Card className="sticky top-20">
      <CardContent className="p-5 space-y-5">
        {/* Price */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              {formatCurrencyFromCents(price.currentCents, currency)}
            </span>
            {price.hasDiscount && (
              <>
                <span className="text-muted-foreground line-through text-sm">
                  {formatCurrencyFromCents(price.compareAtCents ?? 0, currency)}
                </span>
                <Badge variant="default">-{price.discountPercent}%</Badge>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isCheckingAvailability ? (
              <Badge variant="secondary">Checking stock...</Badge>
            ) : isOutOfStock ? (
              <Badge variant="destructive">Out of stock</Badge>
            ) : (
              <Badge variant="success" data-testid="stock-status">
                {resolvedStock} in stock
              </Badge>
            )}
            {resolvedAvailability.reason && (
              <span className="text-xs text-muted-foreground">{resolvedAvailability.reason}</span>
            )}
          </div>
        </div>

        <Separator />

        {/* Variant selection */}
        {variants.length > 1 && (
          <div className="space-y-1.5">
            <Label htmlFor="variant-select">Variant</Label>
            <select
              id="variant-select"
              value={selectedVariant.id}
              onChange={(event) => {
                setSelectedVariantId(event.target.value);
                setQuantity(1);
                setFeedback(null);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Select variant"
            >
              {variants.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Quantity */}
        <div className="space-y-1.5">
          <Label>Quantity</Label>
          <div className="flex items-center gap-1 w-fit rounded-lg border bg-background">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || isOutOfStock}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-10 text-center text-sm font-medium tabular-nums">{quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setQuantity((q) => Math.min(q + 1, Math.max(1, resolvedStock)))}
              disabled={quantity >= resolvedStock || isOutOfStock}
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <input
            id="qty"
            type="hidden"
            value={quantity}
            data-testid="add-to-cart"
          />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            className="w-full"
            size="lg"
            onClick={onAddToCart}
            disabled={!canAddToCart}
            aria-disabled={!canAddToCart}
            data-testid="add-to-cart"
          >
            <ShoppingCart className="h-4 w-4" />
            {isOutOfStock ? "Out of stock" : "Add to cart"}
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/cart">
              View cart <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {feedback && (
          <p className="text-sm text-muted-foreground text-center">{feedback}</p>
        )}
      </CardContent>
    </Card>
  );
}
