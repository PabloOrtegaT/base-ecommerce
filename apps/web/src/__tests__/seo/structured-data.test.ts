import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildProductJsonLd } from "@/server/seo/structured-data";

describe("seo structured data", () => {
  const originalAppBaseUrl = process.env.APP_BASE_URL;

  beforeEach(() => {
    process.env.APP_BASE_URL = "https://shop.example.com";
  });

  afterEach(() => {
    if (originalAppBaseUrl) {
      process.env.APP_BASE_URL = originalAppBaseUrl;
    } else {
      delete process.env.APP_BASE_URL;
    }
  });

  it("builds breadcrumb JSON-LD with absolute URLs", () => {
    const jsonLd = buildBreadcrumbJsonLd([
      { name: "Home", pathname: "/" },
      { name: "Catalog", pathname: "/catalog" },
    ]);

    const list = jsonLd.itemListElement;
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://shop.example.com/",
    });
    expect(list[1]?.item).toBe("https://shop.example.com/catalog");
  });

  it("builds product JSON-LD with formatted price and stock availability", () => {
    const jsonLd = buildProductJsonLd({
      name: "RTX 5090",
      description: "High-end GPU",
      pathname: "/catalog/gpu/rtx-5090",
      currency: "USD",
      priceCents: 259999,
      stockOnHand: 0,
    });

    expect(jsonLd.offers.price).toBe("2599.99");
    expect(jsonLd.offers.availability).toBe("https://schema.org/OutOfStock");
    expect(jsonLd.offers.url).toBe("https://shop.example.com/catalog/gpu/rtx-5090");
  });

  it("builds article JSON-LD payload", () => {
    const jsonLd = buildArticleJsonLd({
      headline: "Big Sale",
      description: "All GPUs discounted",
      pathname: "/#news-1",
    });

    expect(jsonLd.headline).toBe("Big Sale");
    expect(jsonLd.url).toBe("https://shop.example.com/#news-1");
    expect(jsonLd.publisher).toEqual({
      "@type": "Organization",
      name: "Base Ecommerce",
    });
  });
});
