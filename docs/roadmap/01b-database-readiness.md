# Deliverable 01b: Database Readiness (D1 Baseline)

## Objective

Establish and validate Cloudflare D1 infrastructure as a stable baseline for deployments and for Deliverable 05 auth/cart persistence.

## Relationship with other deliverables

- Deliverable 05 depends on this database baseline for persistent auth/cart behavior.
- This deliverable must be kept current whenever Cloudflare environments or deployment topology changes.

## Scope

- Cloudflare D1 provisioning (production + preview).
- Wrangler binding correctness.
- Migration execution in remote environment.
- CI/deploy validation gate for D1 binding IDs.
- Environment/secrets baseline for auth persistence runtime.

## Implementation checklist

- Create D1 databases in Cloudflare:
  - Production DB for `main`.
  - Preview DB for non-production branches.
- Replace non-production placeholder values in `apps/web/wrangler.jsonc`:
  - `database_id`
  - `preview_database_id`
- Validate `migrations_dir` and apply migrations remotely:
  - `npm run db:migrate:remote`
  - `npm run db:migrate:remote:preview`
- Ensure deploy environment has required auth/session variables:
  - `AUTH_SECRET`
  - `AUTH_REFRESH_TOKEN_SECRET`
  - `APP_BASE_URL`
  - `ADMIN_BASE_URL` (if host split is enabled)
- Add a deployment gate:
  - Build fails if D1 IDs are placeholder UUIDs.
- Update docs with operational runbook:
  - How to create DBs.
  - How to bind IDs.
  - How to migrate local vs remote.
  - How to rotate secrets safely.

## Validation gates

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run cf:build`
- `npx wrangler deploy --config apps/web/wrangler.jsonc` (or CI equivalent)
- Post-deploy smoke:
  - `/login` loads.
  - `/api/auth/providers` returns 200.
  - authenticated `/cart` fetch returns 200.

## Acceptance criteria

- Deployable config contains valid production and preview D1 IDs.
- Remote migrations are applied successfully.
- Cloudflare deploy succeeds on `main`.
- Auth/cart persistence endpoints work against D1 in deployed environment.
- Database readiness flow docs are added and linked from Deliverable 05 docs.

## Exit artifacts

- Updated `apps/web/wrangler.jsonc` with real D1 IDs.
- Verified remote migration log output.
- CI/deploy gate for placeholder ID detection.
- Database provisioning runbook under `docs/flows/01-foundation/`.
