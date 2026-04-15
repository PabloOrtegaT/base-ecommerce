import { AccessDenied } from "@/components/admin/access-denied";
import { InventoryTable } from "@/components/admin/tables";
import { listAdminVariants } from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";

export default async function AdminInventoryPage() {
  const access = await getRouteAccess("inventory");
  if (!access.allowed) {
    return <AccessDenied role={access.role ?? "unknown"} section="inventory" />;
  }

  const variants = listAdminVariants();
  const lowStock = variants.filter(
    (variant) => variant.stockOnHand > 0 && variant.stockOnHand <= 5,
  );
  const outOfStock = variants.filter((variant) => variant.stockOnHand === 0);
  const totalSkus = variants.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="text-sm text-muted-foreground">Track stock levels and low-stock alerts</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Total SKUs
          </p>
          <p className="text-3xl font-black text-foreground mb-1">{totalSkus}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Low Stock
          </p>
          <p className="text-3xl font-black text-amber-600 mb-1">{lowStock.length}</p>
          <p className="text-xs text-muted-foreground">5 units or fewer</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Out of Stock
          </p>
          <p className="text-3xl font-black text-red-600 mb-1">{outOfStock.length}</p>
        </div>
      </div>

      <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-6 text-card-foreground">
        <h2 className="text-lg font-semibold text-amber-900">Low-stock alerts</h2>
        {lowStock.length > 0 ? (
          <InventoryTable rows={lowStock} />
        ) : (
          <p className="text-sm text-amber-900/80">All products are currently well-stocked.</p>
        )}
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold">All inventory</h2>
        <InventoryTable rows={variants} />
      </section>
    </div>
  );
}
