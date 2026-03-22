"use client";

import { BarChart3, TrendingUp, Eye, LineChart, Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type AnalyticsEmptyStateProps = {
  isOnboarding?: boolean;
  hasPublishedContent?: boolean;
  hasChannels?: boolean;
};

export function AnalyticsEmptyState({
  isOnboarding = false,
  hasPublishedContent = false,
  hasChannels = false,
}: AnalyticsEmptyStateProps) {
  const t = useTranslations("onboarding.emptyStates.analytics");

  const getContent = () => {
    if (!hasChannels) {
      return {
        title: t("noChannelsTitle"),
        description: t("noChannelsDescription"),
        actionLabel: t("connectChannelAction"),
        actionHref: "/dashboard/channels",
      };
    }

    if (isOnboarding && !hasPublishedContent) {
      return {
        title: t("onboardingTitle"),
        description: t("onboardingDescription"),
        actionLabel: t("publishFirstAction"),
        actionHref: "/dashboard/telegram-post",
      };
    }

    if (!hasPublishedContent) {
      return {
        title: t("noDataTitle"),
        description: t("noDataDescription"),
        actionLabel: t("publishFirstAction"),
        actionHref: "/dashboard/telegram-post",
      };
    }

    return {
      title: t("title"),
      description: t("description"),
      actionLabel: t("refreshAction"),
      actionHref: "/dashboard/analytics",
    };
  };

  const content = getContent();

  return (
    <div className="space-y-6" data-testid="analytics-empty-state">
      <EmptyState
        icon={BarChart3}
        title={content.title}
        description={content.description}
        actionLabel={content.actionLabel}
        actionHref={content.actionHref}
      />

      {isOnboarding && hasChannels && (
        <div className="bg-muted/30 rounded-xl border border-dashed p-6">
          <h4 className="mb-3 flex items-center gap-2 font-medium">
            <Lightbulb className="text-primary h-4 w-4" />
            {t("tips.title")}
          </h4>

          <div className="mb-4">
            <p className="text-muted-foreground text-sm font-medium">{t("tips.whyTitle")}</p>
            <p className="text-muted-foreground mt-1 text-sm">{t("tips.whyDescription")}</p>
          </div>

          <ul className="text-muted-foreground space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                <TrendingUp className="text-primary h-4 w-4" />
              </div>
              <div>
                <p className="text-foreground font-medium">{t("tips.growthTitle")}</p>
                <p>{t("tips.growthDescription")}</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                <Eye className="text-primary h-4 w-4" />
              </div>
              <div>
                <p className="text-foreground font-medium">{t("tips.engagementTitle")}</p>
                <p>{t("tips.engagementDescription")}</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                <LineChart className="text-primary h-4 w-4" />
              </div>
              <div>
                <p className="text-foreground font-medium">{t("tips.timingTitle")}</p>
                <p>{t("tips.timingDescription")}</p>
              </div>
            </li>
          </ul>

          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/tour?step=analytics">{t("tips.takeTour")}</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AnalyticsEmptyStateSimple({
  isOnboarding = false,
  hasPublishedContent = false,
}: {
  isOnboarding?: boolean;
  hasPublishedContent?: boolean;
}) {
  const t = useTranslations("onboarding.emptyStates.analytics");

  const title =
    isOnboarding && !hasPublishedContent
      ? t("onboardingTitle")
      : !hasPublishedContent
        ? t("noDataTitle")
        : t("title");

  const description =
    isOnboarding && !hasPublishedContent
      ? t("onboardingDescription")
      : !hasPublishedContent
        ? t("noDataDescription")
        : t("description");

  return (
    <EmptyState
      icon={BarChart3}
      title={title}
      description={description}
      actionLabel={!hasPublishedContent ? t("publishFirstAction") : undefined}
      actionHref={!hasPublishedContent ? "/dashboard/telegram-post" : undefined}
      data-testid="analytics-empty-simple"
    />
  );
}
