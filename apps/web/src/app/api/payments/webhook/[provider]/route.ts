import { NextResponse } from "next/server";
import { resolveProviderFromWebhookRoute } from "@/server/payments/provider";
import { processPaymentWebhookEvent } from "@/server/payments/webhook-service";
import { trackError } from "@/server/observability/telemetry";

type WebhookRouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

export async function POST(request: Request, context: WebhookRouteContext) {
  const params = await context.params;
  try {
    const provider = resolveProviderFromWebhookRoute(params.provider);
    const event = await provider.parseWebhookEvent(request);
    const result = await processPaymentWebhookEvent(event);

    if (result.kind === "duplicate") {
      return NextResponse.json({
        received: true,
        idempotent: true,
        eventId: result.eventId,
      });
    }

    return NextResponse.json({
      received: true,
      idempotent: false,
      eventId: result.eventId,
      orderId: result.orderId,
      outcome: result.outcome,
    });
  } catch (error) {
    trackError("api.payments.webhook.post", error, {
      provider: params.provider,
    });
    return NextResponse.json({ error: "Invalid payment webhook event." }, { status: 400 });
  }
}
