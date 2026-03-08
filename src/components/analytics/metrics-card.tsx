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
  description?: string;
  className?: string;
};

export function MetricsCard({
  title,
  value,
  icon,
  trend,
  trendLabel,
  description,
  className,
}: MetricsCardProps) {
  const hasTrend = trend !== undefined;
  const isUp = hasTrend && trend > 0;
  const isDown = hasTrend && trend < 0;
  const isFlat = hasTrend && trend === 0;

  return (
    <Card
      className={cn(
        "border-border/70 bg-card/95 relative !gap-0 overflow-hidden !py-0 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg",
        className,
      )}
      data-testid="metrics-card"
    >
      <div className="via-primary/60 absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
              {title}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
            {description ? (
              <p className="text-muted-foreground mt-3 max-w-[22rem] text-sm leading-6">
                {description}
              </p>
            ) : null}
            {hasTrend && (
              <div className="mt-4 flex items-center gap-1 text-xs">
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
          <div className="from-primary/16 text-primary via-primary/10 to-primary/5 border-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
