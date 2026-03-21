"use client";

import { useState } from "react";
import { Button } from "@base-ecommerce/ui";

type MockCheckoutClientProps = {
  orderId: string;
  provider: "card" | "mercadopago" | "paypal";
  providerSessionId: string;
};

function resolveMockProviderId(provider: MockCheckoutClientProps["provider"]) {
  if (provider === "mercadopago") {
    return "mock-mercadopago";
  }
  if (provider === "paypal") {
    return "mock-paypal";
  }
  return "mock-card";
}

export function MockCheckoutClient({ orderId, provider, providerSessionId }: MockCheckoutClientProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runOutcome = async (outcome: "succeeded" | "failed" | "cancelled") => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/mock/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          providerSessionId,
          providerId: resolveMockProviderId(provider),
          outcome,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Could not complete mock payment.");
        return;
      }

      const nextPath = outcome === "succeeded" ? "/checkout/success" : "/checkout/cancel";
      const url = new URL(nextPath, window.location.origin);
      url.searchParams.set("order", orderId);
      window.location.assign(url.toString());
    } catch {
      setError("Could not complete mock payment.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
      <p className="text-sm text-muted-foreground">
        Mock checkout session: <span className="font-mono">{providerSessionId}</span>
      </p>
      <p className="text-sm text-muted-foreground">
        Provider mode is mock. Use these controls to simulate provider webhook outcomes.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => runOutcome("succeeded")}>
          Simulate payment success
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => runOutcome("failed")}>
          Simulate payment failure
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => runOutcome("cancelled")}>
          Simulate cancellation
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
