import type { Metadata } from "next";
import { CartView } from "@/components/storefront/cart-view";
import { getSessionUser } from "@/server/auth/session";
import { createPageMetadata } from "@/server/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Cart",
  description: "Review your selected products and quantities.",
  pathname: "/cart",
  noIndex: true,
});

export default async function CartPage() {
  const user = await getSessionUser();
  return <CartView authenticated={Boolean(user)} />;
}
