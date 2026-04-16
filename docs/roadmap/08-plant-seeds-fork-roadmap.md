# Deliverable 08: Plant-Seeds Fork Roadmap

## Goal

Turn this repository from the old multi-vertical base into a single, production-ready plant-focused ecommerce for seeds, indoor-growing supplies, and related products, with no leftover non-plant legacy.

## Why this roadmap exists

The earlier roadmap documents describe the base platform. This document is the fork-specific execution plan for this repo.

Verified current-state constraints:

- The repo still contains `prints-3d` and `pc-components` references in runtime store data, tests, docs, and profile validation.
- `plant-seeds` is the only profile that should survive in this fork.
- The current `plant-seeds` attribute template is seed-specific (`species`, `sunlight`, `germination_days`, `seasonality`, `is_heirloom`) and is not enough for lights, fertilizers, substrates, pots, or accessories.
- The storefront catalog currently renders one generic `ProductCard` from `listCatalogProducts()`.
- The admin area is functional, but key pages are still monolithic and form-heavy.

## Non-negotiable rules

1. Delete non-plant legacy instead of preserving compatibility.
2. Prefer shadcn-style primitives and shared composition over bespoke UI.
3. Any rule enforced in the UI must also be enforced server-side.
4. Treat auth, admin, cart, checkout, payments, and webhooks as security-sensitive.
5. Use skill-first workflows before deep implementation when a specialized skill is available.
6. Every meaningful change must update the correct test boundary.

## Agent execution model

This repo can use multiple agents in parallel, but the useful pattern is orchestration and synthesis, not uncontrolled “agents talking forever”.

Recommended pattern for high-risk UI refactors:

1. Discovery round
   - `explore` or `general` agent to map the current surface and constraints.
   - `frontend-design` skill for UI direction and component strategy.
   - `vercel-react-best-practices` skill for React and Next.js performance constraints.
2. Synthesis round
   - Main orchestrator compares the proposals, chooses a direction, and converts it into concrete implementation tasks.
3. Implementation round
   - Implement the chosen design in small, testable steps.
4. Adversarial review round
   - Use `judgment-day` after major admin/catalog milestones to run two independent blind reviews before considering the work stable.

Use this pattern for admin dashboard redesign, catalog redesign, checkout changes, and other high-impact surfaces.

## Delivery format for each phase

Each phase below should only be considered complete when all of the following are true:

1. Code for the phase is merged locally and legacy touched by that phase is deleted.
2. Relevant tests pass or are updated.
3. Flow docs are updated when behavior changes.
4. No leftover dead code remains in the touched area.

## Phase 0: Fork reset and governance

### Objective

Make the repo explicitly plant-only and stop future work from reintroducing base-project assumptions.

### Tasks

1. Keep `AGENTS.md` aligned with plant-only rules and legacy deletion rules.
2. Add the plant-fork roadmap to the roadmap index.
3. Mark old base-roadmap assumptions as historical where they still describe three active verticals.
4. Review top-level docs (`README.md`, forking docs, flow docs) and remove messaging that implies this repo still intends to serve multiple verticals.

### Acceptance criteria

1. Repo guidance no longer positions this codebase as an active multi-vertical base.
2. Contributors can see one clear source of truth for the fork direction.

## Phase 1: Legacy purge and single-profile collapse

### Objective

Remove all `prints-3d`, `pc-components`, and other non-plant legacy from runtime code, tests, fixtures, and docs.

### Tasks

1. Remove non-plant sample data from:
   - `apps/web/src/server/data/storefront-db.ts`
   - `apps/web/src/server/data/runtime-store.ts`
   - inventory seed scripts and fixtures
2. Remove non-plant profile values from domain/profile contracts where safe:
   - `apps/web/src/server/config/store-profile.ts`
   - `packages/domain/src/catalog/schemas.ts`
   - any profile enums or validation helpers
3. Delete tests that exist only to preserve multi-vertical behavior.
4. Rewrite tests that should remain but currently assert cross-profile support.
5. Remove non-plant documentation, screenshots, copy, examples, and release guidance.
6. Remove env/example values that imply non-plant store data.

### Technical notes

1. Do this in a controlled sequence so the app still boots after each cleanup batch.
2. Collapse data and tests first, then tighten domain contracts, then clean docs.

### Acceptance criteria

1. No runtime catalog/content path references `prints-3d` or `pc-components`.
2. No plant fork docs describe this repo as an active multi-vertical base.
3. Typecheck, lint, and relevant tests pass after each cleanup batch.

## Phase 2: Plant-domain redesign

### Objective

Redesign the domain model so one plant-focused store can sell different classes of products without reviving multi-vertical architecture.

### Critical decision gate

The current `plant-seeds` template is seed-specific. If the store will include seeds, lights, fertilizers, substrates, pots, tents, and accessories, then one generic seed template is architecturally wrong.

### Recommended direction

Keep one store profile for the whole fork, but introduce multiple plant-domain category templates inside that profile.

Example category-template families:

1. `seed-packet`
2. `fertilizer`
3. `grow-light`
4. `substrate`
5. `pot-container`
6. `tool-accessory`

### Tasks

1. Define plant-domain taxonomy and decide what product families belong in scope for launch.
2. Replace the old single plant template with plant-category-specific attribute templates.
3. Update domain schemas and validation so each category template enforces relevant attributes.
4. Update admin create/edit flows so operators choose a plant category template intentionally.
5. Update seed/runtime fixtures to cover each supported plant-domain family.
6. Add unit tests for valid and invalid attribute payloads for every supported plant category template.

### Acceptance criteria

1. The domain can represent the full plant-store catalog without fake or irrelevant fields.
2. Frontend labels and backend validation agree on required attributes.
3. Admin cannot create impossible products by mixing attributes from unrelated plant product families.

## Phase 3: Data persistence and content readiness

### Objective

Ensure the fork has plant-ready runtime data and a clean path from fixtures to real persisted data.

### Tasks

1. Audit Drizzle schema and runtime store assumptions for plant-domain compatibility.
2. Replace remaining generic or placeholder plant fixtures with realistic seed and indoor-grow data.
3. Ensure categories, products, variants, banners, and featured content all reflect one coherent plant brand.
4. Define what content is fixture-only and what content must be editable in admin from day one.
5. Verify seed scripts do not inject cross-vertical data.

### Acceptance criteria

1. Fresh local seed produces a believable plant-store experience.
2. No placeholder cross-vertical content appears in home, catalog, admin, or orders.

## Phase 4: Catalog architecture refactor

### Objective

Refactor the catalog so it fits a plant-commerce browsing experience instead of a generic base catalog.

### Feasibility finding

Different preview cards are absolutely possible.

Why:

1. `listCatalogProducts()` already centralizes listing data.
2. The catalog currently renders one `ProductCard` component from that listing result.
3. Product variants already carry `attributeValues`.
4. The domain can expose plant-category metadata to drive different card presentations.

### Recommended implementation direction

Do not create unrelated card systems. Build one card shell with plant-category display variants or slots.

Example card variants:

1. Seed card
   - species
   - germination days
   - sunlight
   - heirloom badge
2. Fertilizer card
   - NPK or nutrient type
   - target stage
   - package size
3. Grow-light card
   - wattage
   - coverage area
   - spectrum or form factor
4. Accessory card
   - compatibility
   - material
   - pack size

### Tasks

1. Define catalog browse priorities for each plant product family.
2. Create a normalized catalog-card view model derived from domain data.
3. Refactor `ProductCard` into a reusable shell plus family-specific content blocks.
4. Improve search, filters, and sorting for plant shopping intent.
5. Add image strategy for catalog cards and product detail pages.
6. Review metadata, breadcrumbs, and collection structures for SEO.
7. Update category pages to communicate the product family clearly.

### Multi-agent workflow

1. Run discovery on current catalog UX and data constraints.
2. Run `frontend-design` for visual direction.
3. Run a second independent design/research pass focused on conversion and information hierarchy.
4. Synthesize one chosen direction before coding.
5. After implementation, run `judgment-day` on the catalog surface.

### Acceptance criteria

1. Plant product families can present different preview information without fragmenting the codebase.
2. Catalog cards communicate useful buy-decision info before click-through.
3. The card architecture remains shared and testable.

## Phase 5: Product detail page and cart refactor

### Objective

Make product detail and cart flows plant-commerce ready and consistent with the new catalog model.

### Tasks

1. Redesign product detail to foreground the right attributes for each plant product family.
2. Add richer attribute presentation, guidance, and trust signals.
3. Improve stock and variant messaging for product types with multiple sizes or pack quantities.
4. Verify add-to-cart constraints are enforced in UI and server flows.
5. Add plant-relevant upsell and cross-sell logic only if it is grounded in actual catalog structure.

### Acceptance criteria

1. Product detail pages help users evaluate products quickly.
2. Cart logic respects stock and product-family-specific constraints.
3. No client-only business rule exists without server enforcement.

## Phase 6: Admin information architecture redesign

### Objective

Refactor the admin dashboard and admin modules into a tool that feels purpose-built for a plant retailer.

### Current-state finding

The current admin is functional, but important screens are still large, page-level forms and generic KPI blocks. It needs stronger information architecture, clearer workflows, and more reusable UI primitives.

### Tasks

1. Redesign admin navigation around real operator jobs:
   - dashboard
   - catalog
   - inventory
   - content
   - promotions
   - orders
   - customers or support, if in scope
2. Break monolithic admin pages into reusable sections, forms, dialogs, tables, and cards.
3. Migrate admin controls to shadcn-style primitives wherever feasible.
4. Improve dashboards to show operational signals that matter to a plant store.
5. Improve create/edit product flows for plant product families.
6. Remove legacy bulk-import flows that no longer fit the plant-admin operating model.
7. Add stronger feedback states, empty states, validation states, and audit visibility.

### Multi-agent workflow

1. Use one discovery agent to map current admin workflows and pain points.
2. Use `frontend-design` to propose a distinctive but practical admin design system.
3. Use a second independent agent pass focused on workflow efficiency and permissions.
4. Synthesize one chosen admin IA and component strategy.
5. Implement module by module, not by giant rewrite.
6. Run `judgment-day` after the dashboard shell and after the catalog-management module.

### Acceptance criteria

1. Admin reflects plant-store workflows, not base-project generic CRUD.
2. Admin UI uses shared primitives instead of ad hoc styling.
3. Every create/edit path has matching backend validation and permission checks.

## Phase 7: Checkout, orders, and post-purchase completion

### Objective

Make checkout and order flows reliable for the plant store and aligned with the refined catalog.

### Tasks

1. Revalidate checkout payload rules against the final plant-domain catalog model.
2. Ensure coupon logic still makes sense for the plant-store assortment.
3. Audit payment-provider flows, webhook handling, and order state transitions.
4. Verify order summaries display the right plant-product details.
5. Add or tighten E2E coverage for checkout success, failure, and order visibility.

### Acceptance criteria

1. Checkout works cleanly with the plant catalog and order model.
2. Payment/webhook paths remain secure and idempotent.
3. Order visibility works in both customer and admin surfaces.

## Phase 8: SEO, content, and discoverability

### Objective

Make the plant store discoverable and content-rich enough to support search and merchandising.

### Tasks

1. Rewrite home, category, and product metadata around the plant brand and taxonomy.
2. Replace placeholder news, banners, and featured-sale content with real plant-focused content strategy.
3. Add structured internal linking between related plant categories.
4. Review content modules for plant education, buying guidance, and trust-building.
5. Review image alt text, headings, and URL structures.

### Acceptance criteria

1. Public pages have coherent plant-focused metadata and content.
2. Storefront content reinforces the plant niche consistently.

## Phase 9: Security, hardening, and observability pass

### Objective

Re-audit the fork after the major refactors so the final store is not just prettier, but safer.

### Tasks

1. Re-check auth, admin actions, cart routes, checkout, and webhooks for validation parity and sanitized errors.
2. Re-check host/origin/recent-auth guard behavior after admin refactors.
3. Review rate limiting for critical routes.
4. Review logging/audit visibility for important admin mutations.
5. Confirm no sensitive flows weakened during UI refactors.

### Acceptance criteria

1. High-risk routes preserve or improve existing safeguards.
2. Security-sensitive regressions are blocked before release.

## Phase 10: Launch readiness and release discipline

### Objective

Ship the plant store as a coherent product, not just a collection of features.

### Tasks

1. Run full quality gates in order:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run test:e2e`
2. Run Cloudflare preflight and deploy checks.
3. Review release checklist with plant-store-specific content and data expectations.
4. Verify seeded data, env vars, and production domains are correct for the plant brand.
5. Validate the most important customer and admin paths manually after deploy.

### Acceptance criteria

1. The store behaves like one coherent plant business.
2. No non-plant legacy remains in visible runtime behavior.
3. Critical customer and admin flows are verified before release.

## Suggested implementation order

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7
9. Phase 8
10. Phase 9
11. Phase 10

## Practical milestone slicing

If you want the execution broken into manageable milestones, use this sequence:

1. Milestone A
   - Phase 0 and Phase 1
   - outcome: plant-only repo baseline
2. Milestone B
   - Phase 2 and Phase 3
   - outcome: plant-domain model and realistic data
3. Milestone C
   - Phase 4 and Phase 5
   - outcome: conversion-ready storefront and catalog
4. Milestone D
   - Phase 6
   - outcome: production-quality admin experience
5. Milestone E
   - Phase 7, Phase 8, Phase 9, and Phase 10
   - outcome: production-ready launch candidate
