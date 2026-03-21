# Payment Webhook Idempotency and Order Transition Flow

## Problem solved

Payment providers can retry webhook deliveries. The platform must process each provider event exactly once for business effects while still returning success to duplicate deliveries.

## User roles and actors

- Payment provider webhook sender (Stripe/Mercado Pago/PayPal/mock).
- Webhook route: validates provider route and parses event payload.
- Webhook processor: applies idempotency and order/payment transitions.
- Admin/customer readers: consume updated order status views.

## How to use

1. Configure provider webhook URL:
   - `/api/payments/webhook/stripe`
   - `/api/payments/webhook/mercadopago`
   - `/api/payments/webhook/paypal`
2. Provider sends signed event payload.
3. Route parses event through provider adapter.
4. Processor writes idempotency ledger and applies order transition.
5. Duplicate event IDs return idempotent `received` response without duplicate state changes.

## How it works

- Dynamic route: `POST /api/payments/webhook/[provider]`.
- Provider adapter parses and verifies event (signature verification where configured).
- Processor attempts insert into `paymentWebhookEvent` with unique `(provider, eventId)`:
  - Insert success: first-time event, continue processing.
  - Conflict: duplicate event, return idempotent success payload.
- Order lookup uses:
  - `event.orderId` first.
  - fallback `providerSessionId` lookup.
- Outcome mapping:
  - `succeeded` -> `order.status=paid`, `paymentStatus=succeeded`, inventory decremented once.
  - `failed` -> `order.status=payment_failed`, `paymentStatus=failed`.
  - `cancelled` -> `order.status=cancelled`, `paymentStatus=cancelled`.
  - `pending` -> remains `pending_payment`.
- Status change appends to `orderStatusTimeline`.
- `paymentAttempt` row is updated to reflect final provider outcome.

## Why this approach

- Prevents duplicate side effects under provider retries.
- Keeps transition logic centralized and deterministic.
- Preserves raw webhook payload for post-incident debugging.
- Keeps inventory mutation tied to successful payment rather than checkout creation.

## Alternatives considered

- In-memory deduplication only:
  - Fails across restarts and multi-instance deployment.
- Provider-specific idempotency implementations in each route:
  - Duplicates logic and increases drift risk.

## Data contracts or schemas involved

- Parsed webhook event contract:
  - `providerId`, `eventId`, `eventType`, `occurredAt`, `outcome`, `payload`, optional `orderId/providerSessionId`.
- Idempotency table:
  - `paymentWebhookEvent(provider,eventId)` unique key.
- Transition tables:
  - `order`, `orderStatusTimeline`, `paymentAttempt`.

## Failure modes and edge cases

- Invalid signature or malformed payload.
- Event references missing/unknown order.
- Duplicate delivery with same provider-event key.
- Out-of-order provider events (pending after success).

## Observability and debugging

- Invalid events are logged through telemetry and return `400`.
- Duplicate events return explicit `idempotent: true`.
- Stored payload and event outcome support replay analysis.

## Security considerations

- Signature checks run per provider when secrets are configured.
- Live provider webhook routes fail closed when required live credentials are missing.
- No trust in client callback URLs for payment truth; webhook is authoritative.

## Tests that validate this flow

- `src/__tests__/api/payments-webhook-route.test.ts`
- `src/__tests__/payments/webhook-service.test.ts`
- `src/__tests__/api/payments-mock-complete-route.test.ts`

## Open questions or future improvements

- Add strict event ordering strategy and terminal-state protection.
- Persist structured provider payload extracts for analytics.
- Add webhook dead-letter queue for repeated parse/verification failures.
