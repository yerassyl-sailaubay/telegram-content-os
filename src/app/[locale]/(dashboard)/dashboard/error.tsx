"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/ui/error-state";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  const t = useTranslations("uxStates.error");

  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <ErrorState
        title={t("title")}
        description={t("description")}
        onRetry={reset}
        retryLabel={t("retry")}
      />
    </div>
  );
}
