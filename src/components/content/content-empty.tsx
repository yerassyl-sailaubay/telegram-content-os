"use client";

import { FileText, Plus, Sparkles, BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type ContentEmptyStateProps = {
  isOnboarding?: boolean;
  activeTab?: "all" | "idea" | "draft" | "published" | "scheduled" | "archived";
  onCreateContent?: () => void;
};

export function ContentEmptyState({
  isOnboarding = false,
  activeTab = "all",
  onCreateContent,
}: ContentEmptyStateProps) {
  const t = useTranslations("onboarding.emptyStates.content");
  const tContent = useTranslations("content");

  const getTabConfig = () => {
    switch (activeTab) {
      case "idea":
        return {
          icon: Sparkles,
          title: isOnboarding ? t("idea.onboardingTitle") : t("idea.title"),
          description: isOnboarding ? t("idea.onboardingDescription") : t("idea.description"),
          actionLabel: t("idea.action"),
          actionHref: "/dashboard/create",
        };
      case "draft":
        return {
          icon: FileText,
          title: isOnboarding ? t("draft.onboardingTitle") : t("draft.title"),
          description: isOnboarding ? t("draft.onboardingDescription") : t("draft.description"),
          actionLabel: t("draft.action"),
          actionHref: "/dashboard/content?tab=idea",
        };
      case "published":
        return {
          icon: BookOpen,
          title: isOnboarding ? t("published.onboardingTitle") : t("published.title"),
          description: isOnboarding
            ? t("published.onboardingDescription")
            : t("published.description"),
          actionLabel: t("published.action"),
          actionHref: "/dashboard/schedule",
        };
      default:
        return {
          icon: FileText,
          title: isOnboarding ? t("all.onboardingTitle") : t("all.title"),
          description: isOnboarding ? t("all.onboardingDescription") : t("all.description"),
          actionLabel: t("all.action"),
          actionHref: "/dashboard/create",
        };
    }
  };

  const config = getTabConfig();

  return (
    <div className="space-y-6" data-testid="content-empty-state">
      <EmptyState
        icon={config.icon}
        title={config.title}
        description={config.description}
        actionLabel={config.actionLabel}
        actionHref={onCreateContent ? undefined : config.actionHref}
        onAction={onCreateContent}
      />

      {isOnboarding && (
        <div className="bg-muted/30 rounded-xl border border-dashed p-6">
          <h4 className="mb-3 flex items-center gap-2 font-medium">
            <Sparkles className="text-primary h-4 w-4" />
            {t("tips.title")}
          </h4>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>{t("tips.item1")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>{t("tips.item2")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>{t("tips.item3")}</span>
            </li>
          </ul>
          <div className="mt-4 flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/tour?step=content">{t("tips.takeTour")}</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/create">
                <Plus className="mr-1 h-4 w-4" />
                {tContent("newContent")}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ContentEmptyStateSimple({ isOnboarding = false }: { isOnboarding?: boolean }) {
  const t = useTranslations("onboarding.emptyStates.content");

  return (
    <EmptyState
      icon={FileText}
      title={isOnboarding ? t("all.onboardingTitle") : t("all.title")}
      description={isOnboarding ? t("all.onboardingDescription") : t("all.description")}
      actionLabel={t("all.action")}
      actionHref="/dashboard/create"
      data-testid="content-empty-simple"
    />
  );
}
