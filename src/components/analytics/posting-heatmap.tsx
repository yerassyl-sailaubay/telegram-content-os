"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { HeatmapCell } from "@/server/actions/analytics";

type PostingHeatmapProps = {
  data: HeatmapCell[];
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Show every 3 hours on x-axis
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

export function PostingHeatmap({ data }: PostingHeatmapProps) {
  const t = useTranslations("analytics");

  const isEmpty = data.every((d) => d.value === 0);
  const maxValue = Math.max(...data.map((d) => d.value));

  // Build 7×24 grid: grid[day][hour]
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const cell of data) {
    if (cell.day >= 0 && cell.day < 7 && cell.hour >= 0 && cell.hour < 24) {
      grid[cell.day][cell.hour] = cell.value;
    }
  }

  return (
    <Card data-testid="posting-heatmap">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          {t("bestPostingTimes")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("heatmapSubtitle")}</p>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[200px] items-center justify-center text-center">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("noDataYet")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("noDataDescription")}
              </p>
            </div>
          </div>
        ) : (
          <TooltipProvider delayDuration={100}>
            <div className="overflow-x-auto">
              <div className="min-w-[480px]">
                {/* Hour labels */}
                <div className="mb-1 flex">
                  <div className="w-10 shrink-0" />
                  <div className="relative flex flex-1">
                    {HOUR_MARKERS.map((h) => (
                      <span
                        key={h}
                        className="absolute text-[10px] text-muted-foreground"
                        style={{ left: `${(h / 24) * 100}%` }}
                      >
                        {formatHour(h)}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Grid rows */}
                <div className="mt-3 space-y-1">
                  {DAY_LABELS.map((day, dayIdx) => (
                    <div key={day} className="flex items-center gap-1">
                      <span className="w-9 shrink-0 text-right text-[10px] text-muted-foreground">
                        {day}
                      </span>
                      <div className="flex flex-1 gap-px">
                        {Array.from({ length: 24 }).map((_, hour) => {
                          const value = grid[dayIdx][hour];
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
                                  {day} {formatHour(hour)}
                                </p>
                                <p>
                                  {t("engagementCount", { count: value })}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Legend */}
                <div className="mt-3 flex items-center justify-end gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {t("legendLow")}
                  </span>
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
                  <span className="text-[10px] text-muted-foreground">
                    {t("legendHigh")}
                  </span>
                </div>
              </div>
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
