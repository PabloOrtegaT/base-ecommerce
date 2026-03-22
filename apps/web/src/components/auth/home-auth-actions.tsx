"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutDashboard, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/features/cart/cart-store";
import { runSingleFlight } from "@/lib/single-flight";

type ViewerResponse = {
  authenticated: boolean;
  isAdmin?: boolean;
};

export function HomeAuthActions() {
  const [viewer, setViewer] = useState<ViewerResponse | null>(null);
  const setCartAuthState = useCartStore((state) => state.setAuthState);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const payload = await runSingleFlight<ViewerResponse | null>("auth-viewer", async () => {
          const response = await fetch("/api/auth/viewer", { method: "GET", cache: "no-store" });
          if (!response.ok) return null;
          return (await response.json()) as ViewerResponse;
        });
        if (!active) return;
        if (!payload) {
          setCartAuthState(false);
          setViewer({ authenticated: false });
          return;
        }
        setCartAuthState(payload.authenticated);
        setViewer(payload);
      } catch {
        if (active) {
          setCartAuthState(false);
          setViewer({ authenticated: false });
        }
      }
    };
    void run();
    return () => { active = false; };
  }, [setCartAuthState]);

  return (
    <>
      {viewer?.isAdmin && (
        <Button asChild variant="outline">
          <a href="/admin">
            <LayoutDashboard className="h-4 w-4" />
            Admin
          </a>
        </Button>
      )}
      <Button asChild variant={viewer?.authenticated ? "outline" : "secondary"}>
        <Link href={viewer?.authenticated ? "/account" : "/login"}>
          <User className="h-4 w-4" />
          {viewer?.authenticated ? "My account" : "Sign in"}
        </Link>
      </Button>
    </>
  );
}
