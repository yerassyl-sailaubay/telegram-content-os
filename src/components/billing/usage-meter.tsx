"use client";

import { Progress } from "@/components/ui/progress";

type UsageMeterProps = {
  label: string;
  used: number;
  limit: number;
};

export function UsageMeter({ label, used, limit }: UsageMeterProps) {
  const isUnlimited = !isFinite(limit);
  const percentage = isUnlimited ? 0 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isWarning = !isUnlimited && percentage >= 80;
  const isExceeded = !isUnlimited && used >= limit;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={
            isExceeded
              ? "text-destructive font-medium"
              : isWarning
                ? "font-medium text-orange-500"
                : "text-foreground"
          }
        >
          {isUnlimited ? `${used} / Unlimited` : `${used} / ${limit}`}
        </span>
      </div>
      {!isUnlimited && <Progress value={percentage} />}
    </div>
  );
}
