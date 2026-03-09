import type { MetadataRoute } from "next";
import { getSolutionSlugs } from "@/lib/seo/content";
import { routing } from "@/i18n/routing";
import { getLocaleUrl } from "@/lib/seo/site";

const PUBLIC_PATHS = [
  "",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  ...getSolutionSlugs().map((slug) => `/solutions/${slug}`),
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routing.locales.flatMap((locale) =>
    PUBLIC_PATHS.map((path) => ({
      url: getLocaleUrl(locale, path),
      lastModified,
      changeFrequency: path === "" ? "weekly" : "monthly",
      priority: path === "" ? 1 : 0.7,
      alternates: {
        languages: {
          en: getLocaleUrl("en", path),
          ru: getLocaleUrl("ru", path),
        },
      },
    })),
  );
}
