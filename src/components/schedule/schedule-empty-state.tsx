"use client";

import { CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";

export function ScheduleEmptyState() {
  const t = useTranslations("uxStates.empty.schedule");

  return (
    <EmptyState
      icon={CalendarDays}
      title={t("title")}
      description={t("description")}
      actionLabel={t("action")}
      actionHref="/dashboard/crosspost"
    />
  );
}
