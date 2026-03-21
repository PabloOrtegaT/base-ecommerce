import { z } from "zod";

export const checkoutProviderSchema = z.enum(["card", "mercadopago", "paypal"]);
export type CheckoutProvider = z.infer<typeof checkoutProviderSchema>;

export const paymentProviderIdSchema = z.enum([
  "mock-card",
  "mock-mercadopago",
  "mock-paypal",
  "stripe",
  "mercadopago",
  "paypal",
]);
export type PaymentProviderId = z.infer<typeof paymentProviderIdSchema>;

export const orderStatusSchema = z.enum([
  "pending_payment",
  "paid",
  "payment_failed",
  "cancelled",
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const paymentStatusSchema = z.enum(["pending", "succeeded", "failed", "cancelled"]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export type CheckoutTotals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  itemCount: number;
  currency: "MXN" | "USD";
};

export type OrderCouponSnapshot = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  target: "subtotal";
  percentageOff?: number;
  amountOffCents?: number;
  currency?: "MXN" | "USD";
};

export type CheckoutPaymentSession = {
  providerId: PaymentProviderId;
  sessionId: string;
  checkoutUrl: string;
  expiresAt?: Date;
};

export type CheckoutSessionCreateInput = {
  orderId: string;
  orderNumber: string;
  totals: CheckoutTotals;
  successUrl: string;
  cancelUrl: string;
  customerEmail: string;
};

export type PaymentWebhookEvent = {
  providerId: PaymentProviderId;
  eventId: string;
  eventType: string;
  occurredAt: Date;
  orderId?: string;
  providerSessionId?: string;
  paymentReference?: string;
  outcome: "succeeded" | "failed" | "cancelled" | "pending";
  payload: string;
};
