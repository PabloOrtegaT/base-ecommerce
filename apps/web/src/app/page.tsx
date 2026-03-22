import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HomeAuthActions } from "@/components/auth/home-auth-actions";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { ProductCard } from "@/components/storefront/product-card";
import { getHomeContent, listCatalogProducts } from "@/server/data/storefront-service";
import { createPageMetadata } from "@/server/seo/metadata";
import { buildArticleJsonLd } from "@/server/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "News, Sales, and Featured Products",
  description: "Stay updated with latest news, active discounts, and featured products.",
  pathname: "/",
  type: "website",
});

export const revalidate = 60;

export default async function HomePage() {
  const home = getHomeContent();
  const catalogProducts = listCatalogProducts();

  return (
    <div className="space-y-16">
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-lg border bg-gradient-to-br from-secondary/80 via-secondary/30 to-background py-16 px-8 lg:px-16 lg:py-24">
        {/* Amber accent rule */}
        <div
          className="mb-7 h-px w-16 bg-primary animate-fade-in-up"
          style={{ animationDelay: "0ms" }}
        />

        <div className="max-w-2xl">
          <h1
            className="text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl animate-fade-in-up"
            style={{ animationDelay: "80ms" }}
          >
            Quality
            <br />
            products,
            <br />
            <span className="font-normal italic text-primary">delivered fast.</span>
          </h1>

          <p
            className="mt-6 max-w-sm text-base text-muted-foreground leading-relaxed animate-fade-in-up"
            style={{ animationDelay: "160ms" }}
          >
            Browse our curated catalog and find exactly what you need.
            Fast shipping, easy returns.
          </p>

          <div
            className="mt-8 flex flex-wrap items-center gap-3 animate-fade-in-up"
            style={{ animationDelay: "240ms" }}
          >
            <Button asChild size="lg">
              <Link href="/catalog">
                Explore catalog <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <HomeAuthActions />
          </div>
        </div>

        {/* Decorative large italic numeral — hidden on small screens */}
        <span
          aria-hidden
          className="absolute right-10 bottom-4 hidden select-none font-display text-[10rem] font-bold italic leading-none text-primary/8 lg:block"
        >
          ✦
        </span>
      </section>

      {/* ── Active sale banner ─────────────────────────────── */}
      {home.activeBanner && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/6 px-6 py-5">
          <div>
            <Badge variant="default" className="mb-2">
              <Tag className="mr-1 h-3 w-3" /> Sale
            </Badge>
            <h2 className="text-xl font-semibold">{home.activeBanner.title}</h2>
            {home.activeBanner.subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{home.activeBanner.subtitle}</p>
            )}
          </div>
          {home.activeBanner.ctaHref && home.activeBanner.ctaLabel && (
            <Button asChild>
              <Link href={home.activeBanner.ctaHref}>
                {home.activeBanner.ctaLabel} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </section>
      )}

      {/* ── Featured products ──────────────────────────────── */}
      {home.featuredProducts.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4 border-b pb-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">
                Handpicked
              </p>
              <h2 className="text-3xl font-bold tracking-tight">Featured products</h2>
            </div>
            <Button variant="ghost" asChild className="shrink-0">
              <Link href="/catalog">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {home.featuredProducts.map((featured) => {
              const cardData = catalogProducts.find((entry) => entry.product.id === featured.id);
              if (!cardData || !cardData.category) {
                return null;
              }
              return (
                <ProductCard
                  key={featured.id}
                  name={featured.name}
                  description={featured.description}
                  categorySlug={cardData.category.slug}
                  productSlug={featured.slug}
                  currency={featured.currency}
                  minPriceCents={cardData.minVariantPriceCents}
                  compareAtPriceCents={featured.compareAtPriceCents}
                  hasStock={cardData.hasStock}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ── Latest news ────────────────────────────────────── */}
      {home.news.length > 0 && (
        <section className="space-y-6">
          <div className="border-b pb-4">
            <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">
              Updates
            </p>
            <h2 className="text-3xl font-bold tracking-tight">Latest news</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {home.news.map((news) => (
              <article
                key={news.id}
                id={`news-${news.id}`}
                className="rounded-lg border bg-card p-6 transition-shadow hover:shadow-sm"
              >
                <h3 className="font-semibold leading-snug mb-2">{news.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{news.summary}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {home.news.map((news) => (
        <JsonLdScript
          key={`article-jsonld-${news.id}`}
          value={buildArticleJsonLd({
            headline: news.title,
            description: news.summary,
            pathname: `/#news-${news.id}`,
          })}
        />
      ))}
    </div>
  );
}
