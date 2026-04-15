import { AccessDenied } from "@/components/admin/access-denied";
import { CsvImportForm } from "@/components/admin/csv-import-form";
import { listAdminCategories } from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";

export default async function AdminImportPage() {
  const access = await getRouteAccess("import");
  if (!access.allowed) {
    return <AccessDenied role={access.role ?? "unknown"} section="CSV import" />;
  }

  const categories = listAdminCategories();
  const defaultCategorySlug = categories[0]?.slug ?? "catalog";

  return (
    <div className="space-y-6">
      <CsvImportForm defaultCategorySlug={defaultCategorySlug} />
    </div>
  );
}
