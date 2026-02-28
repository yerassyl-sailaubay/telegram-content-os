"use client";

import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";

export function MediaEmptyState() {
  const t = useTranslations("uxStates.empty.media");

  return (
    <EmptyState
      icon={ImageIcon}
      title={t("title")}
      description={t("description")}
      actionLabel={t("action")}
      actionHref="/dashboard/media"
    />
  );
}
