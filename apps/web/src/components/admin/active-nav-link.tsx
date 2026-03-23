"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type ActiveNavLinkProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
};

export function ActiveNavLink({ href, icon, label }: ActiveNavLinkProps) {
  const pathname = usePathname();
  const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-l-none rounded-r-md px-3 py-2 text-sm transition-colors border-r-2",
        isActive
          ? "border-primary bg-primary/10 text-primary font-semibold"
          : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
