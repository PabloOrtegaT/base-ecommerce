import { describe, expect, it } from "vitest";
import {
  createPageMetadata,
  SEO_BRAND_NAME,
  SEO_BRAND_SUMMARY_ES,
  SEO_BRAND_TAGLINE_ES,
} from "@/server/seo/metadata";
import { buildArticleJsonLd } from "@/server/seo/structured-data";

describe("SEO branding identity", () => {
  it("uses Cannaculture as the metadata brand", () => {
    const metadata = createPageMetadata({
      title: "Inicio",
      description: SEO_BRAND_SUMMARY_ES,
      pathname: "/",
    });

    expect(SEO_BRAND_NAME).toBe("Cannaculture");
    expect(SEO_BRAND_TAGLINE_ES).toBe("Todo para cultivo indoor: semillas, luces y sustratos.");
    expect(metadata.openGraph?.siteName).toBe("Cannaculture");
  });

  it("uses Cannaculture in article structured data", () => {
    const article = buildArticleJsonLd({
      headline: "Guía de cultivo indoor",
      description: "Cómo empezar tu cultivo interior con buen sustrato y luz.",
      pathname: "/",
    });

    expect(article.author.name).toBe("Cannaculture");
    expect(article.publisher.name).toBe("Cannaculture");
  });
});
