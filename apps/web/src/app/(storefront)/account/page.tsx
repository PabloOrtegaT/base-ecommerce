import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";
import { listOrdersForUser } from "@/server/orders/service";
import { createPageMetadata } from "@/server/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Account",
  description: "Account details and session controls.",
  pathname: "/account",
  noIndex: true,
});

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/account");
  }
  const orders = await listOrdersForUser(user.id);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <section className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="font-medium">{user.email}</p>
        <p className="mt-2 text-sm text-muted-foreground">Role: {user.role}</p>
      </section>
      <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold">Recent orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {orders.map((entry) => (
              <article key={entry.order.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">{entry.order.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  Status: {entry.order.status} · Payment: {entry.order.paymentStatus}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total: {(entry.order.totalCents / 100).toFixed(2)} {entry.order.currency}
                </p>
                {entry.leadItem && (
                  <p className="text-xs text-muted-foreground">
                    Lead item: {entry.leadItem.name} ({entry.leadItem.variantName})
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <Link href="/logout" className="text-sm text-muted-foreground hover:underline">
        Sign out
      </Link>
    </main>
  );
}
