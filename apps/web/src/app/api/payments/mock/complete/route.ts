import { z } from "zod";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { processPaymentWebhookEvent } from "@/server/payments/webhook-service";

const mockCompletePayloadSchema = z.object({
  orderId: z.string().uuid(),
  providerSessionId: z.string().min(1),
  providerId: z.enum(["mock-card", "mock-mercadopago", "mock-paypal"]).default("mock-card"),
  outcome: z.enum(["succeeded", "failed", "cancelled"]),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = mockCompletePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const eventId = `mock_${parsed.data.providerSessionId}_${parsed.data.outcome}`;
  const eventType = `mock.checkout.${parsed.data.outcome}`;
  const result = await processPaymentWebhookEvent({
    providerId: parsed.data.providerId,
    eventId,
    eventType,
    occurredAt: new Date(),
    orderId: parsed.data.orderId,
    providerSessionId: parsed.data.providerSessionId,
    outcome: parsed.data.outcome,
    payload: JSON.stringify({
      eventId,
      eventType,
      orderId: parsed.data.orderId,
      providerSessionId: parsed.data.providerSessionId,
      outcome: parsed.data.outcome,
    }),
  });

  return NextResponse.json({
    received: true,
    result,
  });
}
