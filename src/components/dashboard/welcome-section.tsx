"use client";

import { useTranslations } from "next-intl";

type WelcomeSectionProps = {
  userName: string | null;
  userEmail: string | null;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function WelcomeSection({ userName, userEmail }: WelcomeSectionProps) {
  const t = useTranslations("dashboard");

  const displayName = userName ?? userEmail ?? t("welcomeFallbackName");
  const today = formatDate(new Date());

  return (
    <div data-testid="welcome-section" className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("welcomeBack", { name: displayName })}
      </h1>
      <p className="text-muted-foreground text-sm">{today}</p>
    </div>
  );
}
