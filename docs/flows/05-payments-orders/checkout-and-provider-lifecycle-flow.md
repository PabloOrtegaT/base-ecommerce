# Checkout Session and Provider Lifecycle Flow

## Problem solved

Customers need a reliable way to start checkout from their authenticated cart, apply coupons to subtotal-only discounts, and continue to a payment provider without breaking order persistence.

## User roles and actors

- Authenticated customer: starts checkout and completes payment.
- Checkout API: validates payload, cart state, and coupon applicability.
- Order service: persists order, order lines, and status timeline.
- Payment provider adapter: creates checkout session (live or mock mode).

## How to use

1. Sign in with a verified account.
2. Open `/cart`.
3. Choose payment method and optional coupon code in checkout panel.
4. Click `Continue to payment`.
5. Complete provider checkout (or mock checkout in fallback mode).
6. Return to `/checkout/success` or `/checkout/cancel`.
7. Review resulting order under `/account`.

## How it works

- `POST /api/checkout/session` requires authenticated + verified user.
- Server loads authoritative cart from D1 (`GET /api/cart` source of truth).
- Server rejects checkout when cart is empty or contains unavailable lines.
- Server validates current stock by `variantId` before provider redirect.
- If any line is short on stock, checkout fails with deterministic `409 insufficient_stock`.
- Coupon totals are computed against products subtotal only.
- Pending order is persisted to D1:
  - `order`
  - `orderItem`
  - initial `orderStatusTimeline` entry.
- Payment adapter is resolved by method:
  - `card` -> Stripe when configured, otherwise `mock-card`.
  - `mercadopago` -> live adapter when configured, otherwise `mock-mercadopago`.
  - `paypal` -> live adapter when configured, otherwise `mock-paypal`.
- Provider session details are persisted in `paymentAttempt` and attached to order.

## Why this approach

- Keeps server-side order persistence before payment redirect, preventing orphaned checkout attempts.
- Supports real providers and fallback mock mode with one adapter contract.
- Preserves roadmap requirement for card-first default while keeping optional methods available.
- Blocks only immediate out-of-stock checkout attempts while keeping the payment flow simpler.

## Alternatives considered

- Direct provider redirect without pre-persisted order:
  - Simpler integration but weak reconciliation under retries/failures.
- Hard-coding one provider in route handlers:
  - Faster to ship, but blocks multi-provider extensibility.

## Data contracts or schemas involved

- Checkout request:
  - `{ provider, couponCode?, successPath?, cancelPath? }`
- Checkout response:
  - `{ orderId, orderNumber, providerId, paymentSessionId, checkoutUrl, totals, coupon }`
- Stock conflict response:
  - status `409`
  - `{ code: "insufficient_stock", lines: [...] }`
- Coupon rule:
  - Percentage/fixed discount applies to subtotal, never shipping.
- Persistence:
  - `order`, `orderItem`, `orderStatusTimeline`, `paymentAttempt`.

## Failure modes and edge cases

- Unauthenticated or unverified customer attempts checkout.
- Cart has unavailable lines or zero purchasable subtotal.
- Insufficient stock during immediate checkout validation (`409 insufficient_stock`).
- Provider credentials missing (fallback to mock mode except explicit live webhook routes).
- Provider session creation failure after order creation.

## Observability and debugging

- Route-level telemetry logs unexpected checkout creation failures.
- Order timeline captures `pending_payment` creation and provider session attachment.
- API response includes deterministic errors for user-correctable checkout failures.

## Security considerations

- Checkout creation is server-only and tied to authenticated session user.
- Email verification is required for checkout-critical action.
- No client-side coupon trust; all discount validation runs server-side.

## Tests that validate this flow

- `src/__tests__/api/checkout-session-route.test.ts`
- `src/__tests__/payments/checkout-service.test.ts`
- `src/__tests__/api/orders-route.test.ts`

## Open questions or future improvements

- Add tax and shipping calculators as separate totals stages.
- Add provider-specific customer metadata normalization for support tooling.
