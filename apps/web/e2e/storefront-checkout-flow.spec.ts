import { expect, test, type Page } from "@playwright/test";
import { loginAsSeedOwner } from "./helpers/auth";

async function addFirstInStockProduct(page: Page) {
  await page.goto("/catalog");
  const productHrefs = await page.locator('a[href^="/catalog/"]').evaluateAll((elements) => {
    const hrefs = elements
      .map((element) => element.getAttribute("href") ?? "")
      .filter((href) => /^\/catalog\/[^/?#]+\/[^/?#]+$/.test(href));
    return Array.from(new Set(hrefs));
  });

  for (const href of productHrefs) {
    await page.goto(href);
    const addToCartButton = page.getByTestId("add-to-cart");
    await expect(addToCartButton).toBeVisible();

    const stockStatusText = (
      (await page.getByTestId("stock-status").textContent()) ?? ""
    ).toLowerCase();
    if (stockStatusText.includes("out of stock")) {
      await page.goto("/catalog");
      continue;
    }

    try {
      await expect(addToCartButton).toBeEnabled({ timeout: 10000 });
      const selectedProductName =
        ((await page.getByRole("heading", { level: 1 }).first().textContent()) ?? "").trim() ||
        "Catalog item";
      await addToCartButton.click();
      return { selectedProductName };
    } catch {
      await page.goto("/catalog");
    }
  }

  throw new Error("No purchasable product found in catalog.");
}

test("authenticated checkout -> mock payment success -> order confirmation", async ({ page }) => {
  // Add a product to guest cart
  const { selectedProductName } = await addFirstInStockProduct(page);

  // Login (this triggers cart sync)
  await loginAsSeedOwner(page);
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();

  // Verify cart has items
  const subtotalText = await page.getByText("Subtotal:").textContent();
  expect(subtotalText).toBeTruthy();

  // Start checkout
  const checkoutButton = page.getByRole("button", { name: "Continue to payment" });
  await expect(checkoutButton).toBeEnabled({ timeout: 10000 });
  await checkoutButton.click();

  // Should be redirected to mock checkout page
  await page.waitForURL((url) => url.pathname.startsWith("/checkout/mock"), {
    timeout: 15000,
  });

  // Simulate successful payment
  const successButton = page.getByRole("button", { name: "Simulate payment success" });
  await expect(successButton).toBeVisible();
  await successButton.click();

  // Should be redirected to success page
  await page.waitForURL((url) => url.pathname.startsWith("/checkout/success"), {
    timeout: 15000,
  });
  await expect(page.getByRole("heading", { name: "Payment successful!" })).toBeVisible();
  await expect(page.getByText("Order reference:")).toBeVisible();

  const orderReference =
    ((await page.locator("p.font-mono").first().textContent()) ?? "").trim() || undefined;
  await expect(page.getByText(selectedProductName, { exact: false })).toBeVisible();

  // Navigate to account page and verify order exists
  await page.getByRole("link", { name: "View my orders" }).click();
  await page.waitForURL((url) => url.pathname === "/account", { timeout: 10000 });
  await expect(page.getByRole("heading", { name: "My account" })).toBeVisible();
  await expect(page.getByText("paid", { exact: false }).first()).toBeVisible({ timeout: 10000 });
  if (orderReference) {
    await expect(page.getByText(orderReference, { exact: false }).first()).toBeVisible();
  }

  // Verify order visibility in admin orders as owner
  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  if (orderReference) {
    await expect(page.getByText(orderReference, { exact: false }).first()).toBeVisible();
  }
  await expect(page.getByText(selectedProductName, { exact: false }).first()).toBeVisible();
});

test("authenticated checkout -> mock payment failure -> cancel page", async ({ page }) => {
  await addFirstInStockProduct(page);
  await loginAsSeedOwner(page);
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();

  const checkoutButton = page.getByRole("button", { name: "Continue to payment" });
  await expect(checkoutButton).toBeEnabled({ timeout: 10000 });
  await checkoutButton.click();

  await page.waitForURL((url) => url.pathname.startsWith("/checkout/mock"), {
    timeout: 15000,
  });

  const failButton = page.getByRole("button", { name: "Simulate payment failure" });
  await expect(failButton).toBeVisible();
  await failButton.click();

  await page.waitForURL((url) => url.pathname.startsWith("/checkout/cancel"), {
    timeout: 15000,
  });
  await expect(page.getByText("Order reference:", { exact: false })).toBeVisible();
});

test("invalid coupon keeps user on cart with validation error", async ({ page }) => {
  await addFirstInStockProduct(page);
  await loginAsSeedOwner(page);
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();

  await page.getByLabel("Coupon code (optional)").fill("NOTVALID");
  const checkoutButton = page.getByRole("button", { name: "Continue to payment" });
  await expect(checkoutButton).toBeEnabled({ timeout: 10000 });
  await checkoutButton.click();

  await expect(page).toHaveURL(/\/cart/);
  await expect(page.getByText("Coupon code is invalid or not applicable.")).toBeVisible();
});

test("unauthenticated user sees sign-in prompt on checkout", async ({ page }) => {
  await addFirstInStockProduct(page);
  await page.getByRole("link", { name: "Go to cart" }).click();

  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.getByText("Sign in to continue checkout")).toBeVisible();

  const checkoutButton = page.getByRole("button", { name: "Continue to payment" });
  await expect(checkoutButton).toBeDisabled();
});

test("failed checkout appears as failed order on account page", async ({ page }) => {
  await addFirstInStockProduct(page);
  await loginAsSeedOwner(page);
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();

  const checkoutButton = page.getByRole("button", { name: "Continue to payment" });
  await expect(checkoutButton).toBeEnabled({ timeout: 10000 });
  await checkoutButton.click();

  await page.waitForURL((url) => url.pathname.startsWith("/checkout/mock"), {
    timeout: 15000,
  });
  await page.getByRole("button", { name: "Simulate payment failure" }).click();

  await page.waitForURL((url) => url.pathname.startsWith("/checkout/cancel"), {
    timeout: 15000,
  });

  // Navigate to account page and verify order exists
  await page.getByRole("link", { name: "View account orders" }).click();
  await page.waitForURL((url) => url.pathname === "/account", { timeout: 10000 });
  await expect(page.getByRole("heading", { name: "My account" })).toBeVisible();

  // Should show at least one failed order
  await expect(page.getByText("payment failed", { exact: false }).first()).toBeVisible({
    timeout: 10000,
  });
});
