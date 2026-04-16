import { afterEach, describe, expect, it } from "vitest";
import { listCatalogProducts, listCategories } from "@/server/data/storefront-service";

const previousStoreProfile = process.env.STORE_PROFILE;

function restoreStoreProfileEnv() {
  if (previousStoreProfile === undefined) {
    delete process.env.STORE_PROFILE;
    return;
  }

  process.env.STORE_PROFILE = previousStoreProfile;
}

describe("storefront profile", () => {
  afterEach(() => {
    restoreStoreProfileEnv();
  });

  it("uses plant-seeds as the default profile when STORE_PROFILE is missing", () => {
    delete process.env.STORE_PROFILE;

    const categories = listCategories();
    expect(categories.length).toBeGreaterThan(1);
    expect(categories.some((c) => c.templateKey === "seed-packet")).toBe(true);
    expect(categories.some((c) => c.templateKey === "grow-light")).toBe(true);
  });

  it("returns multi-family plant catalog when STORE_PROFILE is set to plant-seeds", () => {
    process.env.STORE_PROFILE = "plant-seeds";

    const categories = listCategories();
    expect(categories.length).toBeGreaterThan(1);
    expect(categories.some((c) => c.templateKey === "seed-packet")).toBe(true);

    const products = listCatalogProducts();
    expect(products.length).toBeGreaterThan(0);
    const templateKeys = new Set(
      products.map((entry) => entry.category?.templateKey).filter(Boolean),
    );
    expect(templateKeys.size).toBeGreaterThan(1);
  });

  it("fails fast for invalid STORE_PROFILE values", () => {
    process.env.STORE_PROFILE = "invalid-profile";

    expect(() => listCategories()).toThrow(/Invalid STORE_PROFILE/);
  });
});
