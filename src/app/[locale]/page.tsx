import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  Droplets,
  FileText,
  ImageIcon,
  Inbox,
  LayoutDashboard,
  Linkedin,
  Mic,
  RefreshCw,
  Send,
  Share2,
  Twitter,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

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
    <div className="relative min-h-screen overflow-x-hidden bg-[#0A0A0A] font-[family-name:var(--font-sans-landing)] text-white selection:bg-[#14F1D9]/30 selection:text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#14F1D9]/10 opacity-50 blur-[120px]" />
        <div className="absolute top-0 bottom-0 left-1/2 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#14F1D9] to-transparent opacity-20" />
      </div>

      <header className="fixed top-0 right-0 left-0 z-50 border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white"
          >
            <Droplets className="size-6 fill-current text-[#14F1D9]" />
            {t("nav.logo")}
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link href="#product" className="text-[#9CA3AF] transition-colors hover:text-white">
              {t("nav.links.product")}
            </Link>
            <Link href="#systems" className="text-[#9CA3AF] transition-colors hover:text-white">
              {t("nav.links.systems")}
            </Link>
            <Link
              href="#integrations"
              className="text-[#9CA3AF] transition-colors hover:text-white"
            >
              {t("nav.links.integrations")}
            </Link>
            <Link href="#pricing" className="text-[#9CA3AF] transition-colors hover:text-white">
              {t("nav.links.pricing")}
            </Link>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="hidden sm:block [&_button]:border-white/[0.12] [&_button]:bg-transparent [&_button]:text-zinc-400 [&_button]:hover:bg-white/[0.06] [&_button]:hover:text-white">
              <LanguageSwitcher />
            </div>
            <Link
              href={`/${locale}/login`}
              className="hidden font-medium text-[#9CA3AF] transition-colors hover:text-white sm:block"
            >
              {t("nav.login")}
            </Link>
            <Link
              href={`/${locale}/signup`}
              className="rounded-full bg-white px-5 py-2 font-medium text-black transition-colors hover:bg-gray-200"
            >
              {t("nav.getStarted")}
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 pt-24">
        <HeroSection locale={locale} />
        <IntegrationsSection />
        <SystemsForScaleSection />
        <PricingSection locale={locale} />
      </main>

      <LandingFooter />
    </div>
  );
}

function HeroSection({ locale }: { locale: string }) {
  const t = useTranslations("landing.hero");

  return (
    <section id="product" className="mx-auto max-w-7xl px-6 pt-20 pb-24 text-center">
      <div className="mx-auto mb-16 max-w-4xl">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#121212]/50 px-3 py-1 text-xs font-medium text-[#9CA3AF]">
          <span className="size-2 animate-pulse rounded-full bg-[#14F1D9]" />
          {t("badge")}
        </div>

        <h1 className="mb-6 font-[family-name:var(--font-display)] text-5xl leading-tight text-white md:text-8xl">
          {t("title")}
          <br />
          <span className="text-[#9CA3AF] italic">{t("titleItalic")}</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-xl font-light text-[#9CA3AF]">{t("subtitle")}</p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={`/${locale}/signup`}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-medium text-black transition-colors hover:bg-gray-200 sm:w-auto"
          >
            {t("ctaPrimary")}
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="#systems"
            className="w-full rounded-full border border-white/10 px-8 py-4 text-center text-lg font-medium text-white transition-colors hover:bg-[#121212] sm:w-auto"
          >
            {t("ctaSecondary")}
          </Link>
        </div>
      </div>

      <FeatureLifecycle />
    </section>
  );
}

function FeatureLifecycle() {
  const t = useTranslations("landing.lifecycle");

  return (
    <div className="group relative mx-auto mt-16 max-w-5xl">
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#14F1D9]/20 to-blue-500/20 opacity-50 blur-xl transition duration-1000 group-hover:opacity-100" />
      <div className="relative rounded-2xl border border-white/10 bg-[#121212]/50 p-2 shadow-2xl backdrop-blur-xl md:p-4">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0A]">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#121212] px-4 py-3">
            <div className="flex gap-2">
              <div className="size-3 rounded-full bg-red-500/50" />
              <div className="size-3 rounded-full bg-yellow-500/50" />
              <div className="size-3 rounded-full bg-green-500/50" />
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-[#9CA3AF]">
              <Share2 className="size-3.5 text-[#14F1D9]" />
              {t("windowTitle")}
            </div>
          </div>

          <div className="relative grid grid-cols-1 gap-6 p-6 md:grid-cols-3 md:p-10">
            <div className="z-10 flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#1A1A1A] p-6 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <Send className="ml-1 size-8 text-blue-400" />
              </div>
              <h3 className="mb-1 font-medium text-white">{t("ingest.title")}</h3>
              <p className="mb-4 text-xs text-[#9CA3AF]">{t("ingest.subtitle")}</p>
              <div className="w-full rounded-lg border border-white/10 bg-[#2A2A2A] p-3 text-left text-sm">
                <p className="truncate text-xs text-[#9CA3AF]">{t("ingest.status")}</p>
              </div>
            </div>

            <div className="z-10 flex flex-col items-center justify-center rounded-xl border border-[#14F1D9]/30 bg-[#121212] p-6 shadow-[0_0_30px_rgba(20,241,217,0.1)]">
              <div className="mb-4 flex size-12 animate-pulse items-center justify-center rounded-full border border-[#14F1D9]/50 bg-[#14F1D9]/20">
                <Brain className="size-6 text-[#14F1D9]" />
              </div>
              <h3 className="mb-1 font-medium text-white">{t("ai.title")}</h3>
              <p className="mb-2 text-xs text-[#14F1D9]">{t("ai.subtitle")}</p>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-[#9CA3AF]">
                <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
                {t("ai.status")}
              </div>
            </div>

            <div className="z-10 flex flex-col gap-4">
              <PlatformStatus
                label={t("platforms.telegram")}
                icon={<Send className="ml-0.5 size-4 text-blue-400" />}
                iconWrapperClassName="border border-blue-500/30 bg-blue-500/20"
              />
              <PlatformStatus
                label={t("platforms.twitter")}
                icon={<Twitter className="size-4 text-white" />}
                iconWrapperClassName="border border-white/20 bg-white/10"
              />
              <PlatformStatus
                label={t("platforms.linkedin")}
                icon={<Linkedin className="size-4 text-blue-400" />}
                iconWrapperClassName="border border-blue-600/30 bg-blue-600/20"
              />
            </div>

            <div className="absolute top-1/2 right-[20%] left-[20%] z-0 hidden h-[2px] -translate-y-1/2 bg-gradient-to-r from-blue-500/50 via-[#14F1D9]/50 to-green-500/50 md:block" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformStatus({
  icon,
  label,
  iconWrapperClassName,
}: {
  icon: ReactNode;
  label: string;
  iconWrapperClassName: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#1A1A1A] p-3">
      <div
        className={`flex size-8 items-center justify-center rounded-full ${iconWrapperClassName}`}
      >
        {icon}
      </div>
      <div className="flex-1 text-left">
        <h3 className="text-sm font-medium text-white">{label}</h3>
      </div>
      <CheckCircle2 className="size-4 text-green-400" />
    </div>
  );
}

function IntegrationsSection() {
  const t = useTranslations("landing.integrations");

  return (
    <section
      id="integrations"
      className="relative z-10 overflow-hidden border-y border-white/10 bg-[#0A0A0A]/80 py-12 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-7xl px-6">
        <p className="mb-8 text-center font-mono text-xs tracking-[0.2em] text-[#9CA3AF] uppercase">
          {t("label")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 grayscale transition-all duration-500 hover:grayscale-0 md:gap-24">
          <IntegrationItem icon={<Send className="size-6" />} label={t("items.telegram")} />
          <IntegrationItem icon={<Twitter className="size-6" />} label={t("items.twitter")} />
          <IntegrationItem icon={<Linkedin className="size-6" />} label={t("items.linkedin")} />
        </div>
      </div>
    </section>
  );
}

function IntegrationItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-white/60">
      {icon}
      <span className="text-xl font-semibold tracking-tight">{label}</span>
    </div>
  );
}

function SystemsForScaleSection() {
  const t = useTranslations("landing.systems");

  return (
    <section id="systems" className="relative z-10 mx-auto max-w-7xl px-6 py-32">
      <div className="mb-20 text-center">
        <h2 className="mb-6 font-[family-name:var(--font-display)] text-4xl text-white md:text-6xl">
          {t("title")}
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-[#9CA3AF]">{t("subtitle")}</p>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
        <FeatureCard
          icon={<Brain className="mb-6 size-8 text-[#14F1D9]" />}
          title={t("cards.tone.title")}
          description={t("cards.tone.description")}
          content={
            <div className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0A] p-4">
              <div className="absolute top-0 right-0 bottom-0 z-10 w-32 bg-gradient-to-l from-[#0A0A0A] to-transparent" />
              <div className="flex items-center gap-3 text-sm whitespace-nowrap opacity-50">
                <Tag text={t("cards.tone.tags.casual")} />
                <Tag text={t("cards.tone.tags.jargon")} />
                <Tag text={t("cards.tone.tags.optimistic")} />
              </div>
              <div className="relative z-20 mt-2 flex items-center gap-3 text-sm">
                <CheckCircle2 className="size-4 text-[#14F1D9]" />
                <span className="rounded border border-[#14F1D9]/30 bg-[#14F1D9]/10 px-2 py-1 font-medium text-[#14F1D9]">
                  {t("cards.tone.result")}
                </span>
              </div>
            </div>
          }
        />

        <FeatureCard
          className="border-[#14F1D9]/20"
          icon={<Inbox className="mb-6 size-8 text-white" />}
          title={t("cards.ingestion.title")}
          description={t("cards.ingestion.description")}
          content={
            <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/10 bg-[#0A0A0A]/50">
              <div className="flex items-center gap-4">
                <IconBubble icon={<Mic className="size-4" />} />
                <IconBubble icon={<ImageIcon className="size-4" />} />
                <IconBubble icon={<FileText className="size-4" />} />
                <ArrowRight className="mx-2 size-4 text-[#14F1D9]" />
                <div className="flex size-12 items-center justify-center rounded-xl border border-[#14F1D9]/50 bg-[#14F1D9]/20 text-[#14F1D9]">
                  <Inbox className="size-6" />
                </div>
              </div>
            </div>
          }
        />

        <FeatureCard
          icon={<RefreshCw className="mb-6 size-8 text-white" />}
          title={t("cards.adaptation.title")}
          description={t("cards.adaptation.description")}
          content={
            <div className="mt-auto w-full rounded-xl border border-white/10 bg-[#0A0A0A] p-4">
              <div className="flex flex-col gap-2">
                <ProgressRow label={t("cards.adaptation.stepOne")} complete />
                <ProgressRow label={t("cards.adaptation.stepTwo")} loading />
              </div>
            </div>
          }
        />

        <FeatureCard
          icon={<LayoutDashboard className="mb-6 size-8 text-white" />}
          title={t("cards.dashboard.title")}
          description={t("cards.dashboard.description")}
          content={
            <div className="flex flex-1 items-end">
              <div className="relative h-24 w-full overflow-hidden rounded-t-xl border border-b-0 border-white/10 bg-[#0A0A0A] p-3">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
                <div className="absolute top-4 right-4 left-4 flex h-8 items-center gap-2 rounded border border-white/10 bg-[#121212] px-2">
                  <div className="size-2 rounded-full bg-blue-400" />
                  <div className="h-2 w-16 rounded bg-white/20" />
                </div>
                <div className="absolute top-14 right-8 left-20 flex h-8 items-center gap-2 rounded border border-[#14F1D9]/30 bg-[#14F1D9]/20 px-2">
                  <div className="size-2 rounded-full bg-[#14F1D9]" />
                  <div className="h-2 w-24 rounded bg-white/20" />
                </div>
              </div>
            </div>
          }
        />
      </div>
    </section>
  );
}

function PricingSection({ locale }: { locale: string }) {
  const t = useTranslations("landing.pricing");

  return (
    <section id="pricing" className="relative z-10 mx-auto max-w-7xl px-6 py-28">
      <div className="mb-14 text-center">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-4xl text-white md:text-6xl">
          {t("title")}
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-[#9CA3AF]">{t("subtitle")}</p>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
        <PlanCard
          name={t("plans.free.name")}
          price={t("plans.free.price")}
          period={t("period")}
          audience={t("plans.free.audience")}
          features={[
            t("plans.free.features.quota"),
            t("plans.free.features.noCard"),
            t("plans.free.features.telegram"),
          ]}
          cta={t("plans.free.cta")}
          href={`/${locale}/signup`}
        />
        <PlanCard
          featured
          name={t("plans.plus.name")}
          badge={t("plans.plus.badge")}
          price={t("plans.plus.price")}
          period={t("period")}
          audience={t("plans.plus.audience")}
          features={[
            t("plans.plus.features.quota"),
            t("plans.plus.features.generation"),
            t("plans.plus.features.crosspost"),
          ]}
          cta={t("plans.plus.cta")}
          href={`/${locale}/signup`}
        />
        <PlanCard
          name={t("plans.pro.name")}
          price={t("plans.pro.price")}
          period={t("period")}
          audience={t("plans.pro.audience")}
          features={[
            t("plans.pro.features.quota"),
            t("plans.pro.features.highVolume"),
            t("plans.pro.features.allCore"),
          ]}
          cta={t("plans.pro.cta")}
          href={`/${locale}/signup`}
        />
      </div>

      <p className="mt-8 text-center text-sm text-[#9CA3AF]">{t("stripeNote")}</p>
    </section>
  );
}

function PlanCard({
  name,
  price,
  period,
  audience,
  features,
  cta,
  href,
  badge,
  featured,
}: {
  name: string;
  price: string;
  period: string;
  audience: string;
  features: string[];
  cta: string;
  href: string;
  badge?: string;
  featured?: boolean;
}) {
  return (
    <article
      className={`relative rounded-2xl border bg-[#121212]/70 p-8 backdrop-blur-xl ${
        featured ? "border-[#14F1D9]/40 shadow-[0_0_35px_rgba(20,241,217,0.12)]" : "border-white/10"
      }`}
    >
      {badge ? (
        <span className="mb-4 inline-flex rounded-full border border-[#14F1D9]/30 bg-[#14F1D9]/10 px-3 py-1 text-xs font-medium text-[#14F1D9]">
          {badge}
        </span>
      ) : null}

      <h3 className="text-2xl font-semibold text-white">{name}</h3>
      <div className="mt-3 flex items-end gap-1">
        <p className="font-[family-name:var(--font-display)] text-5xl text-white">{price}</p>
        <p className="mb-1 text-sm text-[#9CA3AF]">{period}</p>
      </div>
      <p className="mt-3 text-sm text-[#9CA3AF]">{audience}</p>

      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-[#C7CDD6]">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#14F1D9]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition-colors ${
          featured
            ? "bg-[#14F1D9] text-black hover:bg-[#11d7c1]"
            : "border border-white/10 text-white hover:bg-white/10"
        }`}
      >
        {cta}
      </Link>
    </article>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  content,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  content: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-[#121212]/50 p-8 backdrop-blur-2xl ${className ?? ""}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#14F1D9]/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative z-10 flex h-full flex-col">
        {icon}
        <h3 className="mb-3 font-[family-name:var(--font-display)] text-2xl text-white">{title}</h3>
        <p className="mb-6 text-[#9CA3AF]">{description}</p>
        {content}
      </div>
    </div>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <span className="rounded border border-white/10 bg-[#121212] px-2 py-1 text-[#9CA3AF]">
      {text}
    </span>
  );
}

function IconBubble({ icon }: { icon: ReactNode }) {
  return (
    <div className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-[#121212] text-[#9CA3AF]">
      {icon}
    </div>
  );
}

function ProgressRow({
  label,
  complete,
  loading,
}: {
  label: string;
  complete?: boolean;
  loading?: boolean;
}) {
  return (
    <>
      <div className="mb-1 flex items-center justify-between text-xs text-[#9CA3AF]">
        <span>{label}</span>
        {complete ? (
          <Check className="size-3.5 text-green-400" />
        ) : (
          <RefreshCw className={`size-3.5 text-[#14F1D9] ${loading ? "animate-spin" : ""}`} />
        )}
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-[#121212]">
        <div className={`h-full ${complete ? "w-full bg-green-500" : "w-[60%] bg-[#14F1D9]"}`} />
      </div>
    </>
  );
}

function LandingFooter() {
  const t = useTranslations("landing.footer");

  return (
    <footer id="footer" className="relative z-10 border-t border-white/10 bg-[#0A0A0A] pt-24 pb-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 flex flex-col items-start justify-between gap-12 md:flex-row">
          <div className="max-w-xs">
            <div className="mb-6 flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white">
              <Droplets className="size-6 fill-current text-[#14F1D9]" />
              {t("logo")}
            </div>
            <p className="mb-6 text-sm text-[#9CA3AF]">{t("tagline")}</p>
            <div className="flex gap-4">
              <a
                href="#"
                className="text-[#9CA3AF] transition-colors hover:text-white"
                aria-label="Twitter"
              >
                <Twitter className="size-5" />
              </a>
              <a
                href="#"
                className="text-[#9CA3AF] transition-colors hover:text-white"
                aria-label="LinkedIn"
              >
                <Linkedin className="size-5" />
              </a>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-12 md:w-auto md:grid-cols-3">
            <FooterColumn
              title={t("platform.heading")}
              links={[
                t("platform.routingEngine"),
                t("platform.aiFormatting"),
                t("platform.analytics"),
                t("platform.integrations"),
              ]}
              accent
            />
            <FooterColumn
              title={t("company.heading")}
              links={[
                t("company.about"),
                t("company.careers"),
                t("company.changelog"),
                t("company.contact"),
              ]}
            />
            <FooterColumn
              className="col-span-2 md:col-span-1"
              title={t("legal.heading")}
              links={[t("legal.privacy"), t("legal.terms")]}
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-[#9CA3AF] md:flex-row">
          <p>{t("copyright")}</p>
          <div className="flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-green-500" />
            {t("status")}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
  accent,
  className,
}: {
  title: string;
  links: string[];
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <h4 className="mb-6 text-sm font-medium tracking-wider text-white uppercase">{title}</h4>
      <ul className="space-y-4 text-sm text-[#9CA3AF]">
        {links.map((link) => (
          <li key={link}>
            <a
              href="#"
              className={
                accent
                  ? "transition-colors hover:text-[#14F1D9]"
                  : "transition-colors hover:text-white"
              }
            >
              {link}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
