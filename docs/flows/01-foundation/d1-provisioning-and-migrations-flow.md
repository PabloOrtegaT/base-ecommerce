# D1 Provisioning and Migration Flow

## Problem solved

Cloudflare deploys fail when D1 bindings are missing or use placeholder IDs. This flow standardizes how production and preview D1 databases are provisioned, bound, migrated, and verified.

## User roles and actors

- Platform engineer: provisions D1 and updates worker bindings.
- CI/CD runner: validates D1 configuration before deploy.
- Cloudflare Workers runtime: reads D1 binding `DB`.

## How to use

1. Create production D1 database:
   `npx wrangler d1 create base-ecommerce-prod`
2. Create preview D1 database:
   `npx wrangler d1 create base-ecommerce-preview`
3. Copy database IDs into `apps/web/wrangler.jsonc`:
   - `database_id` (production)
   - `preview_database_id` (preview)
4. Run preflight validation:
   `npm run cf:preflight`
5. Apply migrations:
   - Production:
     `npm run db:migrate:remote`
   - Preview:
     `npm run db:migrate:remote:preview`
6. Deploy:
   `npm run cf:deploy`
7. Run post-deploy smoke checks for `/login`, `/api/auth/providers`, and authenticated `/api/cart`.

## How it works

- `apps/web/wrangler.jsonc` defines a single binding name `DB` and two DB IDs (prod + preview).
- `apps/web/scripts/check-d1-config.mjs` validates:
  - IDs exist.
  - IDs are not placeholder values.
  - IDs are UUIDs.
  - Production and preview IDs are different.
- Deploy workflows call preflight before deployment to block invalid config early.
- Drizzle SQL migrations in `apps/web/drizzle/migrations` are applied separately to prod and preview targets.

## Why this approach

- Keeps production isolated from preview branch traffic and test data.
- Fails fast before deploy instead of failing late at Cloudflare API runtime.
- Preserves a simple two-environment topology that fits the current project phase.

## Alternatives considered

- Single shared DB for all environments:
  - Simpler setup, but preview data can contaminate production.
- One DB per branch:
  - Better isolation, but higher operational overhead for this stage.

## Data contracts or schemas involved

- Worker binding contract:
  - `binding`: `DB`
  - `database_id`: production DB UUID
  - `preview_database_id`: preview DB UUID
- Migration contract:
  - SQL migrations under `apps/web/drizzle/migrations`.

## Failure modes and edge cases

- Placeholder IDs left in config:
  - blocked by `cf:preflight`.
- Migration applied only to production:
  - preview environment breaks on schema mismatch.
- Wrong token permissions:
  - deploy or migration commands fail with Cloudflare API permission errors.

## Observability and debugging

- Preflight output identifies exactly which D1 ID is invalid.
- Cloudflare deploy logs reveal binding and API failures.
- Wrangler migration logs confirm which migrations were applied.

## Security considerations

- D1 IDs are not secrets, but API tokens and account IDs remain secret-managed.
- Deployment token must be scoped to minimum required D1 + Workers permissions.
- Avoid storing auth secrets in repository; keep in Cloudflare/GitHub secrets.

## Tests that validate this flow

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run cf:preflight`
- `npm run cf:build`
- `npm run cf:deploy` (with valid credentials and IDs)

## Open questions or future improvements

- Add per-branch preview DB provisioning automation when release cadence grows.
- Add migration drift checks against deployed environments.
- Add synthetic checks for auth/cart endpoints after deploy in CI.
