import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { LandingPage } from "@/components/marketing/landing-page";
import { StructuredData } from "@/components/marketing/structured-data";
import { homeSeoCopy } from "@/lib/seo/content";
import {
  getBreadcrumbSchema,
  getFaqSchema,
  getOrganizationSchema,
  getSoftwareApplicationSchema,
  getWebsiteSchema,
} from "@/lib/seo/schema";
import { createPublicMetadata, getLocaleUrl, type AppLocale } from "@/lib/seo/site";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; error_description?: string; message?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = (
    hasLocale(routing.locales, locale) ? locale : routing.defaultLocale
  ) as AppLocale;
  const seo = homeSeoCopy[resolvedLocale];

  return createPublicMetadata({
    locale: resolvedLocale,
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
  });
}

export default async function Home({ params, searchParams }: Props) {
  const [{ locale }, searchParamsResolved] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  if (searchParamsResolved.error || searchParamsResolved.error_description) {
    const error = searchParamsResolved.error_description || searchParamsResolved.error;
    redirect(`/${locale}/login?error=${encodeURIComponent(error || "Authentication error")}`);
  }

  const faqT = await getTranslations({ locale, namespace: "landing.faq.items" });
  const faqKeys = ["voice", "workflow", "billing", "team"] as const;

  return (
    <>
      <StructuredData
        data={[
          getOrganizationSchema(locale as AppLocale),
          getWebsiteSchema(locale as AppLocale),
          getSoftwareApplicationSchema(locale as AppLocale),
          getBreadcrumbSchema([
            {
              name: locale === "ru" ? "Главная" : "Home",
              url: getLocaleUrl(locale as AppLocale),
            },
          ]),
          getFaqSchema(
            faqKeys.map((key) => ({
              question: faqT(`${key}.question`),
              answer: faqT(`${key}.answer`),
            })),
          ),
        ]}
      />
      <LandingPage locale={locale as AppLocale} />
    </>
  );
}
