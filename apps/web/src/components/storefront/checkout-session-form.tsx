"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@base-ecommerce/ui";
import { showClientToast } from "@/components/feedback/client-toast";
import { runSingleFlight } from "@/lib/single-flight";

type CheckoutProviderOption = {
  method: "card" | "mercadopago" | "paypal";
  label: string;
  activeProvider: string;
  mode: "live" | "mock";
};

type CheckoutSessionFormProps = {
  authenticated: boolean;
  canCheckout: boolean;
};

const fallbackOptions: CheckoutProviderOption[] = [
  {
    method: "card",
    label: "Card (Primary)",
    activeProvider: "mock-card",
    mode: "mock",
  },
  {
    method: "mercadopago",
    label: "Mercado Pago (Other payment forms)",
    activeProvider: "mock-mercadopago",
    mode: "mock",
  },
  {
    method: "paypal",
    label: "PayPal (Other payment forms)",
    activeProvider: "mock-paypal",
    mode: "mock",
  },
];

export function CheckoutSessionForm({ authenticated, canCheckout }: CheckoutSessionFormProps) {
  const [provider, setProvider] = useState<CheckoutProviderOption["method"]>("card");
  const [couponCode, setCouponCode] = useState("");
  const [providers, setProviders] = useState<CheckoutProviderOption[]>(fallbackOptions);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const payload = await runSingleFlight<{ providers: CheckoutProviderOption[] } | null>(
          "checkout-provider-options",
          async () => {
            const response = await fetch("/api/checkout/session", {
              method: "GET",
              cache: "no-store",
            });
            if (!response.ok) {
              return null;
            }
            return (await response.json()) as { providers: CheckoutProviderOption[] };
          },
        );
        if (!active || !payload) {
          return;
        }
        if (Array.isArray(payload.providers) && payload.providers.length > 0) {
          setProviders(payload.providers);
        }
      } catch {
        // Keep fallback provider options.
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, []);

  const selectedProvider = useMemo(
    () => providers.find((entry) => entry.method === provider) ?? providers[0],
    [provider, providers],
  );

  const submitDisabled = !authenticated || !canCheckout || submitting;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitDisabled) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          couponCode: couponCode.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | {
              error?: string;
              code?: string;
              lines?: Array<{
                variantId: string;
                requestedQty: number;
                availableQty: number;
                reason: string;
              }>;
            }
          | null;
        if (response.status === 409 && payload?.code === "insufficient_stock") {
          const lineCount = payload.lines?.length ?? 0;
          const message =
            lineCount > 0
              ? `Stock changed for ${lineCount} item(s). Please review your cart and try again.`
              : "Stock changed. Please review your cart and try again.";
          setError(message);
          showClientToast({
            type: "error",
            code: "insufficient_stock",
            message,
          });
          return;
        }
        setError(payload?.error ?? "Could not create checkout session.");
        return;
      }

      const payload = (await response.json()) as {
        checkoutUrl: string;
      };
      window.location.assign(payload.checkoutUrl);
    } catch {
      setError("Could not create checkout session.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
      <h2 className="text-lg font-semibold">Checkout</h2>
      {!authenticated && (
        <p className="text-sm text-muted-foreground">
          Sign in to continue checkout.
          {" "}
          <Link href="/login?next=/cart" className="underline">
            Go to login
          </Link>
        </p>
      )}
      <form className="space-y-3" onSubmit={onSubmit}>
        <div className="space-y-1">
          <label htmlFor="payment-provider" className="text-sm text-muted-foreground">
            Payment method
          </label>
          <select
            id="payment-provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value as CheckoutProviderOption["method"])}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            disabled={submitting}
          >
            {providers.map((entry) => (
              <option key={entry.method} value={entry.method}>
                {entry.label}
              </option>
            ))}
          </select>
          {selectedProvider && (
            <p className="text-xs text-muted-foreground">
              Active provider: {selectedProvider.activeProvider} ({selectedProvider.mode} mode)
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="coupon-code" className="text-sm text-muted-foreground">
            Coupon code (optional)
          </label>
          <input
            id="coupon-code"
            value={couponCode}
            onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
            placeholder="SAVE10"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            maxLength={32}
            disabled={submitting}
          />
        </div>

        <Button type="submit" disabled={submitDisabled}>
          {submitting ? "Creating checkout..." : "Continue to payment"}
        </Button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
