import { couponSchema, type Coupon, type Currency } from "@base-ecommerce/domain";
import { getStorefrontSeed, type StorefrontSeed } from "./storefront-db";

export type AdminOrderStatus = "pending" | "paid" | "shipped" | "cancelled";

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: AdminOrderStatus;
  totalCents: number;
  currency: Currency;
  itemCount: number;
  productLabel: string;
  createdAt: string;
};

export type ProfileRuntimeStore = StorefrontSeed & {
  coupons: Coupon[];
  orders: AdminOrder[];
};

function cloneStorefrontSeed(seed: StorefrontSeed): StorefrontSeed {
  return {
    categories: structuredClone(seed.categories),
    products: structuredClone(seed.products),
    variants: structuredClone(seed.variants),
    newsPosts: structuredClone(seed.newsPosts),
    promoBanners: structuredClone(seed.promoBanners),
    featuredSales: structuredClone(seed.featuredSales),
  };
}

function createCouponSeed(): Coupon[] {
  const sharedDates = {
    startsAt: "2026-03-01T00:00:00.000Z",
    endsAt: "2026-12-31T23:59:59.000Z",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  };

  return [
    couponSchema.parse({
      id: crypto.randomUUID(),
      code: "PLANT10",
      type: "percentage",
      target: "subtotal",
      percentageOff: 10,
      startsAt: sharedDates.startsAt,
      endsAt: sharedDates.endsAt,
      usageLimit: 100,
      usageCount: 0,
      isActive: true,
      createdAt: sharedDates.createdAt,
      updatedAt: sharedDates.updatedAt,
    }),
    couponSchema.parse({
      id: crypto.randomUUID(),
      code: "PLANT150",
      type: "fixed",
      target: "subtotal",
      amountOffCents: 15000,
      currency: "MXN",
      startsAt: sharedDates.startsAt,
      endsAt: sharedDates.endsAt,
      usageLimit: 30,
      usageCount: 0,
      isActive: true,
      createdAt: sharedDates.createdAt,
      updatedAt: sharedDates.updatedAt,
    }),
  ];
}

function createOrderSeed(seed: StorefrontSeed): AdminOrder[] {
  const primaryProduct = seed.products[0];
  const label = primaryProduct ? primaryProduct.name : "Catalog item";
  const currency = primaryProduct ? primaryProduct.currency : "MXN";
  const variantCount = seed.variants.length === 0 ? 1 : seed.variants.length;

  return [
    {
      id: crypto.randomUUID(),
      orderNumber: "ORD-1001",
      status: "paid",
      totalCents: (primaryProduct?.priceCents ?? 10000) * 2,
      currency,
      itemCount: Math.min(2, variantCount),
      productLabel: label,
      createdAt: "2026-03-03T09:00:00.000Z",
    },
    {
      id: crypto.randomUUID(),
      orderNumber: "ORD-1002",
      status: "pending",
      totalCents: primaryProduct?.priceCents ?? 10000,
      currency,
      itemCount: 1,
      productLabel: label,
      createdAt: "2026-03-06T17:20:00.000Z",
    },
    {
      id: crypto.randomUUID(),
      orderNumber: "ORD-1003",
      status: "shipped",
      totalCents: Math.round((primaryProduct?.priceCents ?? 10000) * 1.3),
      currency,
      itemCount: 1,
      productLabel: label,
      createdAt: "2026-03-09T12:45:00.000Z",
    },
  ];
}

function createRuntimeStore(): ProfileRuntimeStore {
  const seed = cloneStorefrontSeed(getStorefrontSeed());
  return {
    ...seed,
    coupons: createCouponSeed(),
    orders: createOrderSeed(seed),
  };
}

let runtimeStore = createRuntimeStore();

export function getProfileRuntimeStore(): ProfileRuntimeStore {
  return runtimeStore;
}

export function resetRuntimeStore() {
  runtimeStore = createRuntimeStore();
}
