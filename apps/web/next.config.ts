import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  transpilePackages: ["@base-ecommerce/domain", "@base-ecommerce/ui", "@base-ecommerce/validation"],
};

initOpenNextCloudflareForDev();

export default nextConfig;
