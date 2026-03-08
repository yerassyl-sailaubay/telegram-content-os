"use client";

import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformComparisonData } from "@/server/actions/analytics";

type PlatformComparisonProps = {
  data: PlatformComparisonData[];
};

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "#0a66c2",
  twitter: "#1d9bf0",
};

function getPlatformColor(platform: string): string {
  return PLATFORM_COLORS[platform.toLowerCase()] ?? "#6366f1";
}

export function PlatformComparison({ data }: PlatformComparisonProps) {
  const t = useTranslations("analytics");

  const isEmpty = data.length === 0;

  // Transform data for grouped bar chart format
  const metrics = ["likes", "comments", "shares", "clicks"] as const;
  const chartData = metrics.map((metric) => {
    const entry: Record<string, string | number> = {
      metric: t(`metric_${metric}`),
    };
    for (const platform of data) {
      entry[platform.platform] = platform[metric];
    }
    return entry;
  });

  return (
    <Card data-testid="platform-comparison" className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{t("platformComparison")}</CardTitle>
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
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="metric" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
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
              {data.map((platform) => (
                <Bar
                  key={platform.platform}
                  dataKey={platform.platform}
                  name={platform.platform === "linkedin" ? "LinkedIn" : "Twitter / X"}
                  fill={getPlatformColor(platform.platform)}
                  radius={[3, 3, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
