import { describe, expect, it } from "vitest";
import { parseVariantFormAttributeValues } from "@/server/admin/variant-attributes";

describe("parseVariantFormAttributeValues", () => {
  it("parses a complete seed-packet attribute form", () => {
    const formData = new FormData();
    formData.append("attr:species", "Ocimum basilicum");
    formData.append("attr:sunlight", "full-sun");
    formData.append("attr:germination_days", "8");
    formData.append("attr:seasonality", "spring");
    formData.append("attr:is_heirloom", "on");

    const result = parseVariantFormAttributeValues(formData, "seed-packet");
    expect(result).toEqual({
      species: "Ocimum basilicum",
      sunlight: "full-sun",
      germination_days: 8,
      seasonality: "spring",
      is_heirloom: true,
    });
  });

  it("omits optional boolean attributes when unchecked", () => {
    const formData = new FormData();
    formData.append("attr:species", "Solanum lycopersicum");
    formData.append("attr:sunlight", "partial-shade");
    formData.append("attr:germination_days", "10");

    const result = parseVariantFormAttributeValues(formData, "seed-packet");
    expect(result).toEqual({
      species: "Solanum lycopersicum",
      sunlight: "partial-shade",
      germination_days: 10,
    });
    expect(result).not.toHaveProperty("is_heirloom");
  });

  it("throws when a required attribute is missing", () => {
    const formData = new FormData();
    formData.append("attr:sunlight", "full-sun");
    formData.append("attr:germination_days", "8");

    expect(() => parseVariantFormAttributeValues(formData, "seed-packet")).toThrow(
      'Missing required attribute "species"',
    );
  });

  it("throws when a number attribute is invalid", () => {
    const formData = new FormData();
    formData.append("attr:species", "Ocimum basilicum");
    formData.append("attr:sunlight", "full-sun");
    formData.append("attr:germination_days", "not-a-number");

    expect(() => parseVariantFormAttributeValues(formData, "seed-packet")).toThrow(
      'Attribute "germination_days" must be a valid finite number',
    );
  });

  it("rejects non-finite numbers like Infinity", () => {
    const formData = new FormData();
    formData.append("attr:species", "Ocimum basilicum");
    formData.append("attr:sunlight", "full-sun");
    formData.append("attr:germination_days", "Infinity");

    expect(() => parseVariantFormAttributeValues(formData, "seed-packet")).toThrow(
      'Attribute "germination_days" must be a valid finite number',
    );
  });

  it("throws when an enum value is invalid", () => {
    const formData = new FormData();
    formData.append("attr:species", "Ocimum basilicum");
    formData.append("attr:sunlight", "moonlight");
    formData.append("attr:germination_days", "8");

    expect(() => parseVariantFormAttributeValues(formData, "seed-packet")).toThrow(
      "sunlight must be one of",
    );
  });

  it("rejects unknown attributes due to strict schema", () => {
    const formData = new FormData();
    formData.append("attr:species", "Ocimum basilicum");
    formData.append("attr:sunlight", "full-sun");
    formData.append("attr:germination_days", "8");
    formData.append("attr:unknown_prop", "not allowed");

    expect(() => parseVariantFormAttributeValues(formData, "seed-packet")).toThrow();
  });

  it("rejects non-string form values such as files", () => {
    const formData = new FormData();
    formData.append("attr:species", "Ocimum basilicum");
    formData.append("attr:sunlight", "full-sun");
    formData.append("attr:germination_days", "8");
    formData.append("attr:is_heirloom", new Blob(["x"]) as unknown as string);

    expect(() => parseVariantFormAttributeValues(formData, "seed-packet")).toThrow(
      'Attribute "is_heirloom" must be a text value',
    );
  });

  it("parses a grow-light template correctly", () => {
    const formData = new FormData();
    formData.append("attr:wattage", "100");
    formData.append("attr:spectrum", "full-spectrum");
    formData.append("attr:coverage_area_m2", "2.5");
    formData.append("attr:dimmable", "on");
    formData.append("attr:bulb_type", "led");

    const result = parseVariantFormAttributeValues(formData, "grow-light");
    expect(result).toEqual({
      wattage: 100,
      spectrum: "full-spectrum",
      coverage_area_m2: 2.5,
      dimmable: true,
      bulb_type: "led",
    });
  });

  it("throws when required attributes are missing for any template", () => {
    const formData = new FormData();
    expect(() => parseVariantFormAttributeValues(formData, "grow-light")).toThrow(
      'Missing required attribute "wattage"',
    );
  });
});
