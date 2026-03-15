import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { getUserCart, replaceUserCart } from "@/server/cart/service";
import { cartStateSchema, normalizeParsedCartState } from "@/server/cart/validation";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cart = await getUserCart(user.id);
  return NextResponse.json({ cart });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = cartStateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cart payload." }, { status: 400 });
  }

  const cart = normalizeParsedCartState(parsed.data);
  await replaceUserCart(user.id, cart);
  return NextResponse.json({ cart });
}
