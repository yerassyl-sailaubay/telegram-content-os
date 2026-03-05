"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";

export function PostsEmptyState() {
  const t = useTranslations("uxStates.empty.posts");

  return (
    <EmptyState
      icon={FileText}
      title={t("title")}
      description={t("description")}
      actionLabel={t("action")}
      actionHref="/dashboard/crosspost"
    />
  );
}
