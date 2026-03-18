import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildCanonicalUrl, createPageMetadata, getSiteBaseUrl } from "@/server/seo/metadata";

describe("seo metadata utilities", () => {
  const originalAppBaseUrl = process.env.APP_BASE_URL;
  const originalNextAuthUrl = process.env.NEXTAUTH_URL;

  beforeEach(() => {
    delete process.env.APP_BASE_URL;
    delete process.env.NEXTAUTH_URL;
  });

  afterEach(() => {
    if (originalAppBaseUrl) {
      process.env.APP_BASE_URL = originalAppBaseUrl;
    } else {
      delete process.env.APP_BASE_URL;
    }

    if (originalNextAuthUrl) {
      process.env.NEXTAUTH_URL = originalNextAuthUrl;
    } else {
      delete process.env.NEXTAUTH_URL;
    }
  });

  it("builds canonical URLs from APP_BASE_URL", () => {
    process.env.APP_BASE_URL = "https://shop.example.com";

    expect(buildCanonicalUrl("/catalog/gpu")).toBe("https://shop.example.com/catalog/gpu");
  });

  it("falls back to localhost base URL for invalid config", () => {
    process.env.APP_BASE_URL = "not-a-valid-url";

    expect(getSiteBaseUrl().toString()).toBe("http://127.0.0.1:3000/");
  });

  it("creates metadata with canonical, OG, and noindex policy", () => {
    process.env.APP_BASE_URL = "https://shop.example.com";

    const metadata = createPageMetadata({
      title: "Catalog",
      description: "Browse our products",
      pathname: "/catalog",
      type: "website",
      noIndex: true,
    });

    expect(metadata.alternates?.canonical).toBe("https://shop.example.com/catalog");
    expect(metadata.openGraph?.url).toBe("https://shop.example.com/catalog");
    expect(metadata.robots).toEqual({
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    });
  });
});
