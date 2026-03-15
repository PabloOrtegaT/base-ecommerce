import { defineConfig, devices } from "@playwright/test";

const useCloudflarePreview = process.env.PLAYWRIGHT_USE_CF_PREVIEW === "1";
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? (useCloudflarePreview ? "http://127.0.0.1:8787" : "http://127.0.0.1:3000");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: baseUrl,
    trace: "on-first-retry",
  },
  webServer: {
    command: useCloudflarePreview
      ? "npm run db:migrate:local && npm run db:seed && npm run preview"
      : "npm run db:migrate:local && npm run db:seed && npm run dev",
    url: baseUrl,
    env: {
      ...process.env,
      APP_BASE_URL: process.env.APP_BASE_URL ?? baseUrl,
      ADMIN_BASE_URL: process.env.ADMIN_BASE_URL ?? baseUrl,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? baseUrl,
      NEXTAUTH_URL_INTERNAL: process.env.NEXTAUTH_URL_INTERNAL ?? baseUrl,
      STORE_PROFILE: process.env.STORE_PROFILE ?? "prints-3d",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "playwright-auth-secret-please-change",
      AUTH_REFRESH_TOKEN_SECRET: process.env.AUTH_REFRESH_TOKEN_SECRET ?? "playwright-refresh-secret-please-change",
    },
    reuseExistingServer: !process.env.CI,
    timeout: useCloudflarePreview ? 300000 : 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
