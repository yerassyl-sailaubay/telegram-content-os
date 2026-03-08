import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  CalendarRange,
  ChevronDown,
  Check,
  CheckCircle2,
  FileText,
  Layers3,
  MoveRight,
  Send,
  Sparkles,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

type LandingPageProps = {
  locale: string;
};

const sectionShell = "mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-10";
const glassCard =
  "relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] shadow-[0_24px_80px_rgba(2,8,23,0.45)] backdrop-blur-xl";

export function LandingPage({ locale }: LandingPageProps) {
  const t = useTranslations("landing");

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#06131a] font-[family-name:var(--font-sans-landing)] text-white selection:bg-[#41ffd8]/30 selection:text-white">
      <LandingBackdrop />

      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
        <nav
          className={`mx-auto flex max-w-[1240px] items-center justify-between rounded-full border border-white/10 bg-[#071118]/82 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:px-5`}
        >
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-white sm:text-xl"
          >
            <span className="flex size-9 items-center justify-center rounded-full border border-[#41ffd8]/25 bg-[#41ffd8]/10 text-[#41ffd8]">
              <Send className="size-4" />
            </span>
            {t("nav.logo")}
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-white/68 lg:flex">
            <a href="#product" className="transition-colors hover:text-white">
              {t("nav.links.product")}
            </a>
            <a href="#workflow" className="transition-colors hover:text-white">
              {t("nav.links.workflow")}
            </a>
            <a href="#proof" className="transition-colors hover:text-white">
              {t("nav.links.proof")}
            </a>
            <a href="#pricing" className="transition-colors hover:text-white">
              {t("nav.links.pricing")}
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block [&_button]:border-white/[0.12] [&_button]:bg-white/[0.03] [&_button]:text-white/78 [&_button]:hover:bg-white/[0.08] [&_button]:hover:text-white">
              <LanguageSwitcher />
            </div>
            <Link
              href={`/${locale}/login`}
              className="hidden text-sm font-medium text-white/68 transition-colors hover:text-white sm:block"
            >
              {t("nav.login")}
            </Link>
            <Link
              href={`/${locale}/signup`}
              className="inline-flex items-center justify-center rounded-full bg-[#41ffd8] px-4 py-2.5 text-sm font-semibold text-[#03262a] transition-all hover:-translate-y-0.5 hover:bg-[#6affdf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#41ffd8]"
            >
              {t("nav.getStarted")}
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 pt-28 pb-20 sm:pt-32">
        <HeroSection locale={locale} />
        <ProofSection />
        <ComparisonSection locale={locale} />
        <PricingSection locale={locale} />
        <FaqSection />
        <FinalCtaSection locale={locale} />
      </main>

      <LandingFooter locale={locale} />
    </div>
  );
}

function LandingBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#031018]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(65,255,216,0.18),transparent_26%),radial-gradient(circle_at_84%_10%,rgba(45,197,255,0.16),transparent_24%),radial-gradient(circle_at_50%_42%,rgba(8,34,44,0.62),transparent_48%),linear-gradient(180deg,#06131a_0%,#030b11_100%)]" />
      <div className="absolute inset-x-0 top-0 h-[18rem] bg-[linear-gradient(180deg,rgba(65,255,216,0.08),transparent)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.028)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.028)_1px,transparent_1px)] bg-[size:6rem_6rem] opacity-[0.045]" />
      <div className="absolute top-[22%] left-[6%] size-64 rounded-full bg-[#41ffd8]/8 blur-[120px]" />
      <div className="absolute top-[34%] right-[8%] size-72 rounded-full bg-[#2dc5ff]/7 blur-[135px]" />
      <div className="absolute bottom-[8%] left-[32%] size-80 rounded-full bg-[#0c3340]/35 blur-[160px]" />
    </div>
  );
}

function HeroSection({ locale }: { locale: string }) {
  const t = useTranslations("landing.hero");

  const steps = [
    { key: "capture", icon: <Bot className="size-5" /> },
    { key: "library", icon: <Layers3 className="size-5" /> },
    { key: "draft", icon: <Sparkles className="size-5" /> },
    { key: "edit", icon: <FileText className="size-5" /> },
    { key: "schedule", icon: <CalendarRange className="size-5" /> },
    { key: "analytics", icon: <BarChart3 className="size-5" /> },
  ] as const;

  return (
    <section id="product" className={`${sectionShell} pt-8 sm:pt-14`}>
      <div className="max-w-5xl md:mx-auto md:text-center">
        <h1 className="font-[family-name:var(--font-display)] text-[2.6rem] leading-[0.96] tracking-[-0.05em] text-white sm:text-[3.8rem] lg:text-[4.6rem]">
          {t("title")}
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-white/68 sm:text-[1.15rem] md:mx-auto">
          {t("subtitle")}
        </p>

        <div className="mt-10 md:mx-auto">
          <div className="hidden items-start justify-center gap-0 sm:flex">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-start">
                <div className="flex w-20 flex-col items-center gap-3">
                  <div className="flex size-14 items-center justify-center rounded-2xl border border-[#41ffd8]/25 bg-[#41ffd8]/10 text-[#41ffd8] shadow-[0_0_24px_rgba(65,255,216,0.12)] transition-all hover:border-[#41ffd8]/50 hover:bg-[#41ffd8]/18 hover:shadow-[0_0_36px_rgba(65,255,216,0.22)]">
                    {step.icon}
                  </div>
                  <span className="h-8 text-center text-[11px] leading-4 font-semibold tracking-[0.06em] text-white/64">
                    {t(`steps.${step.key}`)}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="mt-5 flex items-center px-1.5">
                    <div className="h-px w-6 bg-gradient-to-r from-[#41ffd8]/40 to-[#41ffd8]/15" />
                    <MoveRight className="size-3.5 text-[#41ffd8]/35" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="sm:hidden">
            <div className="grid grid-cols-3 gap-4">
              {steps.map((step, i) => (
                <div key={step.key} className="flex flex-col items-center gap-2.5">
                  <div className="relative flex size-13 items-center justify-center rounded-2xl border border-[#41ffd8]/25 bg-[#41ffd8]/10 text-[#41ffd8]">
                    {step.icon}
                    {i < steps.length - 1 && i % 3 !== 2 && (
                      <span className="absolute top-1/2 -right-3 -translate-y-1/2 text-xs text-[#41ffd8]/30">
                        →
                      </span>
                    )}
                  </div>
                  <span className="text-center text-[10px] leading-4 font-semibold tracking-[0.04em] text-white/60">
                    {t(`steps.${step.key}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center md:justify-center">
          <Link
            href={`/${locale}/signup`}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#41ffd8] px-6 py-3.5 text-base font-semibold text-[#03262a] transition-all hover:-translate-y-0.5 hover:bg-[#6affdf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#41ffd8]"
          >
            {t("ctaPrimary")}
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="#pricing"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/[0.08]"
          >
            {t("ctaSecondary")}
            <MoveRight className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function ProofSection() {
  const t = useTranslations("landing.proof");

  return (
    <section id="proof" className={`${sectionShell} mt-24 sm:mt-28`}>
      <SectionHeading label={t("label")} title={t("title")} description={t("subtitle")} />

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        <FeatureStoryCard
          icon={<Bot className="size-5" />}
          title={t("cards.telegram.title")}
          description={t("cards.telegram.description")}
          detail={t("cards.telegram.detail")}
        />
        <FeatureStoryCard
          icon={<BrainCircuit className="size-5" />}
          title={t("cards.voice.title")}
          description={t("cards.voice.description")}
          detail={t("cards.voice.detail")}
        />
        <FeatureStoryCard
          icon={<BarChart3 className="size-5" />}
          title={t("cards.loop.title")}
          description={t("cards.loop.description")}
          detail={t("cards.loop.detail")}
        />
      </div>
    </section>
  );
}

function ComparisonSection({ locale }: { locale: string }) {
  const t = useTranslations("landing.comparison");

  return (
    <section className={`${sectionShell} mt-24 sm:mt-28`}>
      <div className={`${glassCard} p-6 sm:p-8 lg:p-10`}>
        <div className="max-w-3xl">
          <SectionHeading
            label={t("label")}
            title={t("title")}
            description={t("subtitle")}
            align="left"
          />
          <Link
            href={`/${locale}/signup`}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#41ffd8]/25 bg-[#41ffd8]/10 px-4 py-2 text-sm font-semibold text-[#72ffe3] transition-colors hover:bg-[#41ffd8]/15"
          >
            {t("cta")}
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {/* Desktop table */}
        <div className="mt-8 hidden overflow-hidden rounded-[1.5rem] border border-white/10 sm:block">
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] bg-white/[0.04] text-sm font-semibold text-white/68">
            <div className="px-5 py-4">{t("headers.category")}</div>
            <div className="border-l border-white/10 px-5 py-4 text-white/58">
              {t("headers.manual")}
            </div>
            <div className="border-l border-white/10 px-5 py-4 text-[#72ffe3]">
              {t("headers.teleflow")}
            </div>
          </div>
          <div className="divide-y divide-white/10">
            {(["capture", "repurpose", "planning", "analytics"] as const).map((key) => (
              <ComparisonRow
                key={key}
                title={t(`rows.${key}.title`)}
                manual={t(`rows.${key}.manual`)}
                teleflow={t(`rows.${key}.teleflow`)}
              />
            ))}
          </div>
        </div>

        {/* Mobile stacked cards */}
        <div className="mt-8 space-y-4 sm:hidden">
          {(["capture", "repurpose", "planning", "analytics"] as const).map((key) => (
            <div
              key={key}
              className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#07131a]/78"
            >
              <div className="border-b border-white/10 bg-white/[0.04] px-5 py-3.5">
                <p className="text-sm font-semibold text-white">{t(`rows.${key}.title`)}</p>
              </div>
              <div className="space-y-3 px-5 py-4">
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                    {t("headers.manual")}
                  </p>
                  <p className="text-sm leading-6 text-white/50">{t(`rows.${key}.manual`)}</p>
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold tracking-[0.14em] text-[#41ffd8]/60 uppercase">
                    {t("headers.teleflow")}
                  </p>
                  <p className="flex items-start gap-2 text-sm leading-6 text-[#72ffe3]">
                    <Check className="mt-0.5 size-4 shrink-0" />
                    <span>{t(`rows.${key}.teleflow`)}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ locale }: { locale: string }) {
  const t = useTranslations("landing.pricing");

  return (
    <section id="pricing" className={`${sectionShell} mt-24 sm:mt-28`}>
      <SectionHeading label={t("label")} title={t("title")} description={t("subtitle")} />

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        <PlanCard
          name={t("plans.free.name")}
          price={t("plans.free.price")}
          period={t("period")}
          audience={t("plans.free.audience")}
          description={t("plans.free.description")}
          features={[
            t("plans.free.features.telegram"),
            t("plans.free.features.quota"),
            t("plans.free.features.capture"),
          ]}
          cta={t("plans.free.cta")}
          href={`/${locale}/signup`}
        />
        <PlanCard
          featured
          name={t("plans.plus.name")}
          price={t("plans.plus.price")}
          period={t("period")}
          badge={t("plans.plus.badge")}
          audience={t("plans.plus.audience")}
          description={t("plans.plus.description")}
          features={[
            t("plans.plus.features.quota"),
            t("plans.plus.features.adaptation"),
            t("plans.plus.features.crosspost"),
            t("plans.plus.features.analytics"),
          ]}
          cta={t("plans.plus.cta")}
          href={`/${locale}/signup`}
        />
        <PlanCard
          name={t("plans.pro.name")}
          price={t("plans.pro.price")}
          period={t("period")}
          audience={t("plans.pro.audience")}
          description={t("plans.pro.description")}
          features={[
            t("plans.pro.features.unlimited"),
            t("plans.pro.features.calendar"),
            t("plans.pro.features.channels"),
            t("plans.pro.features.priority"),
          ]}
          cta={t("plans.pro.cta")}
          href={`/${locale}/signup`}
        />
      </div>

      <p className="mt-5 text-center text-sm text-white/55">{t("note")}</p>
    </section>
  );
}

function FaqSection() {
  const t = useTranslations("landing.faq");

  return (
    <section className={`${sectionShell} mt-24 sm:mt-28`}>
      <SectionHeading label={t("label")} title={t("title")} description={t("subtitle")} />

      <div className="mx-auto mt-10 max-w-4xl space-y-4">
        {(["voice", "workflow", "billing", "team"] as const).map((key) => (
          <details
            key={key}
            className={`${glassCard} group p-6 open:border-[#41ffd8]/30 open:bg-white/[0.05]`}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
              <span className="text-lg font-semibold text-white">{t(`items.${key}.question`)}</span>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/58 transition-all group-open:rotate-180 group-open:border-[#41ffd8]/30 group-open:text-[#72ffe3]">
                <ChevronDown className="size-4" />
              </span>
            </summary>
            <p className="mt-4 pr-12 text-sm leading-7 text-white/68">{t(`items.${key}.answer`)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCtaSection({ locale }: { locale: string }) {
  const t = useTranslations("landing.finalCta");

  return (
    <section className={`${sectionShell} mt-24 sm:mt-28`}>
      <div className="relative overflow-hidden rounded-[2rem] border border-[#41ffd8]/20 bg-[linear-gradient(135deg,rgba(65,255,216,0.12),rgba(6,19,26,0.96)_38%,rgba(45,197,255,0.1))] p-8 sm:p-10 lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_28%,rgba(65,255,216,0.18),transparent_30%),radial-gradient(circle_at_8%_90%,rgba(45,197,255,0.12),transparent_28%)]" />
        <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] xl:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#8dffe9] uppercase">
              {t("label")}
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-[0.96] tracking-[-0.04em] text-white sm:text-5xl">
              {t("title")}
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/72">{t("subtitle")}</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href={`/${locale}/signup`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#41ffd8] px-6 py-3.5 text-base font-semibold text-[#03262a] transition-all hover:-translate-y-0.5 hover:bg-[#6affdf]"
              >
                {t("primary")}
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/[0.08]"
              >
                {t("secondary")}
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {(["capture", "schedule", "measure"] as const).map((key) => (
              <FinalCtaStat
                key={key}
                title={t(`points.${key}.title`)}
                text={t(`points.${key}.text`)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFooter({ locale }: { locale: string }) {
  const t = useTranslations("landing.footer");

  return (
    <footer className="relative z-10 mt-20 border-t border-white/10 bg-[#041018]/90">
      <div className={`${sectionShell} py-8 sm:py-10`}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-lg">
            <div className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">
              <span className="flex size-10 items-center justify-center rounded-full border border-[#41ffd8]/25 bg-[#41ffd8]/10 text-[#41ffd8]">
                <Send className="size-4" />
              </span>
              {t("logo")}
            </div>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/64">{t("tagline")}</p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-white/70">
              <a href="#product" className="transition-colors hover:text-white">
                {t("links.product")}
              </a>
              <a href="#workflow" className="transition-colors hover:text-white">
                {t("links.workflow")}
              </a>
              <a href="#pricing" className="transition-colors hover:text-white">
                {t("links.pricing")}
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:items-end">
            <div className="flex flex-wrap gap-2">
              {(["capture", "adapt", "measure"] as const).map((key) => (
                <span
                  key={key}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-white/58 uppercase"
                >
                  {t(`pillars.${key}.label`)}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/${locale}/login`}
                className="text-sm font-medium text-white/64 transition-colors hover:text-white"
              >
                {t("login")}
              </Link>
              <Link
                href={`/${locale}/signup`}
                className="inline-flex items-center gap-2 rounded-full border border-[#41ffd8]/25 bg-[#41ffd8]/10 px-5 py-2.5 text-sm font-semibold text-[#72ffe3] transition-colors hover:bg-[#41ffd8]/15"
              >
                {t("getStarted")}
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <p className="text-xs text-white/42">{t("copyright")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SectionHeading({
  label,
  title,
  description,
  align = "center",
}: {
  label: string;
  title: string;
  description: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "left" ? "max-w-2xl text-left" : "mx-auto max-w-3xl text-center"}>
      <p className="text-xs font-semibold tracking-[0.18em] text-[#8dffe9] uppercase">{label}</p>
      <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-[0.98] tracking-[-0.04em] text-white sm:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-lg leading-8 text-white/66">{description}</p>
    </div>
  );
}

function FeatureStoryCard({
  icon,
  title,
  description,
  detail,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  detail: string;
}) {
  return (
    <article className={`${glassCard} flex flex-col p-6`}>
      <div className="flex-1">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-[#41ffd8]/20 bg-[#41ffd8]/10 text-[#72ffe3]">
          {icon}
        </div>
        <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-white/66">{description}</p>
      </div>
      <p className="mt-5 border-t border-white/10 pt-5 text-sm font-medium text-white/84">
        {detail}
      </p>
    </article>
  );
}

function FinalCtaStat({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[#07131a]/78 p-4 sm:p-5">
      <p className="text-xs font-semibold tracking-[0.16em] text-[#9ffff0] uppercase">{title}</p>
      <p className="mt-3 text-sm leading-7 text-white/72">{text}</p>
    </div>
  );
}

function ComparisonRow({
  title,
  manual,
  teleflow,
}: {
  title: string;
  manual: string;
  teleflow: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] bg-[#07131a]/78">
      <div className="px-5 py-5">
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <div className="border-l border-white/10 px-5 py-5 text-sm leading-7 text-white/56">
        {manual}
      </div>
      <div className="border-l border-white/10 px-5 py-5 text-sm leading-7 text-white/84">
        <span className="flex items-start gap-2 text-[#72ffe3]">
          <Check className="mt-1 size-4 shrink-0" />
          <span>{teleflow}</span>
        </span>
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  audience,
  description,
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
  description: string;
  features: string[];
  cta: string;
  href: string;
  badge?: string;
  featured?: boolean;
}) {
  return (
    <article
      className={`${glassCard} p-6 sm:p-7 ${featured ? "border-[#41ffd8]/30 bg-[linear-gradient(180deg,rgba(65,255,216,0.14),rgba(255,255,255,0.04))]" : ""}`}
    >
      {badge ? (
        <span className="inline-flex rounded-full border border-[#41ffd8]/25 bg-[#41ffd8]/10 px-3 py-1 text-xs font-semibold text-[#72ffe3]">
          {badge}
        </span>
      ) : null}
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-white">{name}</h3>
          <p className="mt-2 text-sm text-white/62">{audience}</p>
        </div>
        <div className="text-right">
          <p className="font-[family-name:var(--font-display)] text-5xl tracking-[-0.05em] text-white">
            {price}
          </p>
          <p className="mt-1 text-sm text-white/48">{period}</p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-7 text-white/68">{description}</p>

      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-white/78">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#41ffd8]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold transition-all ${featured ? "bg-[#41ffd8] text-[#03262a] hover:-translate-y-0.5 hover:bg-[#6affdf]" : "border border-white/12 bg-white/[0.03] text-white hover:bg-white/[0.08]"}`}
      >
        {cta}
        <ArrowRight className="size-4" />
      </Link>
    </article>
  );
}
