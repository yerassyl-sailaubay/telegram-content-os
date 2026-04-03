"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GrowthDataPoint, GrowthTrend } from "@/lib/analytics/telegram-enhanced";

type GrowthChartProps = {
  dataPoints: GrowthDataPoint[];
  rate: number;
  trend: GrowthTrend;
};

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function TrendBadge({ trend, rate }: { trend: GrowthTrend; rate: number }) {
  const t = useTranslations("analytics");

  if (trend === "up") {
    return (
      <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="h-3 w-3" />
        {t("growthRate", { rate: Math.abs(rate) })}
      </div>
    );
  }
  if (trend === "down") {
    return (
      <div className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
        <TrendingDown className="h-3 w-3" />
        {t("growthRateNegative", { rate: Math.abs(rate) })}
      </div>
    );
  }
  return (
    <div className="bg-muted text-muted-foreground flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
      <Minus className="h-3 w-3" />
      {t("growthStable")}
    </div>
  );
}

export function GrowthChart({ dataPoints, rate, trend }: GrowthChartProps) {
  const t = useTranslations("analytics");
  const locale = useLocale();

  const isEmpty = dataPoints.length === 0;

  const chartData = dataPoints.map((d) => ({
    ...d,
    date: formatDate(d.date, locale),
  }));

  return (
    <Card data-testid="growth-chart" className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">{t("subscriberGrowth")}</CardTitle>
        {!isEmpty && <TrendBadge trend={trend} rate={rate} />}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[240px] items-center justify-center text-center">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">{t("noGrowthData")}</p>
              <p className="text-muted-foreground text-xs">{t("noGrowthDataDescription")}</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="subscribers"
                name={t("subscribers")}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
