import { expect, test } from "@playwright/test";
import { loginAsSeedOwner } from "./helpers/auth";

test("guest cart merges into authenticated cart after login", async ({ page }) => {
  await page.goto("/catalog");
  await page.getByRole("link", { name: "View product" }).first().click();
  await page.getByTestId("add-to-cart").click();

  await loginAsSeedOwner(page);

  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.getByText("Cart merge summary")).toBeVisible();
});

