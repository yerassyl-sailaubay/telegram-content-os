"use client";

import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { EngagementDataPoint, DateRange } from "@/server/actions/analytics";

type EngagementChartProps = {
  data: EngagementDataPoint[];
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
};

const DATE_RANGES: DateRange[] = ["7d", "30d", "90d"];

function formatDate(dateStr: string, range: DateRange): string {
  const date = new Date(dateStr);
  if (range === "7d") {
    return date.toLocaleDateString("en", { weekday: "short" });
  }
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export function EngagementChart({ data, dateRange, onDateRangeChange }: EngagementChartProps) {
  const t = useTranslations("analytics");

  const isEmpty = data.every((d) => d.total === 0);

  const chartData = data.map((d) => ({
    ...d,
    date: formatDate(d.date, dateRange),
  }));

  return (
    <Card data-testid="engagement-chart" className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">{t("engagementOverTime")}</CardTitle>
        <div className="flex gap-1">
          {DATE_RANGES.map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onDateRangeChange(range)}
            >
              {t(`range_${range}`)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[240px] items-center justify-center text-center">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">{t("noDataYet")}</p>
              <p className="text-muted-foreground text-xs">{t("noDataDescription")}</p>
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
              <Legend wrapperStyle={{ fontSize: "12px" }} iconType="circle" iconSize={8} />
              <Line
                type="monotone"
                dataKey="linkedin"
                name="LinkedIn"
                stroke="#0a66c2"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="twitter"
                name="Twitter / X"
                stroke="#1d9bf0"
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
