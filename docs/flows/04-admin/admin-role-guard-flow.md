# Admin Role Guard Flow

## Problem solved

Admin routes must enforce role boundaries so non-authorized roles cannot access sensitive modules (for example coupons/orders operations).

## User roles and actors

- Owner: full admin access.
- Manager: catalog/content/orders operational access.
- Catalog: catalog and inventory operations, no coupon/orders writes.
- Admin server layer: resolves active role and applies route/permission checks.

## How to use

1. Register and verify an account, then sign in.
2. Ensure the authenticated user has one of the allowed roles (`owner`, `manager`, `catalog`).
3. Open `/admin` routes.
4. Navigation displays only routes allowed for the session role.
5. If role cannot access a route/module, an access-denied panel is rendered.

## How it works

- Role is resolved from authenticated session user.
- Host boundary is enforced (`admin.<domain>` only) before role checks.
- `canAccessAdminRoute(role, route)` maps each route to required permission.
- Page-level guards call `getRouteAccess(route)` before rendering modules.
- Server actions call `ensurePermission(permission)` before executing mutations.
- Write actions require recent authentication window validation.

## Why this approach

- Keeps authorization logic centralized and testable.
- Matches existing RBAC model from domain deliverable.
- Avoids silent failures by explicit deny-state rendering.

## Alternatives considered

- Hardcoded role checks directly inside each page/action:
  - Faster initially, but brittle and duplicated.
- Env-only role simulation:
  - Good for very early scaffolding, but not acceptable for real auth security.

## Data contracts or schemas involved

- `roleSchema` and RBAC permission matrix from `@base-ecommerce/domain`.
- Session user contract from auth layer (`id`, `email`, `role`, `emailVerified`).
- Route permission map in `server/admin/role-guard.ts`.

## Failure modes and edge cases

- Missing/invalid session user on protected admin routes.
- Role with partial permissions attempts restricted action.
- Route allowed but action denied (guarded separately).

## Observability and debugging

- Guard helpers return `{ role, allowed }` for deterministic checks.
- Action guard errors include missing permission detail.

## Security considerations

- Mutations are permission-gated server-side.
- Admin host + optional Cloudflare Access header gate are enforced server-side.
- UI route filtering is not treated as security boundary by itself.

## Tests that validate this flow

- `src/__tests__/admin/role-guard.test.ts`
- Existing RBAC tests in `src/__tests__/domain/rbac.test.ts`

## Open questions or future improvements

- Add audit logs for denied attempts and sensitive admin actions.
- Add MFA for privileged admin roles.
