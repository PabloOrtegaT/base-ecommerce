import { NextResponse } from "next/server";
import { getVariantAvailability } from "@/server/cart/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const variantId = searchParams.get("variantId")?.trim();
  if (!variantId) {
    return NextResponse.json({ error: "Missing variantId." }, { status: 400 });
  }

  const availability = await getVariantAvailability(variantId);
  return NextResponse.json(availability);
}
