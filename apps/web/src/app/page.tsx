import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-10">

      {/* ── Hero ─────────────────────────────────────────────── */}
      {/* Mirrors the catalog page-header pattern:               */}
      {/* amber label → heading row → border-b                  */}
      <div className="border-b pb-8">


        <div className="flex flex-wrap items-start justify-between gap-x-12 gap-y-6">
          {/* Left: editorial headline + CTA */}
          <div
            className="space-y-4 animate-fade-in-up"
            style={{ animationDelay: "60ms" }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05]">
              Quality products,
              <br />
              <span className="font-normal italic text-primary">delivered fast.</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Browse our curated catalog. Fast shipping, easy returns.
            </p>
            <Button asChild>
              <Link href="/catalog">
                Explore catalog <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Right: sale chip + account quick-access           */}
          {/* Aligns to the right the same way the catalog     */}
          {/* pushes its product count to the right.           */}
          <div
            className="flex flex-col items-start gap-3 animate-fade-in-up"
            style={{ animationDelay: "120ms" }}
          >
            {home.activeBanner && (
              <Link
                href={home.activeBanner.ctaHref ?? "/catalog"}
                className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/8 px-4 py-2 text-xs font-medium transition-colors hover:border-primary"
              >
                <Tag className="h-3 w-3 text-primary shrink-0" />
                <span>{home.activeBanner.title}</span>
                <ArrowUpRight className="h-3 w-3 text-muted-foreground shrink-0" />
              </Link>
            )}
            <div className="flex flex-wrap gap-2">
              <HomeAuthActions />
            </div>
          </div>
        </div>
      </div>

      {/* ── Featured products ─────────────────────────────────── */}
      {home.featuredProducts.length > 0 && (
        <section className="space-y-5">
          <div className="border-b pb-4">
            <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">
              Handpicked
            </p>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-3xl font-bold tracking-tight">Featured products</h2>
              <Button variant="ghost" asChild className="shrink-0">
                <Link href="/catalog">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {home.featuredProducts.map((featured) => {
              const cardData = catalogProducts.find((e) => e.product.id === featured.id);
              if (!cardData || !cardData.category) return null;
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

      {/* ── Latest news ───────────────────────────────────────── */}
      {home.news.length > 0 && (
        <section className="space-y-5">
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
                className="rounded-md border bg-card p-6 transition-shadow hover:shadow-sm"
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
