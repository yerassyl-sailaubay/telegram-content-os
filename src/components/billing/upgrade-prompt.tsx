"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UpgradePromptProps = {
  used: number;
  limit: number;
  nextPlanName: string;
  onUpgrade: () => void;
  loading?: boolean;
  className?: string;
};

export function UpgradePrompt({
  used,
  limit,
  nextPlanName,
  onUpgrade,
  loading,
  className,
}: UpgradePromptProps) {
  const t = useTranslations("billing");

  if (!isFinite(limit) || limit <= 0) return null;

  const percentage = (used / limit) * 100;
  if (percentage < 80) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-950/30",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          {t("upgradePromptTitle")}
        </p>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          {t("upgradePromptMessage", {
            used,
            limit,
            plan: nextPlanName,
          })}
        </p>
      </div>
      <Button
        size="sm"
        variant="default"
        className="shrink-0 bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
        onClick={onUpgrade}
        disabled={loading}
      >
        {loading ? "..." : t("upgradePromptAction")}
      </Button>
    </div>
  );
}
