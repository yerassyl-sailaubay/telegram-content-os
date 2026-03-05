"use client";

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
      className={cn("relative !gap-0 overflow-hidden !py-0", className)}
      data-testid="metrics-card"
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {hasTrend && (
              <div className="flex items-center gap-1 text-xs">
                {isUp && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                {isDown && <TrendingDown className="h-3.5 w-3.5 text-rose-500" />}
                {isFlat && <Minus className="text-muted-foreground h-3.5 w-3.5" />}
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
                {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
              </div>
            )}
          </div>
          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
