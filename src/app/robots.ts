import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site";

const blockedPaths = [
  "/api/",
  "/dashboard",
  "/en/dashboard",
  "/ru/dashboard",
  "/login",
  "/signup",
  "/en/login",
  "/en/signup",
  "/ru/login",
  "/ru/signup",
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: blockedPaths,
      },
      {
        userAgent: "Yandex",
        allow: "/",
        disallow: blockedPaths,
        crawlDelay: 2,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
