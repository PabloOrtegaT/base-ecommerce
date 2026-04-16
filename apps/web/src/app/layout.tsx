import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { FlashToastHost } from "@/components/feedback/flash-toast-host";
import { themeInitializationScript } from "@/features/theme/theme-script";
import { paletteInitializationScript } from "@/features/theme/palette-script";
import { popFlashToast } from "@/server/feedback/flash-toast";
import { getSiteBaseUrl, SEO_BRAND_NAME, SEO_BRAND_SUMMARY_ES } from "@/server/seo/metadata";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getSiteBaseUrl(),
  title: {
    default: SEO_BRAND_NAME,
    template: `%s | ${SEO_BRAND_NAME}`,
  },
  description: SEO_BRAND_SUMMARY_ES,
  applicationName: SEO_BRAND_NAME,
  openGraph: {
    type: "website",
    siteName: SEO_BRAND_NAME,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const flashToast = await popFlashToast();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
        <script dangerouslySetInnerHTML={{ __html: paletteInitializationScript }} />
      </head>
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        <FlashToastHost initialToast={flashToast} />
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </body>
    </html>
  );
}
