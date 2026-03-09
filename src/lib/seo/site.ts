import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

export type AppLocale = (typeof routing.locales)[number];

export const SITE_NAME = "Teleflow";

const DEFAULT_SITE_URL = "https://telegram-content-os.vercel.app";

const OG_LOCALE_BY_LOCALE: Record<AppLocale, string> = {
  en: "en_US",
  ru: "ru_RU",
};

const OG_IMAGE_BY_LOCALE: Record<AppLocale, string> = {
  en: "/og/teleflow-en.svg",
  ru: "/og/teleflow-ru.svg",
};

export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;

  if (!configuredUrl) {
    return DEFAULT_SITE_URL;
  }

  const normalizedUrl = configuredUrl.startsWith("http")
    ? configuredUrl
    : `https://${configuredUrl}`;

  return normalizedUrl.replace(/\/+$/, "");
}

export function getMetadataBase() {
  return new URL(getSiteUrl());
}

export function getAbsoluteUrl(pathname = "/") {
  return new URL(pathname, `${getSiteUrl()}/`).toString();
}

export function getLocalePath(locale: AppLocale, pathname = "") {
  const normalizedPath = pathname ? pathname.replace(/^\/+/, "") : "";
  return normalizedPath ? `/${locale}/${normalizedPath}` : `/${locale}`;
}

export function getLocaleUrl(locale: AppLocale, pathname = "") {
  return getAbsoluteUrl(getLocalePath(locale, pathname));
}

export function getLocaleAlternates(pathname = "") {
  return {
    en: getLocaleUrl("en", pathname),
    ru: getLocaleUrl("ru", pathname),
    "x-default": getLocaleUrl("ru", pathname),
  } as const;
}

export function getLocaleOgImage(locale: AppLocale) {
  return getAbsoluteUrl(OG_IMAGE_BY_LOCALE[locale]);
}

export function getSupportEmail() {
  return process.env.SUPPORT_EMAIL?.trim() || undefined;
}

export function createPublicMetadata({
  locale,
  pathname = "",
  title,
  description,
  keywords,
  type = "website",
}: {
  locale: AppLocale;
  pathname?: string;
  title: string;
  description: string;
  keywords?: string[];
  type?: "article" | "website";
}): Metadata {
  const pageUrl = getLocaleUrl(locale, pathname);
  const imageUrl = getLocaleOgImage(locale);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: pageUrl,
      languages: getLocaleAlternates(pathname),
    },
    openGraph: {
      type,
      title,
      description,
      url: pageUrl,
      locale: OG_LOCALE_BY_LOCALE[locale],
      siteName: SITE_NAME,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
