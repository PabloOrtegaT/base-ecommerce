import { describe, expect, it } from "vitest";
import { canAccessAdminPermission, canAccessAdminRoute } from "@/server/admin/role-guard";

describe("admin route guards", () => {
  it("owner can access all admin routes", () => {
    expect(canAccessAdminRoute("owner", "dashboard")).toBe(true);
    expect(canAccessAdminRoute("owner", "products")).toBe(true);
    expect(canAccessAdminRoute("owner", "content")).toBe(true);
    expect(canAccessAdminRoute("owner", "coupons")).toBe(true);
    expect(canAccessAdminRoute("owner", "import")).toBe(true);
  });

  it("catalog role cannot access coupon management", () => {
    expect(canAccessAdminRoute("catalog", "coupons")).toBe(false);
    expect(canAccessAdminRoute("catalog", "products")).toBe(true);
    expect(canAccessAdminRoute("catalog", "import")).toBe(true);
  });

  it("maps permissions consistently", () => {
    expect(canAccessAdminPermission("manager", "orders:write")).toBe(true);
    expect(canAccessAdminPermission("catalog", "orders:write")).toBe(false);
  });
});
