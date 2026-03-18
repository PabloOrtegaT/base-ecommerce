import type { Metadata } from "next";

function getRawBaseUrl() {
  return process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://127.0.0.1:3000";
}

export function getSiteBaseUrl() {
  const raw = getRawBaseUrl();
  try {
    return new URL(raw);
  } catch {
    return new URL("http://127.0.0.1:3000");
  }
}

export function buildCanonicalUrl(pathname: string) {
  return new URL(pathname, getSiteBaseUrl()).toString();
}

type PageMetadataInput = {
  title: string;
  description: string;
  pathname: string;
  type?: "website" | "article";
  noIndex?: boolean;
};

export function createPageMetadata(input: PageMetadataInput): Metadata {
  const canonical = buildCanonicalUrl(input.pathname);
  const type = input.type ?? "website";

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical,
    },
    openGraph: {
      type,
      title: input.title,
      description: input.description,
      url: canonical,
      siteName: "Base Ecommerce",
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
    },
    ...(input.noIndex
      ? {
          robots: {
            index: false,
            follow: false,
            googleBot: {
              index: false,
              follow: false,
            },
          },
        }
      : {}),
  };
}
