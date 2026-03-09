import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { PublicPageShell } from "@/components/marketing/public-page-shell";
import { StructuredData } from "@/components/marketing/structured-data";
import { getSolutionPage, getSolutionSlugs, isSolutionSlug } from "@/lib/seo/content";
import { getBreadcrumbSchema, getOrganizationSchema, getWebPageSchema } from "@/lib/seo/schema";
import { createPublicMetadata, getLocaleUrl, type AppLocale } from "@/lib/seo/site";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getSolutionSlugs().map((slug) => ({
      locale,
      slug,
    })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!hasLocale(routing.locales, locale) || !isSolutionSlug(slug)) {
    notFound();
  }

  const content = getSolutionPage(slug, locale as AppLocale);

  return createPublicMetadata({
    locale: locale as AppLocale,
    pathname: `solutions/${slug}`,
    title: content.meta.title,
    description: content.meta.description,
    keywords: content.meta.keywords,
  });
}

export default async function SolutionPage({ params }: Props) {
  const { locale, slug } = await params;

  if (!hasLocale(routing.locales, locale) || !isSolutionSlug(slug)) {
    notFound();
  }

  setRequestLocale(locale);
  const content = getSolutionPage(slug, locale as AppLocale);

  return (
    <>
      <StructuredData
        data={[
          getOrganizationSchema(locale as AppLocale),
          getWebPageSchema({
            locale: locale as AppLocale,
            pathname: `solutions/${slug}`,
            title: content.meta.title,
            description: content.meta.description,
          }),
          getBreadcrumbSchema([
            { name: locale === "ru" ? "Главная" : "Home", url: getLocaleUrl(locale as AppLocale) },
            {
              name: content.heroTitle,
              url: getLocaleUrl(locale as AppLocale, `solutions/${slug}`),
            },
          ]),
        ]}
      />
      <PublicPageShell locale={locale as AppLocale} content={content} />
    </>
  );
}
