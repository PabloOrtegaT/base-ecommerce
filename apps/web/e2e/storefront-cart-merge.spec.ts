import { expect, test } from "@playwright/test";
import { loginAsSeedOwner } from "./helpers/auth";

test("guest cart merges into authenticated cart after login", async ({ page }) => {
  await page.goto("/catalog");
  const productLinks = page.getByRole("link", { name: "View product" });
  const linkCount = await productLinks.count();
  let added = false;

  for (let index = 0; index < linkCount; index += 1) {
    await productLinks.nth(index).click();
    const addToCartButton = page.getByTestId("add-to-cart");
    if (await addToCartButton.isEnabled()) {
      await addToCartButton.click();
      added = true;
      break;
    }
    await page.goto("/catalog");
  }

  expect(added).toBe(true);

  await loginAsSeedOwner(page);

  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.getByText("Cart merge summary")).toBeVisible();
});
