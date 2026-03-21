# D1 Table Usage (Post-Rollback Target)

Last reviewed: 2026-03-20  
Note: this document reflects the intended schema after applying `apps/web/drizzle/migrations/0004_d05_remove_inventory_reservations.sql`.

## Target table list
After the rollback migration:

1. `_cf_KV`
2. `account`
3. `authRefreshSession`
4. `cart`
5. `cartItem`
6. `d1_migrations`
7. `inventoryStock`
8. `order`
9. `orderItem`
10. `orderStatusTimeline`
11. `passwordResetToken`
12. `paymentAttempt`
13. `paymentWebhookEvent`
14. `sqlite_sequence`
15. `user`
16. `verificationToken`

## Summary
- App-managed tables: `account`, `authRefreshSession`, `cart`, `cartItem`, `inventoryStock`, `order`, `orderItem`, `orderStatusTimeline`, `passwordResetToken`, `paymentAttempt`, `paymentWebhookEvent`, `user`, `verificationToken`
- Platform/internal tables: `_cf_KV`, `d1_migrations`, `sqlite_sequence`
- Usage status:
  - `active`: used by current application flows.
  - `conditional`: used when a feature is enabled (for example OAuth providers).
  - `internal`: managed by Cloudflare/SQLite/Wrangler, not by app domain logic.

## Table-by-table details

### `user` (active)
- Why: identity source for credentials auth, roles, account state.
- How used:
  - Auth adapter and auth services read/write users.
  - Linked to carts, orders, refresh sessions, tokens.
- Code paths:
  - `apps/web/src/server/auth/options.ts`
  - `apps/web/src/server/auth/service.ts`
  - `apps/web/src/server/db/schema.ts`

### `account` (conditional)
- Why: OAuth account links (Google/Facebook) for Auth.js/NextAuth.
- How used:
  - Through Drizzle adapter in auth options.
  - Populated only if OAuth providers are configured and used.
- Code paths:
  - `apps/web/src/server/auth/options.ts`
  - `apps/web/src/server/db/schema.ts`

### `verificationToken` (active)
- Why: email verification tokens.
- How used:
  - Created on registration flow and consumed on verify endpoint.
  - Also wired in auth adapter.
- Code paths:
  - `apps/web/src/server/auth/service.ts`
  - `apps/web/src/server/auth/options.ts`
  - `apps/web/src/server/db/schema.ts`

### `passwordResetToken` (active)
- Why: forgot/reset password flow tokens.
- How used:
  - Created during forgot-password.
  - Read/validated/deleted during reset-password.
- Code paths:
  - `apps/web/src/server/auth/service.ts`
  - `apps/web/src/server/db/schema.ts`

### `authRefreshSession` (active)
- Why: DB-backed rotating refresh sessions for JWT access flow.
- How used:
  - Create/rotate/revoke per device/surface.
  - Supports logout current/logout-all/session listing.
- Code paths:
  - `apps/web/src/server/auth/refresh-sessions.ts`
  - `apps/web/src/server/db/schema.ts`

### `cart` (active)
- Why: per-user cart root record.
- How used:
  - Created on demand and versioned with `updatedAt`.
- Code paths:
  - `apps/web/src/server/cart/service.ts`
  - `apps/web/src/server/db/schema.ts`

### `cartItem` (active)
- Why: persisted line items for user cart.
- How used:
  - Replaced/upserted by cart API and cart merge flows.
  - Used as checkout input source.
- Code paths:
  - `apps/web/src/server/cart/service.ts`
  - `apps/web/src/app/api/cart/route.ts`
  - `apps/web/src/server/db/schema.ts`

### `inventoryStock` (active)
- Why: canonical stock state used for availability reads, checkout validation, and payment-success decrements.
- How used:
  - Read on availability/cart reconciliation and checkout session validation.
  - Updated by admin stock sync and successful payment processing.
- Code paths:
  - `apps/web/src/server/inventory/service.ts`
  - `apps/web/src/app/api/catalog/availability/route.ts`
  - `apps/web/src/server/db/schema.ts`

### `order` (active)
- Why: checkout/order aggregate root.
- How used:
  - Created on checkout start.
  - Updated by payment session attach and webhook outcomes.
  - Listed for account/admin order views.
- Code paths:
  - `apps/web/src/server/orders/service.ts`
  - `apps/web/src/server/payments/checkout-service.ts`
  - `apps/web/src/server/payments/webhook-service.ts`
  - `apps/web/src/server/db/schema.ts`

### `orderItem` (active)
- Why: immutable order line snapshots.
- How used:
  - Inserted when order is created from cart snapshot.
  - Queried for user/admin order summaries.
- Code paths:
  - `apps/web/src/server/orders/service.ts`
  - `apps/web/src/server/db/schema.ts`

### `orderStatusTimeline` (active)
- Why: audit-style order transition history.
- How used:
  - Appends status transitions from checkout and webhook processing.
- Code paths:
  - `apps/web/src/server/orders/service.ts`
  - `apps/web/src/server/db/schema.ts`

### `paymentAttempt` (active)
- Why: checkout provider attempt/session tracking.
- How used:
  - Created when checkout session is attached.
  - Updated by webhook processing.
- Code paths:
  - `apps/web/src/server/orders/service.ts`
  - `apps/web/src/server/payments/webhook-service.ts`
  - `apps/web/src/server/db/schema.ts`

### `paymentWebhookEvent` (active)
- Why: webhook idempotency and processing log.
- How used:
  - Insert-once by `(provider,eventId)`.
  - Marked processed with outcome/order linkage.
- Code paths:
  - `apps/web/src/server/payments/webhook-service.ts`
  - `apps/web/src/server/db/schema.ts`

### `_cf_KV` (internal)
- Why: Cloudflare D1 internal metadata table.
- How used:
  - Not read/written by app code.
- Ownership: Cloudflare platform.

### `d1_migrations` (internal)
- Why: Wrangler migration tracking.
- How used:
  - Written by `wrangler d1 migrations apply`.
  - Not read/written by app business code.

### `sqlite_sequence` (internal)
- Why: SQLite internal sequence bookkeeping.
- How used:
  - Not application-domain managed.

## Are all tables used?
- Yes for app-managed domain/auth/payment tables, with one conditional nuance:
  - `account` is used when OAuth providers are enabled and users sign in with OAuth.
- Internal tables are expected and should remain unmanaged by application logic.

## Verification commands
- List tables (preview):
  - `npx wrangler d1 execute DB --config apps/web/wrangler.jsonc --remote --preview --command "select name from sqlite_master where type='table' order by name;"`
- Local list:
  - `npx wrangler d1 execute DB --config apps/web/wrangler.jsonc --local --command "select name from sqlite_master where type='table' order by name;"`
