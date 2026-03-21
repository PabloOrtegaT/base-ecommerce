import type { Metadata } from "next";
import Link from "next/link";
import { createPageMetadata } from "@/server/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Checkout Success",
  description: "Payment completed successfully.",
  pathname: "/checkout/success",
  noIndex: true,
});

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{
    order?: string;
  }>;
};

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const orderId = params?.order;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Payment completed</h1>
      <p className="text-sm text-muted-foreground">
        Your order has been recorded and is now visible in your account.
      </p>
      {orderId && <p className="text-sm text-muted-foreground">Order reference: {orderId}</p>}
      <div className="flex flex-wrap gap-3">
        <Link href="/account" className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
          View account orders
        </Link>
        <Link href="/catalog" className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
