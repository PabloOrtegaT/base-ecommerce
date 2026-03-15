import type { Page } from "@playwright/test";

type LoginOptions = {
  nextPath?: string;
};

export async function loginAsSeedOwner(page: Page, options: LoginOptions = {}) {
  const nextPath = options.nextPath ?? "/cart";
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  await page.getByLabel("Email").fill("owner@base-ecommerce.local");
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();

  if (nextPath.startsWith("/admin")) {
    await page.waitForURL(/\/(auth\/after-login|admin)(?:\/|\?|$)/, { timeout: 30000 });
    if (!page.url().includes("/admin")) {
      await page.waitForURL(/\/admin(?:\/|\?|$)/, { timeout: 30000 });
    }
    return;
  }

  await page.waitForURL(/\/(auth\/after-login|auth\/sync-cart|cart)(?:\/|\?|$)/, { timeout: 30000 });
  if (!page.url().includes("/cart")) {
    await page.waitForURL(/\/cart(?:\/|\?|$)/, { timeout: 30000 });
  }
}
