"use client";

import { useTranslations } from "next-intl";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, Activity } from "lucide-react";
import type { EngagementPoint } from "@/server/actions/dashboard";

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
    weekday: "short",
    day: "numeric",
  });
}

export function EngagementChart({
  data,
  locale,
  total,
}: {
  data: EngagementPoint[];
  locale: string;
  total: number;
}) {
  const t = useTranslations("dashboard");

  const chartData = data.map((d) => ({
    ...d,
    dateLabel: formatDate(d.date, locale),
  }));

  return (
    <Card className="border-border/70 bg-card/95 overflow-hidden shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4 w-4 text-emerald-500" />
            {t("statEngagementGrowth") || "Weekly Engagement Growth"}
          </CardTitle>
          <CardDescription>
            {t("statEngagementDescription") ||
              "Total engagement across your connected platforms over the last 7 days."}
          </CardDescription>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="h-4 w-4" />
          {total} interactions
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {data.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-center">
            <p className="text-muted-foreground text-sm font-medium">
              Not enough data to display growth.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
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
              <Area
                type="monotone"
                dataKey="total"
                name="Engagement"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorEngagement)"
                activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--primary))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
