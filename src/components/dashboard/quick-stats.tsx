"use client";

import { useTranslations } from "next-intl";
import { CalendarClock, TrendingUp, Sparkles } from "lucide-react";
import { MetricsCard } from "@/components/analytics/metrics-card";
import type { QuickStats } from "@/server/actions/dashboard";

type QuickStatsProps = {
  data: QuickStats;
};

export function QuickStatsSection({ data }: QuickStatsProps) {
  const t = useTranslations("dashboard");

  const aiValue =
    data.crossPostsLimit === -1
      ? `${data.crossPostsUsed} / ∞`
      : `${data.crossPostsUsed} / ${data.crossPostsLimit}`;

  return (
    <div data-testid="quick-stats" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <MetricsCard
        title={t("statScheduled")}
        value={data.scheduledCount}
        icon={<CalendarClock className="h-5 w-5" />}
        description={t("statScheduledDescription")}
      />
      <MetricsCard
        title={t("statWeeklyEngagement")}
        value={data.weeklyEngagement.toLocaleString()}
        icon={<TrendingUp className="h-5 w-5" />}
        description={t("statWeeklyEngagementDescription")}
      />
      <MetricsCard
        title={t("statAiGenerations")}
        value={aiValue}
        icon={<Sparkles className="h-5 w-5" />}
        description={t("statAiDescription")}
      />
    </div>
  );
}
