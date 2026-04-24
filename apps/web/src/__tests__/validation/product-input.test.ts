import { describe, expect, it } from "vitest";
import { productInputSchema } from "@cannaculture/validation";

describe("productInputSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = productInputSchema.parse({
      categoryId: "4f6fb94d-fb44-46eb-9885-dd8b16be6fdb",
      categoryTemplateKey: "seed-packet",
      name: "Basil Seeds Pack",
      slug: "basil-seeds-pack",
      priceCents: 9900,
      compareAtPriceCents: 12900,
      currency: "MXN",
      baseSku: "SEED-BASIL-001",
      status: "active",
      tags: ["seed", "herb"],
      attributeValues: {
        species: "Ocimum basilicum",
        sunlight: "full-sun",
        germination_days: 8,
      },
    });

    expect(parsed.name).toBe("Basil Seeds Pack");
    expect(parsed.status).toBe("active");
    expect(parsed.tags).toEqual(["seed", "herb"]);
  });

  it("rejects compareAtPriceCents when it is not greater than priceCents", () => {
    const result = productInputSchema.safeParse({
      categoryId: "4f6fb94d-fb44-46eb-9885-dd8b16be6fdb",
      categoryTemplateKey: "seed-packet",
      name: "Invalid Product",
      slug: "invalid-product",
      priceCents: 9900,
      compareAtPriceCents: 9900,
      currency: "MXN",
      baseSku: "INVALID-001",
      status: "draft",
      tags: [],
      attributeValues: {},
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected schema validation to fail.");
    }
    expect(result.error.issues[0]?.path).toContain("compareAtPriceCents");
  });
});
