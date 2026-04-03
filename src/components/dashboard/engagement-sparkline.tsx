"use client";

import { useTranslations, useLocale } from "next-intl";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EngagementPoint } from "@/server/actions/dashboard";

type EngagementSparklineProps = {
  data: EngagementPoint[];
};

function formatDay(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, { weekday: "short" });
}

export function EngagementSparkline({ data }: EngagementSparklineProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  const isEmpty = data.length === 0 || data.every((d) => d.total === 0);

  const chartData = data.map((d) => ({
    ...d,
    day: formatDay(d.date, locale),
  }));

  return (
    <Card data-testid="engagement-sparkline">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{t("sparklineTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[100px] items-center justify-center text-center">
            <p className="text-muted-foreground text-xs">{t("sparklineEmpty")}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -32, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "6px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: "11px",
                }}
              />
              <Line
                type="monotone"
                dataKey="total"
                name={t("sparklineLabel")}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
