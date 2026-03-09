import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { PublicPageShell } from "@/components/marketing/public-page-shell";
import { StructuredData } from "@/components/marketing/structured-data";
import { getTrustPage } from "@/lib/seo/content";
import { getBreadcrumbSchema, getOrganizationSchema, getWebPageSchema } from "@/lib/seo/schema";
import {
  createPublicMetadata,
  getLocaleUrl,
  getSupportEmail,
  type AppLocale,
} from "@/lib/seo/site";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const content = getTrustPage("privacy", locale as AppLocale, getSupportEmail());

  return createPublicMetadata({
    locale: locale as AppLocale,
    pathname: "privacy",
    title: content.meta.title,
    description: content.meta.description,
    keywords: content.meta.keywords,
  });
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const content = getTrustPage("privacy", locale as AppLocale, getSupportEmail());

  return (
    <>
      <StructuredData
        data={[
          getOrganizationSchema(locale as AppLocale),
          getWebPageSchema({
            locale: locale as AppLocale,
            pathname: "privacy",
            title: content.meta.title,
            description: content.meta.description,
            pageType: "PrivacyPolicy",
          }),
          getBreadcrumbSchema([
            { name: locale === "ru" ? "Главная" : "Home", url: getLocaleUrl(locale as AppLocale) },
            {
              name: locale === "ru" ? "Конфиденциальность" : "Privacy",
              url: getLocaleUrl(locale as AppLocale, "privacy"),
            },
          ]),
        ]}
      />
      <PublicPageShell locale={locale as AppLocale} content={content} />
    </>
  );
}
