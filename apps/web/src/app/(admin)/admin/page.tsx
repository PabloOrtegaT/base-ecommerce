import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { AccessDenied } from "@/components/admin/access-denied";
import { DashboardSalesTrendChart } from "@/components/admin/dashboard-sales-chart";
import { listAdminDashboardAnalyticsReadModel, listAdminOrdersReadModel } from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";
import { getAdminContentSnapshot } from "@/server/data/storefront-service";
import { formatCurrencyCents } from "@/features/admin/format";

export default async function AdminPage() {
  const access = await getRouteAccess("dashboard");
  if (!access.allowed) {
    return <AccessDenied role={access.role ?? "unknown"} section="dashboard" />;
  }

  const snapshot = getAdminContentSnapshot();
  const [orders, analytics] = await Promise.all([
    listAdminOrdersReadModel(),
    listAdminDashboardAnalyticsReadModel(),
  ]);

  const totalRevenueCents = analytics.salesTrend.reduce((sum, p) => sum + p.totalCents, 0);
  const paidOrderCount = orders.filter((o) => o.status === "paid").length;
  const recentOrders = orders.slice(0, 4);

  return (
    <main className="space-y-6">

      {/* Page heading */}
      <div>
        <p className="text-sm text-muted-foreground">Admin Dashboard</p>
        <h1 className="text-2xl font-bold tracking-tight">Operations overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Active store profile: <span className="font-semibold text-foreground">{snapshot.profile}</span>
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-3">

        {/* Revenue — highlighted */}
        <div className="rounded-xl p-5 text-white shadow-md bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe]">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-2">Total Revenue</p>
          <p className="text-3xl font-black mb-1">{formatCurrencyCents(totalRevenueCents, "MXN")}</p>
          <div className="flex items-center gap-1 text-xs opacity-85">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>All-time total</span>
          </div>
        </div>

        {/* Total orders */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Total Orders</p>
          <p className="text-3xl font-black text-foreground mb-1">{orders.length}</p>
          <p className="text-xs text-muted-foreground">All statuses</p>
        </div>

        {/* Paid orders */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Paid Orders</p>
          <p className="text-3xl font-black text-foreground mb-1">{paidOrderCount}</p>
          <p className="text-xs text-emerald-600 font-medium">Payment confirmed</p>
        </div>

      </div>

      {/* Sales trend chart + recent orders */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">

        <DashboardSalesTrendChart salesTrend={analytics.salesTrend} currency="MXN" />

        {/* Recent orders compact table */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold mb-4">Recent Orders</h2>
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-0">
            <div className="contents text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b">
              <span className="pb-2 border-b">Order</span>
              <span className="pb-2 border-b">Product</span>
              <span className="pb-2 border-b">Total</span>
              <span className="pb-2 border-b">Status</span>
            </div>
            {recentOrders.map((order) => (
              <div key={order.id} className="contents text-xs">
                <span className="py-2.5 border-b last:border-0 font-semibold text-primary">{order.orderNumber}</span>
                <span className="py-2.5 border-b last:border-0 text-muted-foreground truncate">{order.productLabel}</span>
                <span className="py-2.5 border-b last:border-0 font-semibold whitespace-nowrap">
                  {formatCurrencyCents(order.totalCents, order.currency)}
                </span>
                <span className="py-2.5 border-b last:border-0">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    order.status === "paid"
                      ? "bg-emerald-100 text-emerald-700"
                      : order.status === "cancelled"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {order.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Store snapshot + quick links */}
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold mb-4">Store snapshot</h2>
        <div className="grid gap-3 md:grid-cols-3 mb-5">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Active banners</p>
            <p className="text-2xl font-bold">{snapshot.banners}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">News posts</p>
            <p className="text-2xl font-bold">{snapshot.newsPosts}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Featured sales</p>
            <p className="text-2xl font-bold">{snapshot.featuredSales}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            { href: "/admin/categories", label: "Manage categories" },
            { href: "/admin/products", label: "Manage products" },
            { href: "/admin/content", label: "Manage content" },
            { href: "/admin/coupons", label: "Manage coupons" },
            { href: "/admin/import", label: "Run CSV import" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

    </main>
  );
}
