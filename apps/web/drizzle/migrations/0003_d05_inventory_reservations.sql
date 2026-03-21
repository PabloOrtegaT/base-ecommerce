ALTER TABLE "order" ADD COLUMN "inventoryHoldExpiresAt" INTEGER;

CREATE TABLE IF NOT EXISTS "inventoryStock" (
  "variantId" TEXT PRIMARY KEY NOT NULL,
  "onHandQty" INTEGER NOT NULL,
  "availableQty" INTEGER NOT NULL,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS "inventory_stock_available_idx" ON "inventoryStock" ("availableQty");

CREATE TABLE IF NOT EXISTS "inventoryReservation" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "orderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "expiresAt" INTEGER NOT NULL,
  "releasedReason" TEXT,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  "updatedAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  FOREIGN KEY ("orderId") REFERENCES "order" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "inventory_reservation_order_idx" ON "inventoryReservation" ("orderId");
CREATE INDEX IF NOT EXISTS "inventory_reservation_variant_status_idx" ON "inventoryReservation" ("variantId", "status");
CREATE INDEX IF NOT EXISTS "inventory_reservation_expires_status_idx" ON "inventoryReservation" ("expiresAt", "status");
