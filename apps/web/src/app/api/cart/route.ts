import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { getUserCart, reconcileCartState, replaceUserCart } from "@/server/cart/service";
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

  const requestedCart = normalizeParsedCartState(parsed.data);
  const reconciled = await reconcileCartState(requestedCart);
  await replaceUserCart(user.id, reconciled.cart);
  return NextResponse.json(reconciled);
}
