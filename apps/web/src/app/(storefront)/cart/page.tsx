import type { Metadata } from "next";
import { CartView } from "@/components/storefront/cart-view";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Cart | Base Ecommerce",
  description: "Review your selected products and quantities.",
};

export default async function CartPage() {
  const user = await getSessionUser();
  return <CartView authenticated={Boolean(user)} />;
}
