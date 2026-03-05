import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; error_description?: string; message?: string }>;
};

export default async function Home({ params, searchParams }: Props) {
  const [{ locale }, searchParamsResolved] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  if (searchParamsResolved.error || searchParamsResolved.error_description) {
    const error = searchParamsResolved.error_description || searchParamsResolved.error;
    redirect(`/${locale}/login?error=${encodeURIComponent(error || "Authentication error")}`);
  }

  return <LandingPage locale={locale} />;
}

function LandingPage({ locale }: { locale: string }) {
  const t = useTranslations("landing");

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-border/50 bg-background/80 sticky top-0 z-50 border-b backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link
            href={`/${locale}`}
            className="text-foreground text-base font-semibold tracking-tight"
          >
            {t("nav.logo")}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${locale}/login`}>{t("nav.login")}</Link>
            </Button>
            <Button asChild size="sm" className="group">
              <Link href={`/${locale}/signup`}>
                {t("nav.getStarted")}
                <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <HeroSection />

        <Separator className="opacity-50" />

        <FeaturesSection />

        <Separator className="opacity-50" />

        <HowItWorksSection />

        <Separator className="opacity-50" />

        <CtaSection locale={locale} />
      </main>

      <LandingFooter locale={locale} />
    </div>
  );
}

function CtaSection({ locale }: { locale: string }) {
  const t = useTranslations("landing.cta");

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <div className="border-border bg-muted/30 rounded-2xl border px-8 py-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-balance">
            {t("subtitle")}
          </p>
          <Button asChild size="lg" className="group mt-8 h-12 px-8 text-base">
            <Link href={`/${locale}/signup`}>
              {t("button")}
              <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <p className="text-muted-foreground mt-4 text-xs">{t("note")}</p>
        </div>
      </div>
    </section>
  );
}

function LandingFooter({ locale }: { locale: string }) {
  const t = useTranslations("landing.footer");

  return (
    <footer className="border-border/50 border-t py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <p className="text-muted-foreground text-xs">{t("copyright")}</p>
        <div className="flex items-center gap-6">
          <Link
            href={`/${locale}/dashboard`}
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            {t("links.dashboard")}
          </Link>
          <Link
            href={`/${locale}/login`}
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            {t("links.login")}
          </Link>
          <Link
            href={`/${locale}/signup`}
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            {t("links.signup")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
