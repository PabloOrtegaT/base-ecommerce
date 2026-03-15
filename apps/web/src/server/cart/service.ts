import { eq, sql } from "drizzle-orm";
import type { CartItem, CartState } from "@/features/cart/cart";
import type { CartMergeSummary } from "@/features/cart/merge-summary";
import { getActiveStoreProfile } from "@/server/config/store-profile";
import { getDb } from "@/server/db/client";
import { cartItemsTable, cartsTable } from "@/server/db/schema";
import { getProfileRuntimeStore } from "@/server/data/runtime-store";
import { mergeCartStates, type VariantResolution } from "./merge";

function nowDate() {
  return new Date();
}

async function getOrCreateCartId(userId: string) {
  const db = getDb();
  const rows = await db.select().from(cartsTable).where(eq(cartsTable.userId, userId)).limit(1);
  const existing = rows[0];
  if (existing) {
    return existing.id;
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
  return created.id;
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
  const db = getDb();
  const cartId = await getOrCreateCartId(userId);
  const rows = await db.select().from(cartItemsTable).where(eq(cartItemsTable.cartId, cartId));

  return {
    items: rows.map(mapCartItemRowToCartItem),
  };
}

export async function replaceUserCart(userId: string, cart: CartState) {
  const db = getDb();
  const cartId = await getOrCreateCartId(userId);
  await db.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cartId));

  if (cart.items.length > 0) {
    for (const line of cart.items) {
      const updatedAt = nowDate();
      await db
        .insert(cartItemsTable)
        .values({
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
        })
        .onConflictDoUpdate({
          target: [cartItemsTable.cartId, cartItemsTable.variantId],
          set: {
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
          },
        });
    }
  }

  await db
    .update(cartsTable)
    .set({
      updatedAt: nowDate(),
    })
    .where(eq(cartsTable.id, cartId));
}

function resolveVariantFromActiveCatalog(variantId: string): VariantResolution {
  const profile = getActiveStoreProfile();
  const store = getProfileRuntimeStore(profile);
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

  if (product.status !== "active" || variant.stockOnHand <= 0) {
    return {
      status: "unavailable",
      reason: "Variant is out of stock.",
      fallbackItem: {
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        variantName: variant.name,
        href,
        currency: product.currency,
        unitPriceCents: variant.priceCents,
        stockOnHand: variant.stockOnHand,
        unavailableReason: "Variant is out of stock.",
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
      stockOnHand: variant.stockOnHand,
    },
    stockOnHand: variant.stockOnHand,
  };
}

export async function mergeGuestCartIntoUserCart(userId: string, guestCart: CartState): Promise<{
  cart: CartState;
  summary: CartMergeSummary;
}> {
  const existing = await getUserCart(userId);
  const merged = await mergeCartStates({
    guestCart,
    serverCart: existing,
    resolveVariant: resolveVariantFromActiveCatalog,
  });
  await replaceUserCart(userId, merged.cart);
  return merged;
}

export async function getActiveUserCount() {
  const db = getDb();
  const rows = await db.select({ count: sql<number>`count(*)` }).from(cartsTable).limit(1);
  return Number(rows[0]?.count ?? 0);
}
