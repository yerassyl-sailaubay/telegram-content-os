"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  MousePointerClick,
  TrendingUp,
  Layers,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetricsCard } from "./metrics-card";
import { EngagementChart } from "./engagement-chart";
import { PlatformComparison } from "./platform-comparison";
import { PostingHeatmap } from "./posting-heatmap";
import { PostsTable } from "./posts-table";
import {
  getAnalyticsDashboard,
  type AnalyticsDashboardData,
  type DateRange,
  type ChannelOption,
} from "@/server/actions/analytics";

type AnalyticsDashboardProps = {
  initialData: AnalyticsDashboardData | null;
  initialError?: string;
};

export function AnalyticsDashboard({
  initialData,
  initialError,
}: AnalyticsDashboardProps) {
  const t = useTranslations("analytics");

  const [data, setData] = React.useState<AnalyticsDashboardData | null>(
    initialData,
  );
  const [error, setError] = React.useState<string | null>(initialError ?? null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange>("30d");
  const [channelId, setChannelId] = React.useState<string>("all");

  const channels: ChannelOption[] = data?.channels ?? [];

  async function loadData(range: DateRange, channel: string) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAnalyticsDashboard(
        range,
        channel === "all" ? undefined : channel,
      );
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleDateRangeChange(range: DateRange) {
    setDateRange(range);
    loadData(range, channelId);
  }

  function handleChannelChange(channel: string) {
    setChannelId(channel);
    loadData(dateRange, channel);
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">{t("errorTitle")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          onClick={() => loadData(dateRange, channelId)}
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          {t("retry")}
        </Button>
      </div>
    );
  }

  const overview = data?.overview;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {channels.length > 0 && (
            <Select value={channelId} onValueChange={handleChannelChange}>
              <SelectTrigger className="h-9 w-[180px] text-sm">
                <SelectValue placeholder={t("allChannels")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allChannels")}</SelectItem>
                {channels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    {ch.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            {t("loading")}
          </div>
        )}
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title={t("totalCrossPosts")}
          value={(overview?.totalCrossPosts ?? 0).toLocaleString()}
          icon={<Layers className="h-5 w-5" />}
        />
        <MetricsCard
          title={t("totalEngagement")}
          value={(overview?.totalEngagement ?? 0).toLocaleString()}
          icon={<MousePointerClick className="h-5 w-5" />}
        />
        <MetricsCard
          title={t("avgEngagementRate")}
          value={`${overview?.avgEngagementRate ?? 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricsCard
          title={t("activePlatforms")}
          value={(overview?.activePlatforms ?? 0).toLocaleString()}
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <EngagementChart
          data={data?.engagementOverTime ?? []}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
        />
        <PlatformComparison data={data?.platformComparison ?? []} />
      </div>

      {/* Heatmap */}
      <PostingHeatmap data={data?.heatmap ?? []} />

      {/* Posts Table */}
      <PostsTable data={data?.recentPosts ?? []} />
    </div>
  );
}
