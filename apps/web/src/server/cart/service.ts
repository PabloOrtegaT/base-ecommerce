import { eq, sql } from "drizzle-orm";
import type { CartItem, CartState } from "@/features/cart/cart";
import type { CartMergeSummary } from "@/features/cart/merge-summary";
import { getDb } from "@/server/db/client";
import { cartItemsTable, cartsTable } from "@/server/db/schema";
import { getProfileRuntimeStore } from "@/server/data/runtime-store";
import { getCanonicalVariantAvailability } from "@/server/inventory/service";
import { mergeCartStates, type VariantResolution } from "./merge";

function nowDate() {
  return new Date();
}

async function getOrCreateCart(userId: string) {
  const db = getDb();
  const rows = await db.select().from(cartsTable).where(eq(cartsTable.userId, userId)).limit(1);
  const existing = rows[0];
  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(cartsTable)
    .values({
      id: crypto.randomUUID(),
      userId,
      createdAt: nowDate(),
      updatedAt: nowDate(),
    })
    .returning();

  if (!created) {
    throw new Error("Could not create cart.");
  }
  return created;
}

function mapCartItemRowToCartItem(row: typeof cartItemsTable.$inferSelect): CartItem {
  return {
    productId: row.productId,
    variantId: row.variantId,
    name: row.name,
    variantName: row.variantName,
    href: row.href,
    currency: row.currency as "MXN" | "USD",
    unitPriceCents: row.unitPriceCents,
    stockOnHand: row.stockOnHand,
    quantity: row.quantity,
    ...(row.unavailableReason ? { unavailableReason: row.unavailableReason } : {}),
  };
}

export async function getUserCart(userId: string): Promise<CartState> {
  const snapshot = await getUserCartSnapshot(userId);
  return snapshot.cart;
}

export async function getUserCartSnapshot(userId: string): Promise<{
  cart: CartState;
  version: number;
}> {
  const db = getDb();
  const cart = await getOrCreateCart(userId);
  const rows = await db.select().from(cartItemsTable).where(eq(cartItemsTable.cartId, cart.id));

  return {
    cart: {
      items: rows.map(mapCartItemRowToCartItem),
    },
    version: cart.updatedAt.getTime(),
  };
}

export async function replaceUserCart(
  userId: string,
  cart: CartState,
): Promise<{ version: number }> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const cartRows = await tx
      .select()
      .from(cartsTable)
      .where(eq(cartsTable.userId, userId))
      .limit(1);
    let cartRow = cartRows[0];
    if (!cartRow) {
      const [created] = await tx
        .insert(cartsTable)
        .values({
          id: crypto.randomUUID(),
          userId,
          createdAt: nowDate(),
          updatedAt: nowDate(),
        })
        .returning();
      if (!created) {
        throw new Error("Could not create cart.");
      }
      cartRow = created;
    }
    const cartId = cartRow.id;
    await tx.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cartId));

    if (cart.items.length > 0) {
      const updatedAt = nowDate();
      await tx
        .insert(cartItemsTable)
        .values(
          cart.items.map((line) => ({
            cartId,
            variantId: line.variantId,
            productId: line.productId,
            name: line.name,
            variantName: line.variantName,
            href: line.href,
            currency: line.currency,
            unitPriceCents: line.unitPriceCents,
            stockOnHand: line.stockOnHand,
            quantity: line.quantity,
            unavailableReason: line.unavailableReason,
            updatedAt,
          })),
        )
        .onConflictDoUpdate({
          target: [cartItemsTable.cartId, cartItemsTable.variantId],
          set: {
            productId: sql`excluded."productId"`,
            name: sql`excluded."name"`,
            variantName: sql`excluded."variantName"`,
            href: sql`excluded."href"`,
            currency: sql`excluded."currency"`,
            unitPriceCents: sql`excluded."unitPriceCents"`,
            stockOnHand: sql`excluded."stockOnHand"`,
            quantity: sql`excluded."quantity"`,
            unavailableReason: sql`excluded."unavailableReason"`,
            updatedAt,
          },
        });
    }

    const now = nowDate();
    await tx
      .update(cartsTable)
      .set({
        updatedAt: now,
      })
      .where(eq(cartsTable.id, cartId));

    return { version: now.getTime() };
  });
}

async function resolveVariantFromCanonicalCatalog(variantId: string): Promise<VariantResolution> {
  const store = getProfileRuntimeStore();
  const variant = store.variants.find((entry) => entry.id === variantId);
  if (!variant) {
    return {
      status: "unavailable",
      reason: "Variant not found.",
    };
  }

  const product = store.products.find((entry) => entry.id === variant.productId);
  if (!product) {
    return {
      status: "unavailable",
      reason: "Product not found.",
    };
  }

  const category = store.categories.find((entry) => entry.id === product.categoryId);
  const href = category ? `/catalog/${category.slug}/${product.slug}` : `/catalog`;
  const availability = await getCanonicalVariantAvailability(variantId);
  if (
    product.status !== "active" ||
    !availability.isPurchasable ||
    availability.availableToSell <= 0
  ) {
    return {
      status: "unavailable",
      reason: availability.reason ?? "Variant is out of stock.",
      fallbackItem: {
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        variantName: variant.name,
        href,
        currency: product.currency,
        unitPriceCents: variant.priceCents,
        stockOnHand: availability.availableToSell,
        unavailableReason: availability.reason ?? "Variant is out of stock.",
      },
    };
  }

  return {
    status: "available",
    item: {
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      variantName: variant.name,
      href,
      currency: product.currency,
      unitPriceCents: variant.priceCents,
      stockOnHand: availability.availableToSell,
    },
    stockOnHand: availability.availableToSell,
  };
}

export async function reconcileCartState(cart: CartState): Promise<{
  cart: CartState;
  summary: CartMergeSummary;
}> {
  return mergeCartStates({
    guestCart: cart,
    serverCart: { items: [] },
    resolveVariant: resolveVariantFromCanonicalCatalog,
  });
}

export async function getVariantAvailability(variantId: string) {
  const availability = await getCanonicalVariantAvailability(variantId);
  return {
    variantId,
    stockOnHand: availability.stockOnHand,
    availableToSell: availability.availableToSell,
    isPurchasable: availability.isPurchasable,
    ...(availability.reason ? { reason: availability.reason } : {}),
  };
}

export async function mergeGuestCartIntoUserCart(
  userId: string,
  guestCart: CartState,
): Promise<{
  cart: CartState;
  summary: CartMergeSummary;
  version: number;
}> {
  const existing = await getUserCartSnapshot(userId);
  const merged = await mergeCartStates({
    guestCart,
    serverCart: existing.cart,
    resolveVariant: resolveVariantFromCanonicalCatalog,
  });
  const replaceResult = await replaceUserCart(userId, merged.cart);
  return {
    ...merged,
    version: replaceResult.version,
  };
}

export async function getActiveUserCount() {
  const db = getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(cartsTable)
    .limit(1);
  return Number(rows[0]?.count ?? 0);
}
