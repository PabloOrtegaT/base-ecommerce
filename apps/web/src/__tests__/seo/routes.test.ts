import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { listCategoriesMock, listCatalogProductsMock } = vi.hoisted(() => ({
  listCategoriesMock: vi.fn(),
  listCatalogProductsMock: vi.fn(),
}));

vi.mock("@/server/data/storefront-service", () => ({
  listCategories: listCategoriesMock,
  listCatalogProducts: listCatalogProductsMock,
}));

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("seo robots and sitemap routes", () => {
  const originalAppBaseUrl = process.env.APP_BASE_URL;

  beforeEach(() => {
    process.env.APP_BASE_URL = "https://shop.example.com";
    listCategoriesMock.mockReturnValue([
      { id: "cat-1", slug: "gpus", name: "GPUs" },
    ]);
    listCatalogProductsMock.mockReturnValue([
      {
        category: { id: "cat-1", slug: "gpus", name: "GPUs" },
        product: {
          id: "prod-1",
          slug: "rtx-5090",
          updatedAt: "2026-03-18T00:00:00.000Z",
        },
      },
    ]);
  });

  afterEach(() => {
    if (originalAppBaseUrl) {
      process.env.APP_BASE_URL = originalAppBaseUrl;
    } else {
      delete process.env.APP_BASE_URL;
    }
  });

  it("generates robots policy with sitemap and disallow rules", () => {
    const route = robots();
    const firstRule = Array.isArray(route.rules) ? route.rules[0] : route.rules;
    const disallow = firstRule?.disallow;
    const allow = firstRule?.allow;
    const disallowList = Array.isArray(disallow) ? disallow : disallow ? [disallow] : [];
    const allowList = Array.isArray(allow) ? allow : allow ? [allow] : [];

    expect(route.host).toBe("https://shop.example.com");
    expect(route.sitemap).toEqual(["https://shop.example.com/sitemap.xml"]);
    expect(disallowList).toContain("/admin");
    expect(allowList).toContain("/catalog");
  });

  it("generates sitemap entries for base, categories, and products", () => {
    const entries = sitemap();

    expect(entries.some((entry) => entry.url === "https://shop.example.com/")).toBe(true);
    expect(entries.some((entry) => entry.url === "https://shop.example.com/catalog")).toBe(true);
    expect(entries.some((entry) => entry.url === "https://shop.example.com/catalog/gpus")).toBe(true);
    expect(entries.some((entry) => entry.url === "https://shop.example.com/catalog/gpus/rtx-5090")).toBe(true);
  });
});
