"use client";

import { CalendarDays, Clock, Plus, CalendarCheck, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type ScheduleEmptyStateProps = {
  isOnboarding?: boolean;
  channelCount?: number;
  onSchedulePost?: () => void;
};

export function ScheduleEmptyState({
  isOnboarding = false,
  channelCount = 0,
  onSchedulePost,
}: ScheduleEmptyStateProps) {
  const t = useTranslations("onboarding.emptyStates.schedule");
  const tSchedule = useTranslations("schedule");

  const hasChannels = channelCount > 0;

  const getContent = () => {
    if (isOnboarding) {
      return {
        title: hasChannels ? t("onboardingTitle") : t("onboardingNoChannelTitle"),
        description: hasChannels ? t("onboardingDescription") : t("onboardingNoChannelDescription"),
        actionLabel: hasChannels ? t("action") : t("connectChannelAction"),
        actionHref: hasChannels ? "/dashboard/content" : "/dashboard/channels",
      };
    }

    return {
      title: t("title"),
      description: t("description"),
      actionLabel: t("action"),
      actionHref: "/dashboard/content",
    };
  };

  const content = getContent();

  return (
    <div className="space-y-6" data-testid="schedule-empty-state">
      <EmptyState
        icon={CalendarDays}
        title={content.title}
        description={content.description}
        actionLabel={content.actionLabel}
        actionHref={onSchedulePost ? undefined : content.actionHref}
        onAction={onSchedulePost}
      />

      {isOnboarding && (
        <div className="bg-muted/30 rounded-xl border border-dashed p-6">
          <h4 className="mb-3 flex items-center gap-2 font-medium">
            <Zap className="text-primary h-4 w-4" />
            {t("tips.title")}
          </h4>

          <div className="mb-4">
            <p className="text-muted-foreground text-sm font-medium">{t("tips.whyTitle")}</p>
            <p className="text-muted-foreground mt-1 text-sm">{t("tips.whyDescription")}</p>
          </div>

          <ul className="text-muted-foreground space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Clock className="text-primary mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("tips.item1")}</span>
            </li>
            <li className="flex items-start gap-2">
              <CalendarCheck className="text-primary mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("tips.item2")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Zap className="text-primary mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("tips.item3")}</span>
            </li>
          </ul>

          <div className="mt-4 flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/tour?step=schedule">{t("tips.takeTour")}</Link>
            </Button>
            {hasChannels && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/content">
                  <Plus className="mr-1 h-4 w-4" />
                  {tSchedule("newSchedule")}
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ScheduleEmptyStateSimple({ isOnboarding = false }: { isOnboarding?: boolean }) {
  const t = useTranslations("onboarding.emptyStates.schedule");

  return (
    <EmptyState
      icon={CalendarDays}
      title={isOnboarding ? t("onboardingTitle") : t("title")}
      description={isOnboarding ? t("onboardingDescription") : t("description")}
      actionLabel={t("action")}
      actionHref="/dashboard/content"
      data-testid="schedule-empty-simple"
    />
  );
}
