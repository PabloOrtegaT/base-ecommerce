import { describe, expect, it } from "vitest";
import { defaultStoreProfile, resolveStoreProfile } from "@cannaculture/domain";

describe("store profile contract", () => {
  it("falls back to plant-seeds when no value is provided", () => {
    expect(resolveStoreProfile(undefined)).toBe(defaultStoreProfile);
    expect(resolveStoreProfile(null)).toBe(defaultStoreProfile);
    expect(defaultStoreProfile).toBe("plant-seeds");
  });

  it("accepts plant-seeds", () => {
    expect(resolveStoreProfile("plant-seeds")).toBe("plant-seeds");
  });

  it("rejects unsupported profile values", () => {
    expect(() => resolveStoreProfile("pc-components")).toThrow();
    expect(() => resolveStoreProfile("prints-3d")).toThrow();
    expect(() => resolveStoreProfile("mixed-store")).toThrow();
  });
});
