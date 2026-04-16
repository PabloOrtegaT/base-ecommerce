import { describe, expect, it } from "vitest";
import { getRelatedCategoryLinks, getRelatedProductLinks } from "@/features/catalog/related-links";

describe("related-links", () => {
  it("prioritizes categories with the same template key", () => {
    const categories = [
      { id: "seed", name: "Semillas", slug: "semillas", templateKey: "seed-packet" },
      { id: "lights", name: "Luces", slug: "luces", templateKey: "grow-light" },
      { id: "substrates", name: "Sustratos", slug: "sustratos", templateKey: "soil-substrate" },
      {
        id: "fert",
        name: "Fertilizantes",
        slug: "fertilizantes",
        templateKey: "liquid-fertilizer",
      },
      {
        id: "seed-tools",
        name: "Bandejas de germinación",
        slug: "bandejas-germinacion",
        templateKey: "seed-packet",
      },
    ];

    const result = getRelatedCategoryLinks({
      categories,
      currentCategoryId: "seed",
      currentTemplateKey: "seed-packet",
      limit: 3,
    });

    expect(result.map((entry) => entry.id)).toEqual(["seed-tools", "fert", "lights"]);
  });

  it("returns related products excluding the current product", () => {
    const products = [
      { id: "p1", name: "Semilla Albahaca", slug: "semilla-albahaca" },
      { id: "p2", name: "Semilla Tomate", slug: "semilla-tomate" },
      { id: "p3", name: "Semilla Cilantro", slug: "semilla-cilantro" },
    ];

    const result = getRelatedProductLinks({
      products,
      currentProductId: "p2",
      limit: 2,
    });

    expect(result.map((entry) => entry.id)).toEqual(["p1", "p3"]);
  });
});
