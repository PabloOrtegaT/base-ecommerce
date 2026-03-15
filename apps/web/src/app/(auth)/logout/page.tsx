"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useCartStore } from "@/features/cart/cart-store";

export default function LogoutPage() {
  useEffect(() => {
    const run = async () => {
      useCartStore.getState().clearCart();
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      await signOut({ callbackUrl: "/" });
    };
    run();
  }, []);

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-10">
      <p className="text-sm text-muted-foreground">Signing out...</p>
    </main>
  );
}
