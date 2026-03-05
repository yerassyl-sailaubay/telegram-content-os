"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function HowItWorksSection() {
  const t = useTranslations("landing.howItWorks");
  const steps = t.raw("steps") as Array<{
    step: string;
    title: string;
    description: string;
  }>;

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <div className="border-border bg-muted/50 text-muted-foreground mb-4 inline-block rounded-full border px-3 py-1 text-xs font-medium">
            {t("badge")}
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-balance">
            {t("subtitle")}
          </p>
        </div>

        <div className="relative mt-14">
          <div
            aria-hidden="true"
            className="via-border absolute top-7 left-1/2 hidden h-0.5 w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent to-transparent lg:block"
          />

          <div className="grid gap-8 lg:grid-cols-3">
            {steps.map((step, index) => (
              <div key={index} className="relative flex flex-col items-center text-center">
                <div
                  className={cn(
                    "border-border bg-background text-foreground relative z-10 flex size-14 items-center justify-center rounded-full border-2 font-mono text-lg font-bold shadow-sm",
                    "ring-background ring-4",
                  )}
                >
                  {step.step}
                </div>
                <div className="mt-5 max-w-xs">
                  <h3 className="text-base font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
