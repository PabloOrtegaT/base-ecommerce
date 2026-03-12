# Base Ecommerce

Reusable ecommerce foundation built with Next.js, TypeScript, and workspace packages.

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
```

## Run locally

```bash
npm run dev
```

App URL: `http://localhost:3000`

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
```

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

### GitHub Actions deploy

Workflow: `.github/workflows/deploy-cloudflare.yml`

Set repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
