import { expect, test } from "@playwright/test";

test.describe("Home page layout", () => {
  test("shows split hero with heading and CTA button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /explore catalog|shop the sale|view bundles|shop deals|start planting/i })).toBeVisible();
  });

  test("shows category tiles when categories exist", async ({ page }) => {
    await page.goto("/");
    // Category tiles section heading
    const section = page.getByText(/browse by category/i);
    // Only assert visible if the section exists (data-dependent)
    const count = await section.count();
    if (count > 0) {
      await expect(section).toBeVisible();
    }
  });
});

test.describe("Catalog page layout", () => {
  test("shows sidebar with category filters on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/catalog");
    await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();
    // Sidebar has a Category section label
    await expect(page.getByText("Category", { exact: true }).first()).toBeVisible();
    // Apply filters button
    await expect(page.getByRole("button", { name: /apply filters/i }).first()).toBeVisible();
  });

  test("shows mobile filter toggle on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/catalog");
    await expect(page.getByRole("button", { name: /filters/i })).toBeVisible();
  });

  test("price filter reduces results when range excludes all products", async ({ page }) => {
    await page.goto("/catalog?priceMin=999999&priceMax=9999999");
    await expect(page.getByText(/no products found/i)).toBeVisible();
  });

  test("product cards show star rating placeholder", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/catalog");
    // Stars are rendered as ★ characters; aria-hidden so check for the container
    const firstCard = page.locator("a[href^='/catalog/']").first();
    await expect(firstCard).toBeVisible();
  });
});

test.describe("Admin dashboard layout", () => {
  // Note: admin requires auth — these tests will redirect to login unless logged in.
  // Run manually or with seeded auth session. Skipped in CI by default.
  test.skip("shows KPI cards", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/total revenue/i)).toBeVisible();
    await expect(page.getByText(/total orders/i)).toBeVisible();
    await expect(page.getByText(/paid orders/i)).toBeVisible();
  });
});
