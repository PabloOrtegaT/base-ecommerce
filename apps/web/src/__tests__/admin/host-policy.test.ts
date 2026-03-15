import { describe, expect, it } from "vitest";
import {
  isAdminPath,
  isAllowedOnAdminHost,
  normalizeHost,
  resolveHostPolicy,
  resolveSurfaceForHost,
} from "@/server/config/host-policy";

describe("host policy", () => {
  it("normalizes host values and strips ports", () => {
    expect(normalizeHost("ADMIN.LVH.ME:3000")).toBe("admin.lvh.me");
  });

  it("resolves surface by configured hosts", () => {
    const policy = resolveHostPolicy({
      appBaseUrl: "http://storefront.lvh.me:3000",
      adminBaseUrl: "http://admin.lvh.me:3000",
    });

    expect(resolveSurfaceForHost(policy, "admin.lvh.me:3000")).toBe("admin");
    expect(resolveSurfaceForHost(policy, "storefront.lvh.me:3000")).toBe("storefront");
  });

  it("keeps admin host route boundaries", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/products")).toBe(true);
    expect(isAllowedOnAdminHost("/admin/import")).toBe(true);
    expect(isAllowedOnAdminHost("/login")).toBe(true);
    expect(isAllowedOnAdminHost("/catalog")).toBe(false);
  });
});
