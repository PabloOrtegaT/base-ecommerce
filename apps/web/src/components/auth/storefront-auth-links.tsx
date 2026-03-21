"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/features/cart/cart-store";
import type { CartState } from "@/features/cart/cart";
import { runSingleFlight } from "@/lib/single-flight";

type ViewerResponse = {
  authenticated: boolean;
  email?: string;
  role?: "owner" | "manager" | "catalog";
  isAdmin?: boolean;
};

export function StorefrontAuthLinks() {
  const [viewer, setViewer] = useState<ViewerResponse | null>(null);
  const setCartAuthState = useCartStore((state) => state.setAuthState);
  const hydrateCart = useCartStore((state) => state.hydrateCart);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const payload = await runSingleFlight<ViewerResponse | null>("auth-viewer", async () => {
          const response = await fetch("/api/auth/viewer", {
            method: "GET",
            cache: "no-store",
          });
          if (!response.ok) {
            return null;
          }
          return (await response.json()) as ViewerResponse;
        });
        if (!active) {
          return;
        }
        if (!payload) {
          setCartAuthState(false);
          setViewer({ authenticated: false });
          return;
        }
        setCartAuthState(payload.authenticated);
        if (payload.authenticated) {
          const cartSnapshot = await runSingleFlight<{ cart: CartState; version: number } | null>(
            "cart-snapshot",
            async () => {
              const cartResponse = await fetch("/api/cart", {
                method: "GET",
                cache: "no-store",
              });
              if (!cartResponse.ok) {
                return null;
              }
              return (await cartResponse.json()) as { cart: CartState; version: number };
            },
          );

          if (active && cartSnapshot) {
            hydrateCart(cartSnapshot.cart, { version: cartSnapshot.version });
          }
        }
        setViewer(payload);
      } catch {
        if (active) {
          setCartAuthState(false);
          setViewer({ authenticated: false });
        }
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [hydrateCart, setCartAuthState]);

  if (!viewer || !viewer.authenticated) {
    return (
      <Link href="/login" className="hover:underline">
        Login
      </Link>
    );
  }

  return (
    <>
      <Link href="/account" className="hover:underline">
        Account
      </Link>
      <Link href="/logout" className="hover:underline">
        Logout
      </Link>
      {viewer.isAdmin && (
        <a href="/admin" className="hover:underline">
          Admin
        </a>
      )}
    </>
  );
}
