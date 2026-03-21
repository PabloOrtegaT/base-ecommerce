import { eq, sql } from "drizzle-orm";
import { getActiveStoreProfile } from "@/server/config/store-profile";
import { getProfileRuntimeStore } from "@/server/data/runtime-store";
import { getDb } from "@/server/db/client";
import { inventoryStocksTable, orderItemsTable } from "@/server/db/schema";

export type StockConflictLine = {
  variantId: string;
  requestedQty: number;
  availableQty: number;
  reason: string;
};

type CatalogVariantContext = {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  href: string;
  currency: "MXN" | "USD";
  unitPriceCents: number;
  variantCatalogStockOnHand: number;
  isProductActive: boolean;
};

export type VariantAvailability = {
  variantId: string;
  stockOnHand: number;
  availableToSell: number;
  reservedQty: number;
  isPurchasable: boolean;
  reason?: string;
};

type CheckoutStockValidationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      code: "insufficient_stock";
      lines: StockConflictLine[];
    };

function nowDate() {
  return new Date();
}

function normalizeQuantity(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.trunc(value));
}

function groupLines(
  lines: Array<{
    variantId: string;
    quantity: number;
  }>,
) {
  const grouped = new Map<string, number>();
  for (const line of lines) {
    const quantity = normalizeQuantity(line.quantity);
    if (!line.variantId || quantity <= 0) {
      continue;
    }
    grouped.set(line.variantId, (grouped.get(line.variantId) ?? 0) + quantity);
  }
  return Array.from(grouped.entries()).map(([variantId, quantity]) => ({
    variantId,
    quantity,
  }));
}

function findCatalogVariantContext(variantId: string): CatalogVariantContext | null {
  const profile = getActiveStoreProfile();
  const store = getProfileRuntimeStore(profile);
  const variant = store.variants.find((entry) => entry.id === variantId);
  if (!variant) {
    return null;
  }

  const product = store.products.find((entry) => entry.id === variant.productId);
  if (!product) {
    return null;
  }

  const category = store.categories.find((entry) => entry.id === product.categoryId);
  const href = category ? `/catalog/${category.slug}/${product.slug}` : "/catalog";
  return {
    productId: product.id,
    variantId: variant.id,
    productName: product.name,
    variantName: variant.name,
    href,
    currency: product.currency,
    unitPriceCents: variant.priceCents,
    variantCatalogStockOnHand: variant.stockOnHand,
    isProductActive: product.status === "active",
  };
}

async function getInventoryStockRow(variantId: string) {
  const db = getDb();
  const rows = await db.select().from(inventoryStocksTable).where(eq(inventoryStocksTable.variantId, variantId)).limit(1);
  return rows[0] ?? null;
}

async function ensureInventoryStockRow(variantId: string, catalogStockOnHand: number) {
  const db = getDb();
  const now = nowDate();
  const normalizedOnHandQty = Math.max(0, Math.trunc(catalogStockOnHand));
  await db
    .insert(inventoryStocksTable)
    .values({
      variantId,
      onHandQty: normalizedOnHandQty,
      availableQty: normalizedOnHandQty,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: inventoryStocksTable.variantId,
    });
}

export async function getCanonicalVariantAvailability(variantId: string): Promise<VariantAvailability> {
  const context = findCatalogVariantContext(variantId);
  if (!context) {
    return {
      variantId,
      stockOnHand: 0,
      availableToSell: 0,
      reservedQty: 0,
      isPurchasable: false,
      reason: "Variant not found.",
    };
  }

  await ensureInventoryStockRow(variantId, context.variantCatalogStockOnHand);
  const stockRow = await getInventoryStockRow(variantId);
  const onHandQty = Math.max(0, Number(stockRow?.onHandQty ?? context.variantCatalogStockOnHand));
  const availableToSell = Math.max(0, Number(stockRow?.availableQty ?? onHandQty));

  if (!context.isProductActive) {
    return {
      variantId,
      stockOnHand: onHandQty,
      availableToSell: 0,
      reservedQty: 0,
      isPurchasable: false,
      reason: "Product is not available.",
    };
  }

  if (availableToSell <= 0) {
    return {
      variantId,
      stockOnHand: onHandQty,
      availableToSell: 0,
      reservedQty: 0,
      isPurchasable: false,
      reason: "Variant is out of stock.",
    };
  }

  return {
    variantId,
    stockOnHand: onHandQty,
    availableToSell,
    reservedQty: 0,
    isPurchasable: true,
  };
}

export async function validateInventoryForOrder(input: {
  lines: Array<{
    variantId: string;
    quantity: number;
  }>;
}): Promise<CheckoutStockValidationResult> {
  const grouped = groupLines(input.lines);
  if (grouped.length === 0) {
    return {
      ok: false,
      code: "insufficient_stock",
      lines: [
        {
          variantId: "unknown",
          requestedQty: 0,
          availableQty: 0,
          reason: "Cart has no purchasable items.",
        },
      ],
    };
  }

  const shortages: StockConflictLine[] = [];
  for (const line of grouped) {
    const availability = await getCanonicalVariantAvailability(line.variantId);
    if (!availability.isPurchasable || availability.availableToSell < line.quantity) {
      shortages.push({
        variantId: line.variantId,
        requestedQty: line.quantity,
        availableQty: availability.availableToSell,
        reason: availability.reason ?? "Insufficient stock.",
      });
    }
  }

  if (shortages.length > 0) {
    return {
      ok: false,
      code: "insufficient_stock",
      lines: shortages,
    };
  }

  return {
    ok: true,
  };
}

export async function decrementInventoryForPaidOrder(orderId: string) {
  const db = getDb();
  const rows = await db
    .select({
      variantId: orderItemsTable.variantId,
      quantity: orderItemsTable.quantity,
    })
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId));

  if (rows.length === 0) {
    return {
      decrementedCount: 0,
    };
  }

  const now = nowDate();
  const grouped = groupLines(rows);
  for (const row of grouped) {
    const context = findCatalogVariantContext(row.variantId);
    await ensureInventoryStockRow(row.variantId, context?.variantCatalogStockOnHand ?? 0);
    await db
      .update(inventoryStocksTable)
      .set({
        onHandQty: sql`CASE
          WHEN ${inventoryStocksTable.onHandQty} > ${row.quantity}
            THEN ${inventoryStocksTable.onHandQty} - ${row.quantity}
          ELSE 0
        END`,
        availableQty: sql`CASE
          WHEN ${inventoryStocksTable.availableQty} > ${row.quantity}
            THEN ${inventoryStocksTable.availableQty} - ${row.quantity}
          ELSE 0
        END`,
        updatedAt: now,
      })
      .where(eq(inventoryStocksTable.variantId, row.variantId));
  }

  return {
    decrementedCount: grouped.length,
  };
}

export async function syncInventoryStockForVariant(variantId: string, nextOnHandQty: number) {
  const db = getDb();
  const now = nowDate();
  const normalizedOnHandQty = Math.max(0, Math.trunc(nextOnHandQty));

  await db
    .insert(inventoryStocksTable)
    .values({
      variantId,
      onHandQty: normalizedOnHandQty,
      availableQty: normalizedOnHandQty,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: inventoryStocksTable.variantId,
      set: {
        onHandQty: normalizedOnHandQty,
        availableQty: normalizedOnHandQty,
        updatedAt: now,
      },
    });
}

export async function syncInventoryFromRuntimeCatalogForVariant(variantId: string) {
  const context = findCatalogVariantContext(variantId);
  if (!context) {
    return;
  }
  await syncInventoryStockForVariant(variantId, context.variantCatalogStockOnHand);
}

export async function syncInventoryFromRuntimeCatalogForProduct(productId: string) {
  const profile = getActiveStoreProfile();
  const store = getProfileRuntimeStore(profile);
  const variants = store.variants.filter((variant) => variant.productId === productId);
  for (const variant of variants) {
    await syncInventoryStockForVariant(variant.id, variant.stockOnHand);
  }
}

export async function syncInventoryFromRuntimeCatalog() {
  const profile = getActiveStoreProfile();
  const store = getProfileRuntimeStore(profile);
  for (const variant of store.variants) {
    await syncInventoryStockForVariant(variant.id, variant.stockOnHand);
  }
}
