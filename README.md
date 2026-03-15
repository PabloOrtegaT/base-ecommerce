# Base Ecommerce

Reusable ecommerce foundation built with Next.js, TypeScript, and workspace packages.

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
cp apps/web/.dev.vars.example apps/web/.dev.vars
npm run db:migrate:local
npm run db:seed
```

Optional local host split for admin surface:

- `APP_BASE_URL=http://storefront.lvh.me:3000`
- `ADMIN_BASE_URL=http://admin.lvh.me:3000`
- run dev and open `http://storefront.lvh.me:3000` for storefront, `http://admin.lvh.me:3000/admin` for admin.

## Run locally

```bash
npm run dev
```

App URL: `http://localhost:3000`

Default local seeded owner account:

- Email: `owner@base-ecommerce.local`
- Password: `ChangeMe123!`

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
```

## D05 Auth + Cart foundation

- Auth stack: Auth.js (`next-auth`) + Drizzle adapter + JWT sessions + rotating refresh sessions.
- Persistence: Cloudflare D1 (`DB` binding) + Drizzle migrations.
- Guest cart merges into authenticated server cart after login via `/auth/sync-cart`.
- Dedicated admin host routing is enforced by middleware when `ADMIN_BASE_URL` differs from `APP_BASE_URL`.

## Documentation

- Roadmap: `docs/roadmap/`
- Standards: `docs/standards/`
- Flow docs: `docs/flows/`

## Deploy to Cloudflare Workers

The web app includes OpenNext + Wrangler setup under `apps/web`.

### Local Cloudflare preview

```bash
cp apps/web/.dev.vars.example apps/web/.dev.vars
npm run cf:preview
```

### Production deploy (manual)

```bash
npm run cf:deploy
```

Required environment variables for deploy:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

If you deploy from Cloudflare dashboard build pipelines, ensure optional native deps are installed:

- install command: `npm ci --include=optional`
- if old caches were created before this config, run one deploy with cleared build cache.

### GitHub Actions deploy

Workflow: `.github/workflows/deploy-cloudflare.yml`

Set repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
