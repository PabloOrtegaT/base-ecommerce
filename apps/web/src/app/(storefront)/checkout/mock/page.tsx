import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MockCheckoutClient } from "@/components/storefront/mock-checkout-client";
import { getSessionUser } from "@/server/auth/session";
import { createPageMetadata } from "@/server/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Mock Checkout",
  description: "Mock payment checkout surface for local and fallback provider testing.",
  pathname: "/checkout/mock",
  noIndex: true,
});

type MockCheckoutPageProps = {
  searchParams?: Promise<{
    order?: string;
    session?: string;
    provider?: "card" | "mercadopago" | "paypal";
  }>;
};

export default async function MockCheckoutPage({ searchParams }: MockCheckoutPageProps) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/checkout/mock");
  }

  const params = searchParams ? await searchParams : undefined;
  const orderId = params?.order;
  const sessionId = params?.session;
  const provider = params?.provider ?? "card";

  if (!orderId || !sessionId) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-4 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Invalid mock checkout URL</h1>
        <p className="text-sm text-muted-foreground">
          Missing order/session parameters. Start checkout again from your cart.
        </p>
        <Link href="/cart" className="text-sm hover:underline">
          Back to cart
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Mock checkout</h1>
      <p className="text-sm text-muted-foreground">
        This page exists for local/fallback checkout when a live provider is not configured.
      </p>
      <MockCheckoutClient
        orderId={orderId}
        provider={provider}
        providerSessionId={sessionId}
      />
    </main>
  );
}
