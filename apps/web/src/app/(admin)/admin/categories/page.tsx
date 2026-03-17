import Link from "next/link";
import { AccessDenied } from "@/components/admin/access-denied";
import { CategoriesTable } from "@/components/admin/tables";
import { createCategoryAction, updateCategoryAction } from "@/app/(admin)/admin/actions";
import { listAdminCategories, listAdminCategoryAttributes } from "@/server/admin/admin-service";
import { getRouteAccess } from "@/server/admin/role-guard";

type AdminCategoriesPageProps = {
  searchParams?: Promise<{
    editCategory?: string;
  }>;
};

export default async function AdminCategoriesPage({ searchParams }: AdminCategoriesPageProps) {
  const access = await getRouteAccess("categories");
  if (!access.allowed) {
    return <AccessDenied role={access.role ?? "unknown"} section="categories" />;
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const categories = listAdminCategories();
  const categoryAttributes = listAdminCategoryAttributes();
  const selectedCategoryForEdit = categories.find((category) => category.id === resolvedSearchParams?.editCategory);

  return (
    <main className="space-y-6">
      <section className="grid gap-4 rounded-lg border bg-card p-6 text-card-foreground lg:grid-cols-2">
        <form action={createCategoryAction} className="space-y-3 rounded-md border bg-muted p-3" data-testid="create-category-form">
          <h1 className="text-xl font-semibold">Create category</h1>
          <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-category-name">
            Name
          </label>
          <input
            id="create-category-name"
            type="text"
            name="name"
            placeholder="Category name"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
          <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-category-slug">
            Slug
          </label>
          <input
            id="create-category-slug"
            type="text"
            name="slug"
            placeholder="category-slug"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
          <label className="block text-xs font-medium text-muted-foreground" htmlFor="create-category-description">
            Description
          </label>
          <textarea
            id="create-category-description"
            name="description"
            placeholder="Optional category description"
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            Add category
          </button>
        </form>

        {selectedCategoryForEdit ? (
          <form
            action={updateCategoryAction}
            className="space-y-3 rounded-md border bg-muted p-3"
            data-testid="edit-category-form"
          >
            <h2 className="text-lg font-semibold">Edit category</h2>
            <input type="hidden" name="id" value={selectedCategoryForEdit.id} />
            <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-category-name">
              Name
            </label>
            <input
              id="edit-category-name"
              type="text"
              name="name"
              defaultValue={selectedCategoryForEdit.name}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
            <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-category-slug">
              Slug
            </label>
            <input
              id="edit-category-slug"
              type="text"
              name="slug"
              defaultValue={selectedCategoryForEdit.slug}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
            <label className="block text-xs font-medium text-muted-foreground" htmlFor="edit-category-description">
              Description
            </label>
            <textarea
              id="edit-category-description"
              name="description"
              defaultValue={selectedCategoryForEdit.description}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">Template key: {selectedCategoryForEdit.templateKey}</p>
            <div className="flex gap-2">
              <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                Save category changes
              </button>
              <Link href="/admin/categories" className="rounded-md border px-3 py-2 text-sm hover:bg-background">
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
            Select <span className="font-medium text-foreground">Edit</span> on a category row to load the edit form.
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold">Categories table</h2>
        <CategoriesTable rows={categories} />
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-semibold">Attribute templates</h2>
        <div className="max-h-72 space-y-3 overflow-auto rounded-md border bg-muted p-3">
          {categoryAttributes.map((entry) => (
            <article key={entry.categoryId} className="rounded-md border bg-background p-3">
              <p className="font-medium">{entry.categoryName}</p>
              <p className="text-xs text-muted-foreground">Template: {entry.templateKey}</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {entry.attributes.map((attribute) => (
                  <li key={attribute.key}>
                    {attribute.key} ({attribute.type}) {attribute.required ? "required" : "optional"}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
