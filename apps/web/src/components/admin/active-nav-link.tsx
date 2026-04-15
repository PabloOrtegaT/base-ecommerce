"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type ActiveNavLinkProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  compact?: boolean;
};

export function ActiveNavLink({ href, icon, label, compact = false }: ActiveNavLinkProps) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const isActive = href === "/admin" ? currentPath === "/admin" : currentPath.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        compact
          ? "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors whitespace-nowrap border-r-2"
          : "flex items-center gap-3 rounded-l-none rounded-r-md px-3 py-2 text-sm transition-colors border-r-2",
        isActive
          ? "border-primary bg-primary/10 text-primary font-semibold"
          : "border-transparent text-nav-foreground/70 hover:bg-nav-foreground/10 hover:text-nav-foreground",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
