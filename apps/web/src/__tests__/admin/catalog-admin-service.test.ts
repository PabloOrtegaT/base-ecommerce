import { beforeEach, describe, expect, it } from "vitest";
import {
  createAdminProduct,
  createAdminVariant,
  listAdminCategories,
  listAdminProducts,
  updateAdminCategory,
  updateAdminProduct,
  updateAdminVariant,
} from "@/server/admin/admin-service";
import { resetRuntimeStore } from "@/server/data/runtime-store";

describe("admin catalog service", () => {
  beforeEach(() => {
    resetRuntimeStore();
  });

  it("updates categories and supports expanded product/variant fields", () => {
    const [category] = listAdminCategories();
    expect(category).toBeDefined();
    if (!category) {
      return;
    }

    const updatedCategory = updateAdminCategory({
      id: category.id,
      name: `${category.name} Updated`,
      slug: `${category.slug}-updated`,
      description: "Updated category description",
    });
    expect(updatedCategory.slug).toContain("-updated");

    const createdProduct = createAdminProduct({
      name: "Admin Service Product",
      slug: "admin-service-product",
      description: "Product description",
      categoryId: category.id,
      baseSku: "ADMIN_SERVICE_PRODUCT",
      priceCents: 1000,
      compareAtPriceCents: 1200,
      stockOnHand: 4,
      tags: ["test", "admin"],
      currency: "MXN",
      status: "active",
    });

    const updatedProduct = updateAdminProduct({
      id: createdProduct.id,
      name: "Admin Service Product Updated",
      slug: "admin-service-product-updated",
      description: "Updated description",
      categoryId: category.id,
      baseSku: "ADMIN_SERVICE_PRODUCT_UPDATED",
      priceCents: 1400,
      compareAtPriceCents: 1800,
      tags: ["updated"],
      currency: "USD",
      status: "active",
    });
    expect(updatedProduct.baseSku).toBe("ADMIN_SERVICE_PRODUCT_UPDATED");
    expect(updatedProduct.tags).toEqual(["updated"]);
    expect(updatedProduct.currency).toBe("USD");

    const updatedProductRow = listAdminProducts().find((product) => product.id === createdProduct.id);
    expect(updatedProductRow?.compareAtPriceCents).toBe(1800);

    const createdVariant = createAdminVariant({
      productId: createdProduct.id,
      sku: "ADMIN_SERVICE_VARIANT",
      name: "Bundle",
      priceCents: 1500,
      compareAtPriceCents: 2000,
      stockOnHand: 2,
      isDefault: false,
    });

    const updatedVariant = updateAdminVariant({
      id: createdVariant.id,
      sku: "ADMIN_SERVICE_VARIANT_UPDATED",
      name: "Bundle Updated",
      priceCents: 1600,
      compareAtPriceCents: 2100,
      stockOnHand: 1,
      isDefault: false,
    });
    expect(updatedVariant.sku).toBe("ADMIN_SERVICE_VARIANT_UPDATED");
    expect(updatedVariant.compareAtPriceCents).toBe(2100);
  });
});
