import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono, Rubik, Manrope } from "next/font/google";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { TourProvider } from "@/components/providers/tour-provider";
import { Toaster } from "@/components/ui/sonner";
import { homeSeoCopy } from "@/lib/seo/content";
import { createPublicMetadata, getMetadataBase, SITE_NAME, type AppLocale } from "@/lib/seo/site";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

const rubikDisplay = Rubik({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
});

const manrope = Manrope({
  variable: "--font-sans-landing",
  subsets: ["latin", "cyrillic"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = (
    hasLocale(routing.locales, locale) ? locale : routing.defaultLocale
  ) as AppLocale;
  const seo = homeSeoCopy[resolvedLocale];
  const publicMetadata = createPublicMetadata({
    locale: resolvedLocale,
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
  });

  return {
    metadataBase: getMetadataBase(),
    applicationName: SITE_NAME,
    ...publicMetadata,
    title: {
      default: seo.title,
      template: `%s | ${SITE_NAME}`,
    },
    category: "technology",
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      yandex: process.env.YANDEX_VERIFICATION,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate locale
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  return (
    <html lang={locale} dir="ltr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${rubikDisplay.variable} ${manrope.variable} antialiased`}
      >
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TourProvider>{children}</TourProvider>
            <Toaster />
            <Analytics />
            <SpeedInsights />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
