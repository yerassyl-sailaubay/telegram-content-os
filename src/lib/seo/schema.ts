import { getAbsoluteUrl, getLocaleUrl, getSiteUrl, SITE_NAME, type AppLocale } from "./site";

type JsonLd = Record<string, unknown>;

type BreadcrumbItem = {
  name: string;
  url: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

export function getOrganizationSchema(locale: AppLocale): JsonLd {
  const supportEmail = process.env.SUPPORT_EMAIL?.trim();

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: getSiteUrl(),
    logo: getAbsoluteUrl("/og/teleflow-en.svg"),
    description:
      locale === "ru"
        ? "Teleflow помогает владельцам Telegram-каналов собирать идеи, писать посты, планировать публикации и разбирать аналитику в одном рабочем процессе."
        : "Teleflow helps Telegram channel owners capture ideas, draft posts, schedule publishing, and review analytics in one workflow.",
    ...(supportEmail
      ? {
          contactPoint: [
            {
              "@type": "ContactPoint",
              email: supportEmail,
              contactType: locale === "ru" ? "поддержка клиентов" : "customer support",
            },
          ],
        }
      : {}),
  };
}

export function getWebsiteSchema(locale: AppLocale): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: getSiteUrl(),
    inLanguage: locale,
  };
}

export function getSoftwareApplicationSchema(locale: AppLocale): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: getSiteUrl(),
    inLanguage: locale,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      locale === "ru"
        ? "Контент-система для Telegram-авторов: сбор идей, генерация черновиков, планирование публикаций и аналитика."
        : "A Telegram content operating system for capture, drafting, scheduling, and analytics.",
  };
}

export function getFaqSchema(items: FaqItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function getBreadcrumbSchema(items: BreadcrumbItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function getWebPageSchema({
  locale,
  pathname,
  title,
  description,
  pageType = "WebPage",
}: {
  locale: AppLocale;
  pathname?: string;
  title: string;
  description: string;
  pageType?: "AboutPage" | "ContactPage" | "PrivacyPolicy" | "TermsOfService" | "WebPage";
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": pageType,
    name: title,
    description,
    url: getLocaleUrl(locale, pathname),
    inLanguage: locale,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: getSiteUrl(),
    },
  };
}
