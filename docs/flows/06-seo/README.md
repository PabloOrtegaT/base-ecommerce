# SEO and Discoverability Flow

## Problem solved

The storefront needed technical SEO defaults so public pages are indexable with canonical metadata, while private/auth surfaces are excluded from indexing.

## User roles and actors

- Visitor/search crawler: consumes metadata, sitemap, robots, and structured data.
- Storefront page layer (App Router): generates route metadata and JSON-LD.
- SEO utility layer: centralizes canonical URL and metadata generation.

## How to use

1. Set `APP_BASE_URL` for the environment.
2. Open public routes (`/`, `/catalog`, category, product).
3. Inspect page source and verify canonical, OG, and JSON-LD blocks.
4. Open `/robots.txt` and `/sitemap.xml`.
5. Confirm private routes (`/login`, `/register`, `/cart`, `/account`) are `noindex`.

## How it works

- `src/server/seo/metadata.ts` builds canonical URLs and shared metadata payloads.
- `src/server/seo/structured-data.ts` builds `Product`, `Article`, and `BreadcrumbList` JSON-LD objects.
- `src/components/seo/json-ld-script.tsx` safely renders JSON-LD script tags.
- App routes use `createPageMetadata()` for consistent title/description/canonical/OG/Twitter fields.
- `src/app/robots.ts` and `src/app/sitemap.ts` are dynamic metadata routes.

## Why this approach

- One metadata utility prevents per-page drift.
- Canonical generation stays deterministic across environments.
- JSON-LD is explicit in route code and easy to validate in tests.

## Alternatives considered

- Hand-writing metadata on each page:
  - simpler initially but harder to keep consistent.
- External SEO plugin layer:
  - not applicable to this Next.js custom app architecture.

## Data contracts or schemas involved

- Metadata contract: `title`, `description`, `canonical`, `openGraph`, `twitter`, optional `robots.noindex`.
- Structured-data contract:
  - `Product`: `name`, `description`, `offers.price`, `offers.availability`, URL.
  - `Article`: `headline`, `description`, URL, publisher.
  - `BreadcrumbList`: ordered list with absolute item URLs.

## Failure modes and edge cases

- Missing/invalid `APP_BASE_URL`:
  - utility falls back to `http://127.0.0.1:3000`.
- Missing category/product mapping in sitemap generation:
  - entries are skipped safely.
- Private pages accidentally indexable:
  - prevented with route-level `noIndex` metadata plus robots disallow.

## Observability and debugging

- Validate with route source inspection and devtools.
- Use tests:
  - `src/__tests__/seo/metadata.test.ts`
  - `src/__tests__/seo/structured-data.test.ts`
  - `src/__tests__/seo/routes.test.ts`

## Security considerations

- JSON-LD serializer escapes `<` to reduce script injection risk.
- Admin/auth/private pages are excluded from indexing.

## Tests that validate this flow

- Unit tests for metadata builder canonical/noindex behavior.
- Unit tests for Product/Article/Breadcrumb JSON-LD outputs.
- Route tests for `robots` and `sitemap` generation.

## Open questions or future improvements

- Add product image/media pipeline for richer OG cards.
- Add hreflang strategy for future multi-locale support.
- Add Search Console validation checklist to release runbook.
