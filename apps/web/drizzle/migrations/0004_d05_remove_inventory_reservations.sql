UPDATE "inventoryStock"
SET "availableQty" = CASE
  WHEN "onHandQty" > 0 THEN "onHandQty"
  ELSE 0
END;

UPDATE "order"
SET "status" = "paid"
WHERE "status" = "payment_review_required"
  AND "paymentStatus" = "succeeded";

UPDATE "order"
SET "status" = "pending_payment"
WHERE "status" = "payment_review_required"
  AND "paymentStatus" <> "succeeded";

DROP TABLE IF EXISTS "inventoryReservation";

PRAGMA foreign_keys = OFF;

CREATE TABLE "__order_rebuild" (
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

INSERT INTO "__order_rebuild" (
  "id",
  "userId",
  "orderNumber",
  "status",
  "paymentStatus",
  "paymentProvider",
  "paymentSessionId",
  "paymentReference",
  "currency",
  "subtotalCents",
  "discountCents",
  "shippingCents",
  "totalCents",
  "itemCount",
  "couponCode",
  "couponSnapshot",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "userId",
  "orderNumber",
  "status",
  "paymentStatus",
  "paymentProvider",
  "paymentSessionId",
  "paymentReference",
  "currency",
  "subtotalCents",
  "discountCents",
  "shippingCents",
  "totalCents",
  "itemCount",
  "couponCode",
  "couponSnapshot",
  "createdAt",
  "updatedAt"
FROM "order";

DROP TABLE "order";
ALTER TABLE "__order_rebuild" RENAME TO "order";

CREATE UNIQUE INDEX "order_order_number_unique" ON "order" ("orderNumber");
CREATE UNIQUE INDEX "order_payment_session_unique" ON "order" ("paymentSessionId");
CREATE INDEX "order_user_created_at_idx" ON "order" ("userId", "createdAt");

PRAGMA foreign_keys = ON;
