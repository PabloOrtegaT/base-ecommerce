import Link from "next/link";
import { StorefrontAuthLinks } from "@/components/auth/storefront-auth-links";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default async function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          {/* Wordmark — Playfair Display italic, amber accent on second word */}
          <Link href="/" className="flex items-center gap-px leading-none select-none">
            <span className="font-display text-xl font-bold tracking-tight">Base</span>
            <span className="font-display text-xl font-normal italic text-primary tracking-tight">Commerce</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm">
            <Link
              href="/catalog"
              className="relative text-muted-foreground transition-colors hover:text-foreground after:absolute after:-bottom-px after:left-0 after:h-px after:w-0 after:bg-primary after:transition-all hover:after:w-full"
            >
              Catalog
            </Link>
          </nav>

          <div className="flex items-center gap-1">
            <StorefrontAuthLinks />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
