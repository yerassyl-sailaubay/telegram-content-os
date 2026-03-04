"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { GrowthChart } from "./growth-chart";
import { ContentPerformanceTable } from "./content-performance-table";
import {
  fetchChannelGrowthRate,
  fetchBestPostingTimes,
  fetchContentPerformance,
} from "@/server/actions/analytics-telegram";
import type { ChannelWithPostCount } from "@/server/actions/channels";
import type {
  ChannelGrowthResult,
  BestPostingTimesResult,
  ContentPerformanceResult,
  HeatmapEntry,
  DateRange,
} from "@/lib/analytics/telegram-enhanced";

type TelegramDateRange = "7d" | "30d" | "90d";

type TelegramAnalyticsProps = {
  channels: ChannelWithPostCount[];
};

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DAY_SHORT: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

const HOUR_MARKERS = [0, 3, 6, 9, 12, 15, 18, 21];

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

function getIntensityClass(value: number, max: number): string {
  if (max === 0 || value === 0) return "bg-muted/30";
  const ratio = value / max;
  if (ratio < 0.2) return "bg-primary/15";
  if (ratio < 0.4) return "bg-primary/30";
  if (ratio < 0.6) return "bg-primary/50";
  if (ratio < 0.8) return "bg-primary/70";
  return "bg-primary/90";
}

function TelegramPostingHeatmap({ data }: { data: HeatmapEntry[] }) {
  const t = useTranslations("analytics");

  const isEmpty = data.length === 0;
  const maxValue = isEmpty ? 0 : Math.max(...data.map((d) => d.avgViews));

  const grid: Record<string, number[]> = {};
  for (const day of DAY_ORDER) {
    grid[day] = Array(24).fill(0);
  }
  for (const entry of data) {
    if (grid[entry.day]) {
      grid[entry.day]![entry.hour] = entry.avgViews;
    }
  }

  return (
    <Card data-testid="telegram-heatmap">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{t("telegramBestPostingTimes")}</CardTitle>
        <p className="text-muted-foreground text-xs">{t("telegramHeatmapSubtitle")}</p>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[200px] items-center justify-center text-center">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">{t("noDataYet")}</p>
              <p className="text-muted-foreground text-xs">{t("noDataDescription")}</p>
            </div>
          </div>
        ) : (
          <TooltipProvider delayDuration={100}>
            <div className="overflow-x-auto">
              <div className="min-w-[480px]">
                <div className="mb-1 flex">
                  <div className="w-10 shrink-0" />
                  <div className="relative flex flex-1">
                    {HOUR_MARKERS.map((h) => (
                      <span
                        key={h}
                        className="text-muted-foreground absolute text-[10px]"
                        style={{ left: `${(h / 24) * 100}%` }}
                      >
                        {formatHour(h)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {DAY_ORDER.map((day) => (
                    <div key={day} className="flex items-center gap-1">
                      <span className="text-muted-foreground w-9 shrink-0 text-right text-[10px]">
                        {DAY_SHORT[day]}
                      </span>
                      <div className="flex flex-1 gap-px">
                        {Array.from({ length: 24 }).map((_, hour) => {
                          const value = grid[day]![hour] ?? 0;
                          return (
                            <Tooltip key={hour}>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "h-5 flex-1 cursor-pointer rounded-[2px] transition-opacity hover:opacity-80",
                                    getIntensityClass(value, maxValue),
                                  )}
                                />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p className="font-medium">
                                  {DAY_SHORT[day]} {formatHour(hour)}
                                </p>
                                <p>{t("avgViewsCount", { count: value })}</p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <span className="text-muted-foreground text-[10px]">{t("legendLow")}</span>
                  {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => (
                    <div
                      key={ratio}
                      className={cn(
                        "h-3 w-5 rounded-[2px]",
                        ratio === 0
                          ? "bg-muted/30"
                          : ratio < 0.2
                            ? "bg-primary/15"
                            : ratio < 0.4
                              ? "bg-primary/30"
                              : ratio < 0.6
                                ? "bg-primary/50"
                                : ratio < 0.8
                                  ? "bg-primary/70"
                                  : "bg-primary/90",
                      )}
                    />
                  ))}
                  <span className="text-muted-foreground text-[10px]">{t("legendHigh")}</span>
                </div>
              </div>
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}

const TELEGRAM_DATE_RANGES: TelegramDateRange[] = ["7d", "30d", "90d"];

function toDateRange(range: TelegramDateRange): DateRange {
  const end = new Date();
  const start = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  start.setDate(start.getDate() - days);
  return { start, end };
}

export function TelegramAnalytics({ channels }: TelegramAnalyticsProps) {
  const t = useTranslations("analytics");

  const defaultChannelId = channels[0]?.id ?? "";

  const [channelId, setChannelId] = React.useState<string>(defaultChannelId);
  const [dateRange, setDateRange] = React.useState<TelegramDateRange>("30d");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [growthData, setGrowthData] = React.useState<ChannelGrowthResult | null>(null);
  const [heatmapData, setHeatmapData] = React.useState<BestPostingTimesResult | null>(null);
  const [performanceData, setPerformanceData] = React.useState<ContentPerformanceResult | null>(
    null,
  );

  async function loadData(cId: string, range: TelegramDateRange) {
    if (!cId) return;
    setIsLoading(true);
    setError(null);
    try {
      const dr = toDateRange(range);
      const [growthRes, heatmapRes, perfRes] = await Promise.all([
        fetchChannelGrowthRate(cId, dr),
        fetchBestPostingTimes(cId),
        fetchContentPerformance(cId, dr),
      ]);

      if (growthRes.success) setGrowthData(growthRes.data);
      if (heatmapRes.success) setHeatmapData(heatmapRes.data);
      if (perfRes.success) setPerformanceData(perfRes.data);

      const firstError =
        (!growthRes.success && growthRes.error) ||
        (!heatmapRes.success && heatmapRes.error) ||
        (!perfRes.success && perfRes.error) ||
        null;
      if (firstError) setError(firstError);
    } finally {
      setIsLoading(false);
    }
  }

  // Load on mount when channel is available
  React.useEffect(() => {
    if (channelId) {
      void loadData(channelId, dateRange);
    }
  }, []);

  function handleChannelChange(id: string) {
    setChannelId(id);
    void loadData(id, dateRange);
  }

  function handleDateRangeChange(range: TelegramDateRange) {
    setDateRange(range);
    void loadData(channelId, range);
  }

  if (channels.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground text-sm font-medium">{t("noChannelsForTelegram")}</p>
      </div>
    );
  }

  return (
    <div data-testid="telegram-analytics" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={channelId} onValueChange={handleChannelChange}>
            <SelectTrigger className="h-9 w-[200px] text-sm">
              <SelectValue placeholder={t("selectChannel")} />
            </SelectTrigger>
            <SelectContent>
              {channels.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>
                  {ch.title ?? ch.username ?? ch.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            {TELEGRAM_DATE_RANGES.map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? "default" : "ghost"}
                size="sm"
                className="h-9 px-3 text-xs"
                onClick={() => handleDateRangeChange(range)}
              >
                {t(`range_${range}`)}
              </Button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            {t("loading")}
          </div>
        )}
      </div>

      {error && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-6 px-2 text-xs"
            onClick={() => void loadData(channelId, dateRange)}
          >
            {t("retry")}
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <GrowthChart
          dataPoints={growthData?.dataPoints ?? []}
          rate={growthData?.rate ?? 0}
          trend={growthData?.trend ?? "stable"}
        />
        <TelegramPostingHeatmap data={heatmapData?.heatmap ?? []} />
      </div>

      <ContentPerformanceTable posts={performanceData?.posts ?? []} />
    </div>
  );
}
