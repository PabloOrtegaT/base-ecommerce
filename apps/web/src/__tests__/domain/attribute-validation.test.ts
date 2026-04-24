import { describe, expect, it } from "vitest";
import { validateCategoryAttributeValues } from "@cannaculture/domain";

describe("category attribute validation", () => {
  it("accepts a valid seed-packet attribute payload", () => {
    const result = validateCategoryAttributeValues("seed-packet", {
      species: "Ocimum basilicum",
      sunlight: "full-sun",
      germination_days: 8,
      seasonality: "spring",
      is_heirloom: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid seed-packet payload", () => {
    const result = validateCategoryAttributeValues("seed-packet", {
      species: "Ocimum basilicum",
      sunlight: "full-sun",
      germination_days: -5,
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown attributes for strict typed schemas", () => {
    const result = validateCategoryAttributeValues("seed-packet", {
      species: "Ocimum basilicum",
      sunlight: "full-sun",
      germination_days: 8,
      unknown_prop: "not allowed",
    });

    expect(result.success).toBe(false);
  });
});
