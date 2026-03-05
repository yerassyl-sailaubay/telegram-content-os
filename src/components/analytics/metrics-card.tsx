"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricsCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number; // positive = up, negative = down, undefined = no comparison
  trendLabel?: string;
  className?: string;
};

export function MetricsCard({
  title,
  value,
  icon,
  trend,
  trendLabel,
  className,
}: MetricsCardProps) {
  const hasTrend = trend !== undefined;
  const isUp = hasTrend && trend > 0;
  const isDown = hasTrend && trend < 0;
  const isFlat = hasTrend && trend === 0;

  return (
    <Card
      className={cn("relative overflow-hidden", className)}
      data-testid="metrics-card"
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {hasTrend && (
              <div className="flex items-center gap-1 text-xs">
                {isUp && (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                )}
                {isDown && (
                  <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                )}
                {isFlat && (
                  <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "font-medium",
                    isUp && "text-emerald-600 dark:text-emerald-400",
                    isDown && "text-rose-600 dark:text-rose-400",
                    isFlat && "text-muted-foreground",
                  )}
                >
                  {isUp && "+"}
                  {trend}%
                </span>
                {trendLabel && (
                  <span className="text-muted-foreground">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
