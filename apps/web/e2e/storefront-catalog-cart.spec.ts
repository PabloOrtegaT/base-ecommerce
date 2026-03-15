import { expect, test } from "@playwright/test";

test("browse -> product -> add to cart", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();

  await page.getByRole("link", { name: "View product" }).first().click();
  const productName = ((await page.getByRole("heading", { level: 1 }).textContent()) ?? "").trim();
  expect(productName.length).toBeGreaterThan(0);
  await expect(page.getByTestId("add-to-cart")).toBeVisible();

  await page.getByTestId("add-to-cart").click();
  await page.getByRole("link", { name: "Go to cart" }).click();

  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.getByText(productName)).toBeVisible();
});

test("stock status controls add-to-cart availability", async ({ page }) => {
  await page.goto("/catalog");
  await page.getByRole("link", { name: "View product" }).first().click();
  const stockStatus = page.getByTestId("stock-status");
  await expect(stockStatus).toBeVisible();

  const statusText = (await stockStatus.textContent()) ?? "";
  const addToCartButton = page.getByTestId("add-to-cart");

  if (statusText.toLowerCase().includes("out of stock")) {
    await expect(addToCartButton).toBeDisabled();
    return;
  }

  await expect(addToCartButton).toBeEnabled();
});
