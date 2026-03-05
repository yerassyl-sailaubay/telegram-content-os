"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HeroSection() {
  const t = useTranslations("landing.hero");
  const locale = useLocale();

  return (
    <section className="relative overflow-hidden py-24 sm:py-32 lg:py-40">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle, oklch(0.2 0.042 265) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div className="from-primary/10 via-primary/5 absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-br to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl px-6 text-center">
        <div className="border-border bg-muted/60 text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm">
          <Sparkles className="text-primary size-3" />
          {t("badge")}
        </div>

        <h1 className="text-foreground mx-auto max-w-4xl text-5xl font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
          {t("title")}{" "}
          <span
            className={cn(
              "relative inline-block",
              "from-foreground via-foreground/80 to-muted-foreground bg-gradient-to-r bg-clip-text text-transparent",
              "after:from-primary after:to-primary/40 after:absolute after:-bottom-1 after:left-0 after:h-[3px] after:w-full after:rounded-full after:bg-gradient-to-r",
            )}
          >
            {t("titleHighlight")}
          </span>
        </h1>

        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-balance">
          {t("subtitle")}
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="group h-12 px-8 text-base">
            <Link href={`/${locale}/signup`}>
              {t("ctaSignup")}
              <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
            <Link href={`/${locale}/login`}>{t("ctaLogin")}</Link>
          </Button>
        </div>

        <p className="text-muted-foreground mt-5 text-xs">{t("ctaNote")}</p>

        <div className="mx-auto mt-16 max-w-3xl">
          <div className="border-border bg-card/80 relative rounded-2xl border p-2 shadow-2xl shadow-black/10 backdrop-blur-sm dark:shadow-black/30">
            <div className="flex items-center gap-1.5 px-3 py-2">
              <div className="bg-destructive/60 size-3 rounded-full" />
              <div className="size-3 rounded-full bg-amber-400/60" />
              <div className="size-3 rounded-full bg-emerald-400/60" />
              <div className="text-muted-foreground/50 mx-auto text-xs">
                app.telegram-content-os.io
              </div>
            </div>
            <div className="bg-muted/30 rounded-xl p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Cross-Posts", value: "48", change: "+12%" },
                  { label: "Engagements", value: "3.2K", change: "+28%" },
                  { label: "Scheduled", value: "7", change: "this week" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="border-border/50 bg-card rounded-lg border px-4 py-3 text-left"
                  >
                    <p className="text-muted-foreground text-xs">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{stat.value}</p>
                    <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                      {stat.change}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {[
                  {
                    platform: "LinkedIn",
                    text: "5 strategies for building an engaged Telegram audience...",
                  },
                  {
                    platform: "Twitter",
                    text: "Thread: How I grew my Telegram channel to 10k subscribers 🧵",
                  },
                ].map((post) => (
                  <div
                    key={post.platform}
                    className="border-border/50 bg-card flex items-start gap-3 rounded-lg border px-4 py-3"
                  >
                    <div className="bg-primary/10 text-primary mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                      {post.platform[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground text-xs font-medium">{post.platform}</p>
                      <p className="mt-0.5 truncate text-sm">{post.text}</p>
                    </div>
                    <div className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      Live
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
