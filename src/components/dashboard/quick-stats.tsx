"use client";

import { useTranslations } from "next-intl";
import { Share2, CalendarClock, TrendingUp, Plug } from "lucide-react";
import { MetricsCard } from "@/components/analytics/metrics-card";
import type { QuickStats } from "@/server/actions/dashboard";

type QuickStatsProps = {
  data: QuickStats;
};

export function QuickStatsSection({ data }: QuickStatsProps) {
  const t = useTranslations("dashboard");

  const crossPostValue =
    data.crossPostsLimit === -1
      ? `${data.crossPostsUsed} / \u221e`
      : `${data.crossPostsUsed} / ${data.crossPostsLimit}`;

  return (
    <div data-testid="quick-stats" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricsCard
        title={t("statCrossPosts")}
        value={crossPostValue}
        icon={<Share2 className="h-5 w-5" />}
      />
      <MetricsCard
        title={t("statScheduled")}
        value={data.scheduledCount}
        icon={<CalendarClock className="h-5 w-5" />}
      />
      <MetricsCard
        title={t("statWeeklyEngagement")}
        value={data.weeklyEngagement.toLocaleString()}
        icon={<TrendingUp className="h-5 w-5" />}
      />
      <MetricsCard
        title={t("statConnectedPlatforms")}
        value={data.connectedPlatforms}
        icon={<Plug className="h-5 w-5" />}
      />
    </div>
  );
}
