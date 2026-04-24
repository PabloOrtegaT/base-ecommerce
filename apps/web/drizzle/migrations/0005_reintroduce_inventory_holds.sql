-- Migration: 0005_reintroduce_inventory_holds
-- Purpose: Add inventoryHold table for short-term stock reservation during checkout

CREATE TABLE "inventoryHold" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "orderId" TEXT NOT NULL REFERENCES "order"("id") ON DELETE CASCADE,
  "variantId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "expiresAt" INTEGER NOT NULL,
  "createdAt" INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX "inventory_hold_order_idx" ON "inventoryHold"("orderId");
CREATE INDEX "inventory_hold_expires_at_idx" ON "inventoryHold"("expiresAt");
