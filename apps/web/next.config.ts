import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  transpilePackages: ["@base-ecommerce/domain", "@base-ecommerce/ui", "@base-ecommerce/validation"],
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "storefront.lvh.me",
    "admin.lvh.me",
  ],
};

initOpenNextCloudflareForDev();

export default nextConfig;
