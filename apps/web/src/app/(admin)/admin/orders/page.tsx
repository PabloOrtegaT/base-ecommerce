import { AccessDenied } from "@/components/admin/access-denied";
import { OrdersTable } from "@/components/admin/tables";
import { listAdminOrdersReadModel } from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";

export default async function AdminOrdersPage() {
  const access = await getRouteAccess("orders");
  if (!access.allowed) {
    return <AccessDenied role={access.role ?? "unknown"} section="orders" />;
  }

  const orders = await listAdminOrdersReadModel();
  const totalOrders = orders.length;
  const paidOrders = orders.filter((order) => order.status === "paid").length;
  const pendingOrders = orders.filter(
    (order) => order.status === "pending" || order.status === "pending_payment",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">Manage and fulfill customer orders</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Total Orders
          </p>
          <p className="text-3xl font-black text-foreground mb-1">{totalOrders}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Paid
          </p>
          <p className="text-3xl font-black text-emerald-600 mb-1">{paidOrders}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Pending
          </p>
          <p className="text-3xl font-black text-amber-600 mb-1">{pendingOrders}</p>
        </div>
      </div>

      <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold">All orders</h2>
        <OrdersTable rows={orders} />
      </section>
    </div>
  );
}
