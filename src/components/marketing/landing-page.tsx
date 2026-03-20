import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CalendarRange,
  ChevronDown,
  Check,
  CheckCircle2,
  Clock3,
  BarChart3,
  Gauge,
  Layers3,
  MessageSquareQuote,
  Mic,
  AudioWaveform,
  MoveRight,
  Send,
  Sparkles,
  Workflow,
  Zap,
  LayoutTemplate,
  Globe2,
  ShieldCheck,
  Rocket,
  Plus,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  getFooterSolutionLinks,
  getFooterTrustLinks,
  marketingChromeCopy,
} from "@/lib/seo/content";
import type { AppLocale } from "@/lib/seo/site";
import { Link } from "@/i18n/navigation";

type LandingPageProps = {
  locale: AppLocale;
};

const sectionShell = "mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-10";
const glassCard =
  "relative overflow-hidden rounded-[1.75rem] border border-border/50 bg-card/40 backdrop-blur-xl shadow-lg";

export function LandingPage({ locale }: LandingPageProps) {
  const t = useTranslations("landing");

  return (
    <div className="bg-background text-foreground selection:bg-primary/30 selection:text-foreground relative min-h-screen overflow-x-hidden font-[family-name:var(--font-sans)]">
      <LandingBackdrop />

      {/* NAVBAR */}
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
        <nav
          className={`border-border/40 bg-background/70 mx-auto flex max-w-[1240px] items-center justify-between rounded-full border px-4 py-3 shadow-lg backdrop-blur-xl sm:px-5`}
        >
          <Link
            href="/"
            className="text-foreground flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight sm:text-xl"
          >
            <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full">
              <Send className="size-4" />
            </span>
            {t("nav.logo")}
          </Link>

          <div className="text-muted-foreground hidden items-center gap-8 text-sm font-medium lg:flex">
            <a href="#product" className="hover:text-foreground transition-colors">
              {t("nav.links.product")}
            </a>
            <a href="#workflow" className="hover:text-foreground transition-colors">
              {t("nav.links.workflow")}
            </a>
            <a href="#features" className="hover:text-foreground transition-colors">
              {t("nav.links.proof")}
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              {t("nav.links.pricing")}
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground hidden text-sm font-medium transition-colors sm:block"
            >
              {t("nav.login")}
            </Link>
            <Link
              href="/signup"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/20 focus-visible:outline-primary inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {t("nav.getStarted")}
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 pt-32 pb-20 sm:pt-40">
        <HeroSection />
        <StatsSection />
        <ProblemsSection />
        <WorkflowStepsSection />
        <BentoFeaturesSection />
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
    <div
      aria-hidden="true"
      className="bg-background pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* 1. Pure, minimalistic Vercel 1px Grid fading cleanly down the page */}
      <div
        className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)] opacity-[0.25] dark:opacity-[0.1]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(128, 128, 128, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(128, 128, 128, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: "4rem 4rem",
          backgroundPosition: "center top",
        }}
      />

      {/* 2. Soft Ambient Spotlight (Top Center) using alpha-masks to avoid 'grease' CSS blurs */}
      <div className="bg-primary/10 dark:bg-primary/20 absolute inset-x-0 top-0 h-[1000px] w-full [mask-image:radial-gradient(ellipse_100%_100%_at_50%_0%,black_0%,transparent_70%)]" />
    </div>
  );
}

function HeroSection() {
  const t = useTranslations("landing.hero");

  return (
    <section className={`${sectionShell} text-center`}>
      <div className="mx-auto flex max-w-5xl flex-col items-center">
        {/* Animated Badge */}
        <div className="group border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/30 inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-sm transition-all">
          <Sparkles className="size-4 animate-pulse" />
          <span>{t("badge")}</span>
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>

        <h1 className="text-foreground mt-8 max-w-4xl font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
          {t("title")}{" "}
          <span className="from-primary via-primary/80 to-secondary bg-gradient-to-r bg-clip-text text-transparent">
            {t("titleAccent")}
          </span>
        </h1>

        <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-relaxed text-balance sm:text-xl">
          {t("subtitle")}
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/95 hover:shadow-primary/30 focus-visible:outline-primary inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 text-base font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-2"
          >
            {t("ctaPrimary")}
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="#pricing"
            className="border-border bg-background/50 text-foreground hover:bg-muted inline-flex h-12 items-center justify-center gap-2 rounded-full border px-8 text-base font-semibold backdrop-blur-sm transition-all"
          >
            {t("ctaSecondary")}
          </a>
        </div>

        {/* High-Fidelity Dashboard Mockup */}
        <div className="animate-fade-in-up mt-20 w-full max-w-5xl">
          <div className="border-border/50 bg-background/40 relative overflow-hidden rounded-t-3xl border-x border-t p-2 pb-0 shadow-2xl backdrop-blur-2xl xl:p-4 xl:pb-0">
            <div className="via-primary/30 absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent to-transparent" />
            <div className="border-border/50 bg-card relative flex aspect-[16/10] w-full flex-col overflow-hidden rounded-t-[1.25rem] border-x border-t shadow-sm">
              {/* Browser OS Topbar */}
              <div className="border-border/50 bg-muted/30 flex h-12 shrink-0 items-center justify-between border-b px-4">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <div className="size-3 rounded-full bg-[#ff5f56]" />
                    <div className="size-3 rounded-full bg-[#ffbd2e]" />
                    <div className="size-3 rounded-full bg-[#27c93f]" />
                  </div>
                </div>
                <div className="bg-background/60 border-border/40 text-muted-foreground flex h-7 w-full max-w-[240px] items-center justify-center rounded-md border text-[11px] font-medium shadow-sm">
                  <Globe2 className="mr-2 size-3 opacity-50" /> app.teleflow.com
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-muted text-muted-foreground flex size-7 items-center justify-center rounded-full">
                    <ShieldCheck className="size-3.5" />
                  </div>
                </div>
              </div>

              {/* App Layout */}
              <div className="bg-background flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="border-border/50 bg-card/50 hidden w-56 flex-col border-r p-4 sm:flex">
                  <div className="text-foreground flex items-center gap-2 px-2 font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight">
                    <span className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-full">
                      <Send className="size-3" />
                    </span>
                    Teleflow
                  </div>
                  <div className="mt-8 flex flex-col gap-1.5">
                    <div className="bg-primary/10 text-primary flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium">
                      <LayoutTemplate className="size-4" /> Dashboard
                    </div>
                    <div className="text-muted-foreground hover:bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium">
                      <Workflow className="size-4" /> Content Hub
                    </div>
                    <div className="text-muted-foreground hover:bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium">
                      <CalendarRange className="size-4" /> Schedule
                    </div>
                    <div className="text-muted-foreground hover:bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium">
                      <BarChart3 className="size-4" /> Analytics
                    </div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden p-6 text-left">
                  {/* Welcome Banner mimicking actual dashboard */}
                  <div className="relative overflow-hidden rounded-2xl border border-[#1e293b] bg-[linear-gradient(135deg,#0f172a,#10243a_48%,#0f172a)] p-6 text-white shadow-lg">
                    <div className="pointer-events-none absolute top-0 left-0 h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_32%)]" />
                    <div className="relative z-10 flex items-start justify-between">
                      <div>
                        <p className="text-[10px] font-bold tracking-[0.2em] text-cyan-100/70 uppercase">
                          Monday, Oct 14
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                          Welcome back, Creator 👋
                        </h2>
                        <div className="mt-5 flex gap-3">
                          <button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur-md transition-colors hover:bg-white/20">
                            <Plus className="size-3.5" /> New Post
                          </button>
                          <button className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-100 backdrop-blur-md transition-colors hover:bg-cyan-500/30">
                            <Sparkles className="size-3.5" /> AI Draft
                          </button>
                        </div>
                      </div>
                      <div className="hidden min-w-[120px] rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-md lg:block">
                        <p className="text-[10px] font-bold tracking-[0.15em] text-cyan-100/60 uppercase">
                          Calendar Gaps
                        </p>
                        <p className="mt-2 text-3xl font-bold text-white">3</p>
                      </div>
                    </div>
                  </div>

                  {/* Stat Cards */}
                  <div className="mt-6 grid grid-cols-4 gap-4">
                    {[
                      {
                        icon: <MessageSquareQuote className="size-4 text-blue-500" />,
                        label: "Ideas",
                        val: "24",
                        bg: "bg-blue-500/10",
                        border: "border-blue-500/20",
                      },
                      {
                        icon: <Layers3 className="size-4 text-amber-500" />,
                        label: "Drafts",
                        val: "12",
                        bg: "bg-amber-500/10",
                        border: "border-amber-500/20",
                      },
                      {
                        icon: <Rocket className="size-4 text-emerald-500" />,
                        label: "Published",
                        val: "148",
                        bg: "bg-emerald-500/10",
                        border: "border-emerald-500/20",
                      },
                      {
                        icon: <Bot className="size-4 text-purple-500" />,
                        label: "AI Used",
                        val: "85/100",
                        bg: "bg-purple-500/10",
                        border: "border-purple-500/20",
                      },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className="border-border/50 bg-card rounded-xl border p-4 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex size-8 items-center justify-center rounded-lg ${stat.bg} ${stat.border} border`}
                          >
                            {stat.icon}
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs font-medium">
                              {stat.label}
                            </p>
                            <p className="text-foreground text-lg font-semibold">{stat.val}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Two Column Layout for Feed */}
                  <div className="mt-6 grid grid-cols-3 gap-6">
                    <div className="border-border/50 bg-card col-span-2 flex flex-col rounded-xl border shadow-sm">
                      <div className="border-border/50 flex items-center justify-between border-b px-5 py-3">
                        <h3 className="text-foreground text-sm font-medium">Upcoming Posts</h3>
                        <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                          View Calendar
                        </span>
                      </div>
                      <div className="flex-1 space-y-4 p-5">
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="text-muted-foreground text-xs font-bold">10:00</div>
                            <div className="bg-border/50 mt-2 h-full w-[2px] rounded-full" />
                          </div>
                          <div className="border-border/60 bg-muted/20 flex-1 rounded-lg border p-3">
                            <div className="flex items-center gap-2">
                              <Send className="size-3.5 text-blue-400" />
                              <p className="text-foreground text-xs font-medium">
                                Launch Announcement 🚀
                              </p>
                            </div>
                            <p className="text-muted-foreground mt-2 line-clamp-1 text-xs">
                              We are finally live! After 6 months of intense building...
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="text-muted-foreground text-xs font-bold">14:30</div>
                          </div>
                          <div className="border-border/60 bg-muted/20 flex-1 rounded-lg border p-3">
                            <div className="flex items-center gap-2">
                              <Send className="size-3.5 text-blue-400" />
                              <p className="text-foreground text-xs font-medium">
                                Daily Design Tip
                              </p>
                            </div>
                            <p className="text-muted-foreground mt-2 line-clamp-1 text-xs">
                              Did you know that utilizing whitespace effectively can increase
                              conversion...
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="border-border/50 bg-card col-span-1 flex flex-col rounded-xl border shadow-sm">
                      <div className="border-border/50 border-b px-5 py-3">
                        <h3 className="text-foreground text-sm font-medium">Activity</h3>
                      </div>
                      <div className="space-y-4 p-5">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                            <Check className="size-3.5" />
                          </div>
                          <div>
                            <p className="text-foreground text-xs font-medium">Post sent</p>
                            <p className="text-muted-foreground text-[10px]">12m ago</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
                            <Sparkles className="size-3.5" />
                          </div>
                          <div>
                            <p className="text-foreground text-xs font-medium">
                              AI completed draft
                            </p>
                            <p className="text-muted-foreground text-[10px]">1h ago</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { value: "10K+", label: "Creators Empowered" },
    { value: "99%", label: "Satisfaction Rate" },
    { value: "500K+", label: "Posts Automated" },
    { value: "50h+", label: "Saved per Month" },
  ];

  return (
    <section className="relative z-20 mx-auto mt-20 max-w-[1240px] px-5 sm:mt-24">
      <div className="border-border/50 bg-card/60 grid grid-cols-2 gap-4 rounded-3xl border p-8 shadow-sm backdrop-blur-lg md:grid-cols-4 lg:p-12">
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col items-center justify-center space-y-2 text-center">
            <h3 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {stat.value}
            </h3>
            <p className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProblemsSection() {
  const t = useTranslations("landing.proof");
  return (
    <section className={`${sectionShell} mt-24 sm:mt-32`}>
      <div className="text-center">
        <h2 className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
          {t("label")}
        </h2>
        <p className="text-foreground mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </p>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">{t("subtitle")}</p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-3 lg:gap-8">
        {[
          {
            icon: <Clock3 className="size-6" />,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            key: "telegram",
          },
          {
            icon: <MessageSquareQuote className="size-6" />,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            key: "voice",
          },
          {
            icon: <BarChart3 className="size-6" />,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            key: "loop",
          },
        ].map((item) => (
          <div key={item.key} className={glassCard + " flex flex-col justify-between p-8"}>
            <div>
              <div
                className={`flex size-12 items-center justify-center rounded-xl ${item.bg} ${item.color}`}
              >
                {item.icon}
              </div>
              <h3 className="text-foreground mt-6 text-xl font-semibold">
                {t(`cards.${item.key}.title`)}
              </h3>
              <p className="text-muted-foreground mt-2">{t(`cards.${item.key}.description`)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkflowStepsSection() {
  const tw = useTranslations("landing.workflow");

  return (
    <section id="workflow" className={`${sectionShell} mt-24 sm:mt-32`}>
      <div
        className={`${glassCard} border-primary/10 from-card/80 to-card/30 bg-gradient-to-br p-8 sm:p-12 lg:p-16`}
      >
        <div className="text-center">
          <h2 className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
            {tw("label")}
          </h2>
          <p className="text-foreground mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
            {tw("title")}
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {/* Step 1 */}
          <div className="group relative text-center">
            <div className="bg-primary/10 text-primary group-hover:bg-primary/20 mx-auto flex size-20 items-center justify-center rounded-2xl transition-all group-hover:scale-110">
              <Layers3 className="size-10" />
            </div>
            <h3 className="text-foreground mt-6 text-xl font-bold">
              1. {tw("steps.capture.title")}
            </h3>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              {tw("steps.capture.description")}
            </p>
            {/* Connector Arrow (Desktop only) */}
            <div className="text-muted-foreground/30 absolute top-10 -right-6 hidden lg:block">
              <MoveRight className="size-8" />
            </div>
          </div>

          {/* Step 2 */}
          <div className="group relative text-center">
            <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500 transition-all group-hover:scale-110 group-hover:bg-purple-500/20">
              <BrainCircuit className="size-10" />
            </div>
            <h3 className="text-foreground mt-6 text-xl font-bold">2. {tw("steps.shape.title")}</h3>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              {tw("steps.shape.description")}
            </p>
            {/* Connector Arrow (Desktop only) */}
            <div className="text-muted-foreground/30 absolute top-10 -right-6 hidden lg:block">
              <MoveRight className="size-8" />
            </div>
          </div>

          {/* Step 3 */}
          <div className="group relative text-center">
            <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 transition-all group-hover:scale-110 group-hover:bg-emerald-500/20">
              <Send className="size-10" />
            </div>
            <h3 className="text-foreground mt-6 text-xl font-bold">
              3. {tw("steps.distribute.title")}
            </h3>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              {tw("steps.distribute.description")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BentoFeaturesSection() {
  const ts = useTranslations("landing.system");
  const features = [
    {
      title: ts("cards.capture.title"),
      description: ts("cards.capture.description"),
      icon: <BrainCircuit className="size-6" />,
      colSpan: "md:col-span-2",
      bg: "bg-gradient-to-br from-primary/10 to-transparent",
    },
    {
      title: ts("cards.voice.title"),
      description: ts("cards.voice.description"),
      icon: <Mic className="size-6" />,
      colSpan: "md:col-span-1",
      bg: "bg-muted/40",
    },
    {
      title: ts("cards.adapt.title"),
      description: ts("cards.adapt.description"),
      icon: <Workflow className="size-6" />,
      colSpan: "md:col-span-1",
      bg: "bg-muted/40",
    },
    {
      title: ts("cards.schedule.title"),
      description: ts("cards.schedule.description"),
      icon: <CalendarRange className="size-6" />,
      colSpan: "md:col-span-1",
      bg: "bg-muted/40",
    },
    {
      title: ts("cards.analytics.title"),
      description: ts("cards.analytics.description"),
      icon: <BarChart3 className="size-6" />,
      colSpan: "md:col-span-1",
      bg: "bg-gradient-to-tl from-secondary/10 to-transparent",
    },
  ];

  return (
    <section id="features" className={`${sectionShell} mt-24 sm:mt-32`}>
      <div className="text-center">
        <h2 className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
          {ts("label")}
        </h2>
        <p className="text-foreground mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          {ts("title")}
        </p>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">{ts("subtitle")}</p>
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {features.map((feature, i) => (
          <div
            key={i}
            className={`group border-border/50 hover:bg-muted/80 flex flex-col justify-between overflow-hidden rounded-3xl border p-8 transition-all ${feature.colSpan} ${feature.bg}`}
          >
            <div>
              <div className="bg-background text-foreground flex size-12 items-center justify-center rounded-xl shadow-sm">
                {feature.icon}
              </div>
              <h3 className="text-foreground mt-6 text-xl font-semibold">{feature.title}</h3>
            </div>
            <p className="text-muted-foreground mt-4 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingSection() {
  const t = useTranslations("landing.pricing");

  const plans = [
    {
      name: t("plans.free.name"),
      price: "$0",
      description: t("plans.free.description"),
      features: [
        t("plans.free.features.telegram"),
        t("plans.free.features.quota"),
        t("plans.free.features.capture"),
      ],
      cta: t("plans.free.cta"),
      featured: false,
    },
    {
      name: t("plans.plus.name"),
      price: "$29",
      description: t("plans.plus.description"),
      features: [
        t("plans.plus.features.quota"),
        t("plans.plus.features.adaptation"),
        t("plans.plus.features.crosspost"),
        t("plans.plus.features.analytics"),
      ],
      cta: t("plans.plus.cta"),
      featured: true,
      badge: t("plans.plus.badge") || "Most Popular",
    },
    {
      name: t("plans.pro.name"),
      price: "$79",
      description: t("plans.pro.description"),
      features: [
        t("plans.pro.features.unlimited"),
        t("plans.pro.features.calendar"),
        t("plans.pro.features.channels"),
        t("plans.pro.features.priority"),
      ],
      cta: t("plans.pro.cta"),
      featured: false,
    },
  ];

  return (
    <section id="pricing" className={`${sectionShell} mt-24 sm:mt-32`}>
      <div className="text-center">
        <h2 className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
          {t("label")}
        </h2>
        <p className="text-foreground mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </p>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">{t("subtitle")}</p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-3 lg:gap-8 lg:px-6">
        {plans.map((plan, i) => (
          <div
            key={i}
            className={`relative flex flex-col rounded-[2rem] border p-8 shadow-sm transition-all hover:shadow-lg ${
              plan.featured
                ? "border-primary bg-card/90 shadow-primary/10 z-10 scale-105"
                : "border-border/60 bg-card/40"
            }`}
          >
            {plan.featured && (
              <div className="bg-primary text-primary-foreground absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold tracking-wider uppercase shadow-sm">
                {plan.badge}
              </div>
            )}
            <div className="mb-6">
              <h3 className="text-foreground text-lg font-semibold">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-foreground text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm font-medium">/ month</span>
              </div>
              <p className="text-muted-foreground mt-3 text-sm">{plan.description}</p>
            </div>
            <ul className="mb-8 flex-1 space-y-3">
              {plan.features.map((feature, j) => (
                <li key={j} className="text-foreground/80 flex items-start gap-3 text-sm">
                  <CheckCircle2
                    className={`mx-0.5 mt-0.5 size-4 shrink-0 ${plan.featured ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                plan.featured
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function FaqSection() {
  const t = useTranslations("landing.faq");
  const keys = ["voice", "workflow", "billing", "team"] as const;

  return (
    <section className={`${sectionShell} mt-24 sm:mt-32`}>
      <div className="text-center">
        <h2 className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">FAQ</h2>
        <p className="text-foreground mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          Frequently Asked Questions
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-3xl space-y-4">
        {keys.map((key) => (
          <details
            key={key}
            className="group border-border/50 bg-card/40 open:bg-card/80 cursor-pointer rounded-2xl border p-6 transition-all"
          >
            <summary className="text-foreground flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold outline-none">
              {t(`items.${key}.question`)}
              <span className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-full transition-transform group-open:rotate-180">
                <ChevronDown className="size-4" />
              </span>
            </summary>
            <p className="text-muted-foreground mt-4 pr-8 leading-relaxed">
              {t(`items.${key}.answer`)}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCtaSection() {
  const t = useTranslations("landing.finalCta");

  return (
    <section className={`${sectionShell} mt-24 sm:mt-32`}>
      <div className="border-primary/20 from-primary/5 via-primary/10 to-background relative overflow-hidden rounded-[2.5rem] border bg-gradient-to-br px-8 py-16 text-center shadow-xl sm:px-16 sm:py-20 lg:py-24">
        {/* Animated Glow Elements */}
        <div className="bg-primary/20 absolute top-0 left-1/4 h-64 w-64 -translate-y-1/2 animate-pulse rounded-full opacity-50 blur-3xl" />
        <div className="bg-secondary/20 absolute right-1/4 bottom-0 hidden h-64 w-64 translate-y-1/2 animate-pulse rounded-full opacity-50 blur-3xl sm:block" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="bg-primary text-primary-foreground shadow-primary/30 mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl shadow-lg">
            <Zap className="size-8" />
          </div>
          <h2 className="text-foreground font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {t("title")}
          </h2>
          <p className="text-muted-foreground mt-6 text-lg">{t("subtitle")}</p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="bg-primary text-primary-foreground hover:bg-primary/95 focus-visible:outline-primary inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 text-base font-semibold shadow-lg transition-all hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {t("primary")}
              <ArrowRight className="size-4" />
            </Link>
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
    <footer className="border-border bg-card/80 relative z-10 mt-20 border-t">
      <div className={`${sectionShell} py-12 sm:py-16`}>
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="text-foreground flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
              <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
                <Send className="size-5" />
              </span>
              {t("logo")}
            </div>
            <p className="text-muted-foreground mt-4 max-w-sm text-sm leading-relaxed">
              {t("tagline")} - Your AI-powered operating system for managing automated social flows.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase">
                Capture
              </span>
              <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase">
                Adapt
              </span>
              <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase">
                Measure
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-foreground text-xs font-bold tracking-[0.15em] uppercase">
              {chrome.solutionsLabel}
            </h3>
            <ul className="mt-4 space-y-3">
              {solutionLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-foreground text-xs font-bold tracking-[0.15em] uppercase">
              {chrome.legalLabel}
            </h3>
            <ul className="mt-4 space-y-3">
              {trustLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-border mt-12 flex flex-col items-center justify-between border-t pt-8 sm:flex-row">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Telegram Content OS. All rights reserved.
          </p>
          <div className="mt-4 flex gap-4 sm:mt-0">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
