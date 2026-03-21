CREATE TABLE IF NOT EXISTS "order" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending_payment',
  "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
  "paymentProvider" TEXT,
  "paymentSessionId" TEXT,
  "paymentReference" TEXT,
  "currency" TEXT NOT NULL,
  "subtotalCents" INTEGER NOT NULL,
  "discountCents" INTEGER NOT NULL DEFAULT 0,
  "shippingCents" INTEGER NOT NULL DEFAULT 0,
  "totalCents" INTEGER NOT NULL,
  "itemCount" INTEGER NOT NULL,
  "couponCode" TEXT,
  "couponSnapshot" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "order_order_number_unique" ON "order" ("orderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "order_payment_session_unique" ON "order" ("paymentSessionId");
CREATE INDEX IF NOT EXISTS "order_user_created_at_idx" ON "order" ("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "orderItem" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "variantName" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "unitPriceCents" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "lineTotalCents" INTEGER NOT NULL,
  "unavailableReason" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("orderId") REFERENCES "order" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "order_item_order_idx" ON "orderItem" ("orderId");

CREATE TABLE IF NOT EXISTS "orderStatusTimeline" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "orderId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "actorType" TEXT NOT NULL DEFAULT 'system',
  "actorId" TEXT,
  "note" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("orderId") REFERENCES "order" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "order_status_timeline_order_created_idx" ON "orderStatusTimeline" ("orderId", "createdAt");

CREATE TABLE IF NOT EXISTS "paymentAttempt" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerSessionId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'created',
  "checkoutUrl" TEXT,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("orderId") REFERENCES "order" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempt_provider_session_unique" ON "paymentAttempt" ("provider", "providerSessionId");
CREATE INDEX IF NOT EXISTS "payment_attempt_order_idx" ON "paymentAttempt" ("orderId");

CREATE TABLE IF NOT EXISTS "paymentWebhookEvent" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "orderId" TEXT,
  "payload" TEXT NOT NULL,
  "outcome" TEXT NOT NULL DEFAULT 'received',
  "receivedAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "processedAt" INTEGER,
  FOREIGN KEY ("orderId") REFERENCES "order" ("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_webhook_event_provider_event_unique" ON "paymentWebhookEvent" ("provider", "eventId");
CREATE INDEX IF NOT EXISTS "payment_webhook_event_order_idx" ON "paymentWebhookEvent" ("orderId");
