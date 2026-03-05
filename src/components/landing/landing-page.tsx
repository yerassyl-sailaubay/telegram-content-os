"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileText,
  Lightbulb,
  LineChart,
  Link as LinkIcon,
  MessageSquare,
  Mic,
  Send,
  Sparkles,
  Youtube,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function LandingPage() {
  const t = useTranslations("landing");

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
              <Send className="size-4" />
            </div>
            Telegram Content OS
          </Link>
          <nav className="text-muted-foreground hidden items-center gap-6 text-sm font-medium md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">
              {t("nav.features")}
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              {t("nav.howItWorks")}
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              {t("nav.pricing")}
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden md:inline-flex" asChild>
              <Link href="/login">{t("nav.login")}</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">{t("nav.getStarted")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-5xl space-y-8 px-4 py-24 text-center md:py-32">
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            <Sparkles className="text-primary mr-2 size-3.5" />
            {t("hero.badge")}
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-6xl lg:text-7xl">
            {t("hero.title")}
          </h1>
          <p className="text-muted-foreground mx-auto max-w-3xl text-xl text-balance">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
            <Button size="lg" className="h-12 w-full px-8 text-base sm:w-auto" asChild>
              <Link href="/signup">
                {t("hero.ctaPrimary")}
                <ChevronRight className="ml-2 size-4" />
              </Link>
            </Button>
            <p className="text-muted-foreground text-sm sm:hidden">{t("hero.subCta")}</p>
          </div>
          <p className="text-muted-foreground hidden pt-2 text-sm sm:block">{t("hero.subCta")}</p>

          {/* Hero Image/Mockup Placeholder */}
          <div className="bg-muted/30 relative mt-16 overflow-hidden rounded-2xl border p-2 shadow-2xl md:p-4">
            <div className="from-background pointer-events-none absolute inset-0 top-auto bottom-0 z-10 h-32 bg-gradient-to-t to-transparent" />
            <div className="bg-background flex aspect-[16/9] flex-col overflow-hidden rounded-xl border shadow-sm md:aspect-[21/9] md:flex-row">
              {/* Sidebar Mockup */}
              <div className="bg-muted/10 hidden w-64 flex-col gap-4 border-r p-4 md:flex">
                <div className="bg-muted h-8 w-32 rounded-md" />
                <div className="mt-4 space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-muted/50 h-8 w-full rounded-md" />
                  ))}
                </div>
              </div>
              {/* Main Content Mockup */}
              <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-muted text-muted-foreground flex h-10 flex-1 items-center rounded-md px-4 text-sm">
                    <LinkIcon className="mr-2 size-4" /> {t("hero.mockupPlaceholder")}
                  </div>
                  <Button size="icon">
                    <Sparkles className="size-4" />
                  </Button>
                </div>
                <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8">
                  <Bot className="size-12 opacity-20" />
                  <p>{t("hero.aiReady")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Problem Section */}
        <section className="bg-muted/30 border-y py-24">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-16 space-y-4 text-center">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {t("problem.title")}
              </h2>
              <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
                {t("problem.subtitle")}
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <Card className="bg-background">
                <CardHeader>
                  <div className="bg-destructive/10 text-destructive mb-4 flex size-10 items-center justify-center rounded-lg">
                    <FileText className="size-5" />
                  </div>
                  <CardTitle>{t("problem.cards.0.title")}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {t("problem.cards.0.description")}
                </CardContent>
              </Card>
              <Card className="bg-background">
                <CardHeader>
                  <div className="bg-destructive/10 text-destructive mb-4 flex size-10 items-center justify-center rounded-lg">
                    <Copy className="size-5" />
                  </div>
                  <CardTitle>{t("problem.cards.1.title")}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {t("problem.cards.1.description")}
                </CardContent>
              </Card>
              <Card className="bg-background">
                <CardHeader>
                  <div className="bg-destructive/10 text-destructive mb-4 flex size-10 items-center justify-center rounded-lg">
                    <Calendar className="size-5" />
                  </div>
                  <CardTitle>{t("problem.cards.2.title")}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {t("problem.cards.2.description")}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mb-16 space-y-4 text-center">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {t("features.title")}
              </h2>
              <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
                {t("features.subtitle")}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <Card>
                <CardHeader>
                  <div className="mb-4 flex gap-2">
                    <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
                      <Youtube className="size-4" />
                    </div>
                    <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
                      <LinkIcon className="size-4" />
                    </div>
                    <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
                      <Mic className="size-4" />
                    </div>
                  </div>
                  <CardTitle>{t("features.items.0.title")}</CardTitle>
                  <CardDescription>{t("features.items.0.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {t("features.items.0.description")}
                </CardContent>
              </Card>

              {/* Feature 2 */}
              <Card>
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-4 flex size-8 items-center justify-center rounded-md">
                    <Copy className="size-4" />
                  </div>
                  <CardTitle>{t("features.items.1.title")}</CardTitle>
                  <CardDescription>{t("features.items.1.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {t("features.items.1.description")}
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card>
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-4 flex size-8 items-center justify-center rounded-md">
                    <MessageSquare className="size-4" />
                  </div>
                  <CardTitle>{t("features.items.2.title")}</CardTitle>
                  <CardDescription>{t("features.items.2.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {t("features.items.2.description")}
                </CardContent>
              </Card>

              {/* Feature 4 */}
              <Card>
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-4 flex size-8 items-center justify-center rounded-md">
                    <Calendar className="size-4" />
                  </div>
                  <CardTitle>{t("features.items.3.title")}</CardTitle>
                  <CardDescription>{t("features.items.3.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {t("features.items.3.description")}
                </CardContent>
              </Card>

              {/* Feature 5 */}
              <Card>
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-4 flex size-8 items-center justify-center rounded-md">
                    <Lightbulb className="size-4" />
                  </div>
                  <CardTitle>{t("features.items.4.title")}</CardTitle>
                  <CardDescription>{t("features.items.4.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {t("features.items.4.description")}
                </CardContent>
              </Card>

              {/* Feature 6 */}
              <Card>
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-4 flex size-8 items-center justify-center rounded-md">
                    <LineChart className="size-4" />
                  </div>
                  <CardTitle>{t("features.items.5.title")}</CardTitle>
                  <CardDescription>{t("features.items.5.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {t("features.items.5.description")}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="bg-muted/30 border-y py-24">
          <div className="container mx-auto max-w-4xl px-4">
            <div className="mb-16 space-y-4 text-center">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {t("howItWorks.title")}
              </h2>
              <p className="text-muted-foreground text-lg">{t("howItWorks.subtitle")}</p>
            </div>

            <div className="before:via-border relative space-y-12 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:to-transparent md:before:mx-auto md:before:translate-x-0">
              {/* Step 1 */}
              <div className="group is-active relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
                <div className="bg-background text-primary z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-semibold shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  1
                </div>
                <div className="bg-background w-[calc(100%-4rem)] rounded-xl border p-6 shadow-sm md:w-[calc(50%-2.5rem)]">
                  <h3 className="mb-2 text-lg font-semibold">{t("howItWorks.steps.0.title")}</h3>
                  <p className="text-muted-foreground text-sm">
                    {t("howItWorks.steps.0.description")}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="group is-active relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
                <div className="bg-background text-primary z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-semibold shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  2
                </div>
                <div className="bg-background w-[calc(100%-4rem)] rounded-xl border p-6 shadow-sm md:w-[calc(50%-2.5rem)]">
                  <h3 className="mb-2 text-lg font-semibold">{t("howItWorks.steps.0.title")}</h3>
                  <p className="text-muted-foreground text-sm">
                    {t("howItWorks.steps.1.description")}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="group is-active relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
                <div className="bg-background text-primary z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-semibold shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  3
                </div>
                <div className="bg-background w-[calc(100%-4rem)] rounded-xl border p-6 shadow-sm md:w-[calc(50%-2.5rem)]">
                  <h3 className="mb-2 text-lg font-semibold">{t("howItWorks.steps.2.title")}</h3>
                  <p className="text-muted-foreground text-sm">
                    {t("howItWorks.steps.2.description")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-16 space-y-4 text-center">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {t("pricing.title")}
              </h2>
              <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
                {t("pricing.subtitle")}
              </p>
            </div>

            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
              {/* Free Plan */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl">{t("pricing.plans.free.name")}</CardTitle>
                  <CardDescription>{t("pricing.plans.free.description")}</CardDescription>
                  <div className="mt-4 flex items-baseline text-4xl font-bold">
                    $0
                    <span className="text-muted-foreground ml-1 text-xl font-medium">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="text-muted-foreground space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" />{" "}
                      {t("pricing.plans.free.features.0")}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" />{" "}
                      {t("pricing.plans.free.features.1")}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" />{" "}
                      {t("pricing.plans.free.features.2")}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" />{" "}
                      {t("pricing.plans.free.features.3")}
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/signup">{t("pricing.cta.getStarted")}</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Plus Plan */}
              <Card className="border-primary relative flex flex-col shadow-md">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    {t("pricing.popular")}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl">{t("pricing.plans.plus.name")}</CardTitle>
                  <CardDescription>{t("pricing.plans.plus.description")}</CardDescription>
                  <div className="mt-4 flex items-baseline text-4xl font-bold">
                    $19
                    <span className="text-muted-foreground ml-1 text-xl font-medium">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="text-muted-foreground space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" />{" "}
                      {t("pricing.plans.plus.features.0")}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" />{" "}
                      {t("pricing.plans.plus.features.1")}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" />{" "}
                      {t("pricing.plans.plus.features.2")}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" />{" "}
                      {t("pricing.plans.plus.features.3")}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" />{" "}
                      {t("pricing.plans.plus.features.4")}
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" asChild>
                    <Link href="/signup">{t("pricing.cta.subscribePlus")}</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Pro Plan */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl">{t("pricing.plans.pro.name")}</CardTitle>
                  <CardDescription>{t("pricing.plans.pro.description")}</CardDescription>
                  <div className="mt-4 flex items-baseline text-4xl font-bold">
                    $49
                    <span className="text-muted-foreground ml-1 text-xl font-medium">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="text-muted-foreground space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" />{" "}
                      {t("pricing.plans.pro.features.0")}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" />{" "}
                      {t("pricing.plans.pro.features.1")}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" />{" "}
                      {t("pricing.plans.pro.features.2")}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" />{" "}
                      {t("pricing.plans.pro.features.3")}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" />{" "}
                      {t("pricing.plans.pro.features.4")}
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/signup">{t("pricing.cta.subscribePro")}</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary text-primary-foreground border-t py-24">
          <div className="container mx-auto max-w-3xl space-y-8 px-4 text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{t("cta.title")}</h2>
            <p className="text-xl opacity-90">{t("cta.subtitle")}</p>
            <Button size="lg" variant="secondary" className="h-12 px-8 text-base" asChild>
              <Link href="/signup">{t("cta.button")}</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t py-12">
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 md:flex-row">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Send className="text-primary size-5" />
            Telegram Content OS
          </div>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Telegram Content OS. {t("footer.rights")}
          </p>
          <div className="text-muted-foreground flex gap-4 text-sm">
            <a href="#" className="hover:text-foreground transition-colors">
              {t("footer.terms")}
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              {t("footer.privacy")}
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              {t("footer.contact")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
