import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  AudioWaveform,
  BarChart3,
  Bot,
  BrainCircuit,
  CalendarRange,
  ChevronDown,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Gauge,
  Layers3,
  MessageSquareQuote,
  Mic,
  MoveRight,
  Send,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  getFooterSolutionLinks,
  getFooterTrustLinks,
  getSolutionPreviewCards,
  marketingChromeCopy,
} from "@/lib/seo/content";
import type { AppLocale } from "@/lib/seo/site";
import { Link } from "@/i18n/navigation";

type LandingPageProps = {
  locale: AppLocale;
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
            href="/"
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
              href="/login"
              className="hidden text-sm font-medium text-white/68 transition-colors hover:text-white sm:block"
            >
              {t("nav.login")}
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-[#41ffd8] px-4 py-2.5 text-sm font-semibold text-[#03262a] transition-all hover:-translate-y-0.5 hover:bg-[#6affdf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#41ffd8]"
            >
              {t("nav.getStarted")}
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 pt-28 pb-20 sm:pt-32">
        <HeroSection />
        <PipelineDiagramSection />
        <ProofSection />
        <ComparisonSection />
        <UseCasesSection locale={locale} />
        <CombinedWorkflowSystemSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
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

function HeroSection() {
  const t = useTranslations("landing.hero");

  const promiseBullets = ["capture", "adapt", "measure"] as const;

  return (
    <section className={`${sectionShell} pt-8 sm:pt-14`}>
      <div className="max-w-5xl md:mx-auto md:text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold tracking-[0.18em] text-white/68 uppercase backdrop-blur">
          <span className="size-2 rounded-full bg-[#41ffd8]" />
          {t("badge")}
        </div>

        <h1 className="mt-7 max-w-5xl font-[family-name:var(--font-display)] text-[2.95rem] leading-[0.94] tracking-[-0.05em] text-white sm:text-[4.4rem] md:mx-auto lg:text-[5.2rem]">
          {t("title")}
          <span className="mt-3 block text-white/55">{t("titleAccent")}</span>
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-white/70 sm:text-[1.15rem] md:mx-auto">
          {t("subtitle")}
        </p>

        <div className="mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center md:justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#41ffd8] px-6 py-3.5 text-base font-semibold text-[#03262a] transition-all hover:-translate-y-0.5 hover:bg-[#6affdf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#41ffd8]"
          >
            {t("ctaPrimary")}
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="#workflow"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/[0.08]"
          >
            {t("ctaSecondary")}
            <MoveRight className="size-4" />
          </a>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 md:justify-center">
          {promiseBullets.map((key) => (
            <div
              key={key}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm text-white/74"
            >
              <CheckCircle2 className="size-4 text-[#41ffd8]" />
              {t(`promise.${key}`)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PipelineDiagramSection() {
  const t = useTranslations("landing.hero");

  const sources = ["voice", "messages", "docs", "links"] as const;
  const destinations = ["library", "queue", "analytics"] as const;

  return (
    <section id="product" className={`${sectionShell} mt-10 sm:mt-14`}>
      <div className={`${glassCard} p-5 sm:p-6 lg:p-7`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(65,255,216,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(45,197,255,0.14),transparent_32%)]" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-white/52 uppercase">
                {t("visual.eyebrow")}
              </p>
              <p className="mt-1 text-lg font-semibold text-white">{t("visual.title")}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#41ffd8]/30 bg-[#41ffd8]/12 px-3 py-1.5 text-xs font-semibold text-[#72ffe3]">
              <span className="size-2 rounded-full bg-[#41ffd8]" />
              {t("visual.live")}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-white/46 uppercase">
              {t("visual.inputLabel")}
            </p>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {sources.map((key) => (
                <PipelineNode
                  key={key}
                  icon={getSourceIcon(key)}
                  title={t(`visual.sources.${key}.title`)}
                  subtitle={t(`visual.sources.${key}.subtitle`)}
                />
              ))}
            </div>

            <HeroCore
              label={t("visual.router.label")}
              title={t("visual.router.title")}
              description={t("visual.router.description")}
              chips={[
                t("visual.router.chips.voice"),
                t("visual.router.chips.draft"),
                t("visual.router.chips.schedule"),
              ]}
            />

            <p className="text-[11px] font-semibold tracking-[0.16em] text-white/46 uppercase">
              {t("visual.outputLabel")}
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {destinations.map((key) => (
                <PipelineNode
                  key={key}
                  icon={getDestinationIcon(key)}
                  title={t(`visual.destinations.${key}.title`)}
                  subtitle={t(`visual.destinations.${key}.subtitle`)}
                  tone="accent"
                />
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {(["quota", "queue", "loop"] as const).map((key) => (
              <MiniInsightCard
                key={key}
                title={t(`visual.insights.${key}.title`)}
                value={t(`visual.insights.${key}.value`)}
                note={t(`visual.insights.${key}.note`)}
              />
            ))}
          </div>
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

function ComparisonSection() {
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
            href="/signup"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#41ffd8]/25 bg-[#41ffd8]/10 px-4 py-2 text-sm font-semibold text-[#72ffe3] transition-colors hover:bg-[#41ffd8]/15"
          >
            {t("cta")}
            <ArrowRight className="size-4" />
          </Link>
        </div>

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

function UseCasesSection({ locale }: { locale: AppLocale }) {
  const copy = marketingChromeCopy[locale];
  const cards = getSolutionPreviewCards(locale);

  return (
    <section className={`${sectionShell} mt-24 sm:mt-28`}>
      <SectionHeading
        label={copy.exploreLabel}
        title={copy.useCasesTitle}
        description={copy.useCasesDescription}
      />

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {cards.map((card) => (
          <article key={card.href} className={`${glassCard} p-6 sm:p-7`}>
            <p className="text-xs font-semibold tracking-[0.16em] text-[#8dffe9] uppercase">
              {card.label}
            </p>
            <h3 className="mt-4 font-[family-name:var(--font-display)] text-3xl tracking-[-0.04em] text-white">
              {card.title}
            </h3>
            <p className="mt-4 text-base leading-8 text-white/68">{card.description}</p>
            <Link
              href={card.href}
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#72ffe3] transition-colors hover:text-white"
            >
              {card.cta}
              <ArrowRight className="size-4" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function CombinedWorkflowSystemSection() {
  const tw = useTranslations("landing.workflow");
  const ts = useTranslations("landing.system");

  return (
    <section id="workflow" className={`${sectionShell} mt-24 sm:mt-28`}>
      <div className={`${glassCard} p-6 sm:p-8 lg:p-10`}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] lg:items-end">
          <div className="max-w-3xl">
            <SectionHeading
              label={tw("label")}
              title={tw("title")}
              description={tw("subtitle")}
              align="left"
            />
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-white/66">
            {tw("note")}
          </div>
        </div>

        <div className="mt-10 space-y-6">
          <CombinedStepCard
            step="01"
            icon={getWorkflowIcon("capture")}
            title={tw("steps.capture.title")}
            description={tw("steps.capture.description")}
            detail={tw("steps.capture.detail")}
            systemCards={[
              {
                icon: <MessageSquareQuote className="size-5" />,
                title: ts("cards.capture.title"),
                description: ts("cards.capture.description"),
                footer: ts("cards.capture.footer"),
                visual: <CaptureVisual />,
              },
            ]}
          />

          <CombinedStepCard
            step="02"
            icon={getWorkflowIcon("shape")}
            title={tw("steps.shape.title")}
            description={tw("steps.shape.description")}
            detail={tw("steps.shape.detail")}
            systemCards={[
              {
                icon: <AudioWaveform className="size-5" />,
                title: ts("cards.voice.title"),
                description: ts("cards.voice.description"),
                footer: ts("cards.voice.footer"),
                visual: <VoiceVisual />,
              },
              {
                icon: <Layers3 className="size-5" />,
                title: ts("cards.adapt.title"),
                description: ts("cards.adapt.description"),
                footer: ts("cards.adapt.footer"),
                visual: <AdaptationVisual />,
              },
            ]}
          />

          <CombinedStepCard
            step="03"
            icon={getWorkflowIcon("distribute")}
            title={tw("steps.distribute.title")}
            description={tw("steps.distribute.description")}
            detail={tw("steps.distribute.detail")}
            systemCards={[
              {
                icon: <CalendarRange className="size-5" />,
                title: ts("cards.schedule.title"),
                description: ts("cards.schedule.description"),
                footer: ts("cards.schedule.footer"),
                visual: <ScheduleVisual />,
              },
            ]}
          />

          <CombinedStepCard
            step="04"
            icon={getWorkflowIcon("learn")}
            title={tw("steps.learn.title")}
            description={tw("steps.learn.description")}
            detail={tw("steps.learn.detail")}
            systemCards={[
              {
                icon: <Gauge className="size-5" />,
                title: ts("cards.analytics.title"),
                description: ts("cards.analytics.description"),
                footer: ts("cards.analytics.footer"),
                visual: <AnalyticsVisual />,
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

type SystemCardEntry = {
  icon: ReactNode;
  title: string;
  description: string;
  footer: string;
  visual: ReactNode;
};

function CombinedStepCard({
  step,
  icon,
  title,
  description,
  detail,
  systemCards,
}: {
  step: string;
  icon: ReactNode;
  title: string;
  description: string;
  detail: string;
  systemCards: SystemCardEntry[];
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:p-8">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#41ffd8]/25 bg-[#41ffd8]/10 text-sm font-semibold text-[#72ffe3]">
          {step}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-[#72ffe3]">
              {icon}
            </span>
            <h3 className="text-xl font-semibold tracking-tight text-white">{title}</h3>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/66">{description}</p>
        </div>
      </div>

      <div className={`mt-6 ${systemCards.length > 1 ? "space-y-5" : ""}`}>
        {systemCards.map((card, i) => (
          <div
            key={i}
            className="rounded-[1.35rem] border border-white/10 bg-[#07131a]/70 p-5 sm:p-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-[#72ffe3]">
                {card.icon}
              </span>
              <h4 className="text-base font-semibold text-white">{card.title}</h4>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">{card.description}</p>
            <div className="mt-5">{card.visual}</div>
            <p className="mt-5 border-t border-white/10 pt-4 text-sm font-medium text-white/78">
              {card.footer}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-sm font-medium text-white/84">{detail}</p>
    </article>
  );
}

function PricingSection() {
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
          href="/signup"
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
          href="/signup"
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
          href="/signup"
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

function FinalCtaSection() {
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
                href="/signup"
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

function LandingFooter({ locale }: { locale: AppLocale }) {
  const t = useTranslations("landing.footer");
  const chrome = marketingChromeCopy[locale];
  const solutionLinks = getFooterSolutionLinks(locale);
  const trustLinks = getFooterTrustLinks(locale);

  return (
    <footer className="relative z-10 mt-20 border-t border-white/10 bg-[#041018]/90">
      <div className={`${sectionShell} py-8 sm:py-10`}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] lg:items-start">
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
            <div className="mt-5 flex flex-wrap gap-2">
              {(["capture", "adapt", "measure"] as const).map((key) => (
                <span
                  key={key}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-white/58 uppercase"
                >
                  {t(`pillars.${key}.label`)}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-white/44 uppercase">
              {chrome.solutionsLabel}
            </p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-white/70">
              {solutionLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:items-end">
            <p className="text-xs font-semibold tracking-[0.16em] text-white/44 uppercase">
              {chrome.legalLabel}
            </p>
            <div className="flex flex-col gap-3 text-sm text-white/70 lg:items-end">
              {trustLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-white/64 transition-colors hover:text-white"
              >
                {t("login")}
              </Link>
              <Link
                href="/signup"
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

function PipelineNode({
  icon,
  title,
  subtitle,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  tone?: "default" | "accent";
}) {
  return (
    <div
      className={`rounded-[1.35rem] border p-4 text-left ${tone === "accent" ? "border-[#41ffd8]/16 bg-[#0b1a22]/92" : "border-white/10 bg-[#07131a]/88"}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-[#72ffe3]">
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-white/54">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function HeroCore({
  label,
  title,
  description,
  chips,
}: {
  label: string;
  title: string;
  description: string;
  chips: string[];
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-[#41ffd8]/20 bg-[linear-gradient(135deg,rgba(65,255,216,0.12),rgba(7,19,26,0.96)_35%,rgba(7,19,26,0.92))] p-5 sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(45,197,255,0.12),transparent_30%)]" />
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#9ffff0] uppercase">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{title}</p>
          <p className="mt-3 max-w-xl text-sm leading-7 text-white/64">{description}</p>
        </div>

        <div className="relative flex size-24 shrink-0 items-center justify-center rounded-full border border-[#41ffd8]/30 bg-[#0b1a22] shadow-[0_0_48px_rgba(65,255,216,0.18)]">
          <div
            className="absolute inset-[12px] rounded-full border border-white/10 motion-safe:animate-spin"
            style={{ animationDuration: "18s" }}
          />
          <div className="absolute inset-[5px] rounded-full border border-[#2dc5ff]/20" />
          <BrainCircuit className="size-9 text-[#72ffe3]" />
        </div>
      </div>

      <div className="relative z-10 mt-5 grid gap-3 sm:grid-cols-3">
        {chips.map((chip) => (
          <div
            key={chip}
            className="rounded-full border border-white/10 bg-[#07131a]/78 px-4 py-2.5 text-sm text-white/74"
          >
            {chip}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniInsightCard({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-white/48 uppercase">{title}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-white/54">{note}</p>
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

function CaptureVisual() {
  const t = useTranslations("landing.system.visuals.capture");

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="space-y-3 rounded-[1.35rem] border border-white/10 bg-[#07131a]/90 p-4">
        {[
          { icon: <Mic className="size-4" />, label: t("items.voice") },
          { icon: <MessageSquareQuote className="size-4" />, label: t("items.messages") },
          { icon: <FileText className="size-4" />, label: t("items.links") },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-white/72"
          >
            <span className="flex items-center gap-2">
              <span className="text-[#72ffe3]">{item.icon}</span>
              {item.label}
            </span>
            <CheckCircle2 className="size-4 text-[#41ffd8]" />
          </div>
        ))}
      </div>
      <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between text-xs font-semibold tracking-[0.16em] text-white/48 uppercase">
          <span>{t("router.title")}</span>
          <span className="text-[#72ffe3]">{t("router.status")}</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-[#0b1a22] p-4">
            <p className="text-xs text-white/48">{t("router.languageLabel")}</p>
            <p className="mt-2 text-lg font-semibold text-white">{t("router.languageValue")}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#0b1a22] p-4">
            <p className="text-xs text-white/48">{t("router.intentLabel")}</p>
            <p className="mt-2 text-lg font-semibold text-white">{t("router.intentValue")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceVisual() {
  const t = useTranslations("landing.system.visuals.voice");

  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[#07131a]/90 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-[0.16em] text-white/48 uppercase">
          {t("title")}
        </span>
        <span className="rounded-full border border-[#41ffd8]/20 bg-[#41ffd8]/10 px-2 py-1 text-[10px] font-semibold text-[#72ffe3]">
          {t("status")}
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {[
          { label: t("bars.cadence"), width: "w-[82%]" },
          { label: t("bars.vocabulary"), width: "w-[74%]" },
          { label: t("bars.hook"), width: "w-[68%]" },
        ].map((bar) => (
          <div key={bar.label}>
            <div className="flex items-center justify-between text-xs text-white/58">
              <span>{bar.label}</span>
              <span>{t("matched")}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/6">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-[#41ffd8] to-[#2dc5ff] ${bar.width}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdaptationVisual() {
  const t = useTranslations("landing.system.visuals.adapt");

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-[1.25rem] border border-white/10 bg-[#07131a]/90 p-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-white/48 uppercase">
          {t("sourceTitle")}
        </p>
        <p className="mt-4 text-sm leading-7 text-white/70">{t("sourceBody")}</p>
      </div>
      <div className="rounded-[1.25rem] border border-[#41ffd8]/20 bg-[#41ffd8]/10 p-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#9ffff0] uppercase">
          {t("outputTitle")}
        </p>
        <div className="mt-4 space-y-2 text-sm text-white/84">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#07131a]/75 px-3 py-2">
            <span>{t("outputs.telegram")}</span>
            <Send className="size-4 text-[#72ffe3]" />
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#07131a]/75 px-3 py-2">
            <span>{t("outputs.crosspost")}</span>
            <Layers3 className="size-4 text-[#72ffe3]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleVisual() {
  const t = useTranslations("landing.system.visuals.schedule");

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        { day: t("days.mon"), state: t("states.queue") },
        { day: t("days.wed"), state: t("states.repurpose") },
        { day: t("days.fri"), state: t("states.publish") },
      ].map((slot) => (
        <div
          key={slot.day}
          className="rounded-[1.25rem] border border-white/10 bg-[#07131a]/90 p-4"
        >
          <p className="text-xs font-semibold tracking-[0.16em] text-white/48 uppercase">
            {slot.day}
          </p>
          <p className="mt-4 text-lg font-semibold text-white">{slot.state}</p>
          <div className="mt-3 flex items-center gap-2 text-sm text-white/58">
            <Clock3 className="size-4 text-[#72ffe3]" />
            09:30
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsVisual() {
  const t = useTranslations("landing.system.visuals.analytics");

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[1.35rem] border border-white/10 bg-[#07131a]/90 p-4">
        <div className="flex items-center justify-between text-xs font-semibold tracking-[0.16em] text-white/48 uppercase">
          <span>{t("title")}</span>
          <span className="text-[#72ffe3]">{t("status")}</span>
        </div>
        <svg viewBox="0 0 360 140" className="mt-4 h-36 w-full" fill="none" aria-hidden="true">
          <path
            d="M8 112C40 96 70 58 102 58C134 58 154 110 194 110C234 110 250 34 290 34C314 34 334 52 352 62"
            stroke="url(#analytics-line)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="102" cy="58" r="6" fill="#41ffd8" />
          <circle cx="194" cy="110" r="6" fill="#41ffd8" />
          <circle cx="290" cy="34" r="6" fill="#2dc5ff" />
          <defs>
            <linearGradient id="analytics-line" x1="8" y1="34" x2="352" y2="112">
              <stop stopColor="#41ffd8" />
              <stop offset="1" stopColor="#2dc5ff" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="grid gap-3">
        {[
          { label: t("stats.windowLabel"), value: t("stats.windowValue") },
          { label: t("stats.channelLabel"), value: t("stats.channelValue") },
          { label: t("stats.formatLabel"), value: t("stats.formatValue") },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-[1.25rem] border border-white/10 bg-[#07131a]/90 p-4"
          >
            <p className="text-xs font-semibold tracking-[0.16em] text-white/48 uppercase">
              {item.label}
            </p>
            <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>
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

function getSourceIcon(key: "voice" | "messages" | "docs" | "links") {
  switch (key) {
    case "voice":
      return <Mic className="size-4" />;
    case "messages":
      return <MessageSquareQuote className="size-4" />;
    case "docs":
      return <FileText className="size-4" />;
    case "links":
      return <Workflow className="size-4" />;
  }
}

function getDestinationIcon(key: "library" | "queue" | "analytics") {
  switch (key) {
    case "library":
      return <Bot className="size-4" />;
    case "queue":
      return <CalendarRange className="size-4" />;
    case "analytics":
      return <BarChart3 className="size-4" />;
  }
}

function getWorkflowIcon(key: "capture" | "shape" | "distribute" | "learn") {
  switch (key) {
    case "capture":
      return <Bot className="size-5" />;
    case "shape":
      return <Sparkles className="size-5" />;
    case "distribute":
      return <Send className="size-5" />;
    case "learn":
      return <ShieldCheck className="size-5" />;
  }
}
