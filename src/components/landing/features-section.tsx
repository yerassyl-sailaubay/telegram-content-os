"use client";

import { useTranslations } from "next-intl";
import { Brain, CalendarClock, BarChart3, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const featureIcons = [Brain, CalendarClock, BarChart3, Link2];

export function FeaturesSection() {
  const t = useTranslations("landing.features");
  const items = t.raw("items") as Array<{ title: string; description: string }>;

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <div className="border-border bg-muted/50 text-muted-foreground mb-4 inline-block rounded-full border px-3 py-1 text-xs font-medium">
            {t("badge")}
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-balance">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => {
            const Icon = featureIcons[index % featureIcons.length];
            return (
              <Card
                key={index}
                className="group relative overflow-hidden transition-shadow duration-300 hover:shadow-md"
              >
                <CardContent className="flex flex-col gap-4 p-6">
                  <div className="bg-primary/10 text-primary group-hover:bg-primary/15 flex size-10 items-center justify-center rounded-lg transition-colors">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="leading-snug font-semibold">{item.title}</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
