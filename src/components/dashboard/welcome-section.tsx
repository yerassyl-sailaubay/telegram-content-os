"use client";

import { useTranslations, useLocale } from "next-intl";

type WelcomeSectionProps = {
  userName: string | null;
  userEmail: string | null;
};

function formatDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function WelcomeSection({ userName, userEmail }: WelcomeSectionProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  const displayName = userName ?? userEmail ?? t("welcomeFallbackName");
  const today = formatDate(new Date(), locale);

  return (
    <div data-testid="welcome-section" className="space-y-1">
      <h1 className="max-w-[calc(100vw-2rem)] truncate text-2xl font-bold tracking-tight md:max-w-2xl">
        {t("welcomeBack", { name: displayName })}
      </h1>
      <p className="text-muted-foreground text-sm">{today}</p>
    </div>
  );
}
