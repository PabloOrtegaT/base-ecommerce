import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: cspReportOnly,
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@base-ecommerce/domain", "@base-ecommerce/ui", "@base-ecommerce/validation"],
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "storefront.lvh.me",
    "admin.lvh.me",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

initOpenNextCloudflareForDev();

export default nextConfig;
