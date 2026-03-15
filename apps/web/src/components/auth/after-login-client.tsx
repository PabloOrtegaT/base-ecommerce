"use client";

import { useEffect, useState } from "react";

type AfterLoginClientProps = {
  nextPath: string;
};

function normalizeNextPath(rawPath: string) {
  if (rawPath.startsWith("/")) {
    return rawPath;
  }
  return "/auth/sync-cart";
}

export function AfterLoginClient({ nextPath }: AfterLoginClientProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/auth/bootstrap", {
          method: "POST",
        });
        if (!response.ok) {
          setError("Could not initialize your session. Please try logging in again.");
          return;
        }
        window.location.replace(normalizeNextPath(nextPath));
      } catch {
        setError("Could not initialize your session. Please try logging in again.");
      }
    };

    run();
  }, [nextPath]);

  return (
    <section className="space-y-3 rounded-lg border bg-card p-6 text-card-foreground">
      <p className="text-sm font-medium">{error ? "Session initialization failed." : "Finalizing sign-in..."}</p>
      <p className="text-xs text-muted-foreground">
        {error
          ? "Use the login page again. If this persists, check environment variables and cookies."
          : "Please wait while we secure your session and redirect you."}
      </p>
    </section>
  );
}
