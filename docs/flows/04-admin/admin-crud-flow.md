# Admin CRUD Flow

## Problem solved

Operations teams need explicit admin surfaces to manage profile-scoped catalog and home content without mixing vertical data.

## User roles and actors

- Owner/Manager/Catalog roles (permission dependent).
- Admin operators performing product, variant, category, and content operations.
- Storefront server readers consuming same runtime state.

## How to use

1. Open `/admin/categories`:
   - Create/edit categories.
   - Review category table and profile template attributes.
2. Open `/admin/products`:
   - Create/edit products with full fields (slug, base SKU, description, tags, compare-at, currency, status).
   - Create/edit variants with full fields (SKU, compare-at, stock, default flag).
   - Variant stock updates support two modes:
     - `set`: replace stock with an exact value.
     - `adjust`: apply a positive/negative delta to current stock.
   - Review TanStack tables for products/variants.
3. Open `/admin/content`:
   - Create news posts, banners, featured-sale blocks.
   - Toggle active/status states.
   - Review content entries table.
3. Navigate storefront `/` and `/catalog` to verify updates are reflected.

## How it works

- Admin pages call server actions under `app/(admin)/admin/actions.ts`.
- Actions use a shared safe-mutation wrapper that validates input, enforces permissions, maps typed errors, sets flash-toasts, and redirects back to the same admin surface.
- Write actions enforce admin-host origin/referrer checks in split-host deployments.
- Actions validate permissions and pass payloads to `server/admin/admin-service.ts`.
- Service validates with Zod DTO/domain schemas, mutates in-memory profile store, and timestamps updates.
- Product stock is derived from variants. Stock writes are variant-canonical and processed by stock-mode rules (`set` / `adjust`).
- Storefront services read from same profile runtime store (`runtime-store.ts`) so admin changes are immediately visible.
- TanStack Table is used for categories, products, variants, and content entry tables.

## Why this approach

- Enables full admin behavior before persistence layer integration.
- Keeps business validation at service/schema boundary.
- Preserves profile isolation rules while allowing rich admin workflows.

## Alternatives considered

- Direct database integration in Deliverable 04:
  - More durable but adds migration/infra complexity too early.
- Client-only local state forms:
  - Faster prototype, but cannot reflect changes to storefront services.

## Data contracts or schemas involved

- Domain schemas:
  - `categorySchema`, `productSchema`, `productVariantSchema`
  - `newsPostSchema`, `promoBannerSchema`, `featuredSaleSchema`
- Validation DTOs:
  - create/update product, variant, category, and content inputs.
- Profile resolution:
  - `STORE_PROFILE` + runtime store scoping.

## Failure modes and edge cases

- Unknown category/product/variant ids on updates.
- Invalid compare-at/price combinations.
- Invalid stock adjustments (for example, adjustment resulting in negative inventory).
- Invalid news/banner/featured payload shape.
- Cross-profile category slug mismatch avoided by profile store scoping.

## Observability and debugging

- Service-layer errors are explicit (not found, permission, validation) and mapped to sanitized user-facing toasts.
- Table views expose latest state immediately after action revalidation.

## Security considerations

- All mutations enforce route-specific permissions.
- No client-trusted writes without server action guard.
- In split-host mode, admin writes also validate origin/referrer host to reduce cross-origin mutation risk.

## Tests that validate this flow

- `src/__tests__/admin/table-columns.test.tsx` (table behavior)
- `src/__tests__/admin/mutation-errors.test.ts` (typed error mapping and safe feedback)
- `src/__tests__/admin/stock-mode.test.ts` (variant stock `set` / `adjust`)
- `src/__tests__/admin/role-guard-runtime.test.ts` (admin host, origin checks, recent-auth path)
- `e2e/admin-product-crud.spec.ts` (create/edit product integration path)
- `e2e/admin-categories-crud.spec.ts` (create/edit category integration path)

## Open questions or future improvements

- Persist state in database with transactional writes.
- Add optimistic UI and inline edit for table cells.
- Add granular field-level change audit trail.
