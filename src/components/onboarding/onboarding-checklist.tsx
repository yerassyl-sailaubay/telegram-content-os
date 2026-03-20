"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import {
  ChevronDown,
  ChevronUp,
  Check,
  Circle,
  Sparkles,
  Calendar,
  BarChart3,
  MessageSquare,
  Lightbulb,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useOnboarding } from "@/hooks/use-onboarding";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { ChecklistItem } from "@/server/actions/onboarding";

type OnboardingStep = {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  getCompleted: (checklist: ChecklistItem[]) => boolean;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "connect-telegram",
    labelKey: "connectTelegram",
    icon: MessageSquare,
    href: "/dashboard/channels",
    getCompleted: (checklist) =>
      checklist.find((i) => i.id === "connect-telegram")?.completed ?? false,
  },
  {
    id: "capture-idea",
    labelKey: "captureIdea",
    icon: Lightbulb,
    href: "/dashboard/posts",
    getCompleted: (checklist) =>
      checklist.find((i) => i.id === "create-content")?.completed ?? false,
  },
  {
    id: "generate-draft",
    labelKey: "generateDraft",
    icon: Sparkles,
    href: "/dashboard/create",
    getCompleted: (checklist) =>
      checklist.find((i) => i.id === "create-content")?.completed ?? false,
  },
  {
    id: "schedule-post",
    labelKey: "schedulePost",
    icon: Calendar,
    href: "/dashboard/schedule",
    getCompleted: (checklist) => checklist.find((i) => i.id === "publish-post")?.completed ?? false,
  },
  {
    id: "view-analytics",
    labelKey: "viewAnalytics",
    icon: BarChart3,
    href: "/dashboard/analytics",
    getCompleted: () => false,
  },
];

const STORAGE_KEY = "onboarding-checklist-collapsed";

function getServerSnapshot() {
  return false;
}

function getSnapshot() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : false;
  } catch {
    return false;
  }
}

function subscribe(callback: () => void) {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

function saveCollapsedState(collapsed: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
  } catch {
    return;
  }
}

export function OnboardingChecklist() {
  const t = useTranslations("onboarding.checklist");
  const { checklist, isLoading } = useOnboarding();
  const storedCollapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(storedCollapsed);
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);

  const completedCount = ONBOARDING_STEPS.filter((step) => step.getCompleted(checklist)).length;
  const totalCount = ONBOARDING_STEPS.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isComplete = completedCount === totalCount;

  if (isComplete && !hasAutoCollapsed && !storedCollapsed) {
    setIsCollapsed(true);
    saveCollapsedState(true);
    setHasAutoCollapsed(true);
  }

  const toggleCollapsed = useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    saveCollapsedState(newState);
  }, [isCollapsed]);

  const expandChecklist = useCallback(() => {
    setIsCollapsed(false);
    saveCollapsedState(false);
  }, []);

  if (isLoading) {
    return (
      <Card className="border-sidebar-border bg-sidebar-accent/30 mx-2">
        <CardHeader className="px-3 py-2">
          <div className="bg-muted h-4 w-24 animate-pulse rounded" />
        </CardHeader>
      </Card>
    );
  }

  if (isComplete && isCollapsed) {
    return (
      <div className="px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={expandChecklist}
          className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full justify-start text-xs"
        >
          <Check className="mr-2 size-3 text-green-500" />
          {t("gettingStarted")}
        </Button>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "border-sidebar-border bg-sidebar-accent/30 mx-2 overflow-hidden transition-all duration-200",
        isCollapsed && "opacity-90",
      )}
    >
      <CardHeader
        className="cursor-pointer px-3 py-2 select-none"
        onClick={toggleCollapsed}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleCollapsed();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? t("expandAriaLabel") : t("collapseAriaLabel")}
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sidebar-foreground text-sm font-medium">{t("title")}</span>
            {!isCollapsed && (
              <span className="text-sidebar-foreground/60 text-xs">
                {completedCount}/{totalCount} {t("completed")}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
            aria-hidden="true"
            tabIndex={-1}
          >
            {isCollapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
          </Button>
        </div>
        {!isCollapsed && (
          <Progress value={progressPercentage} className="bg-sidebar-border mt-2 h-1.5" />
        )}
      </CardHeader>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isCollapsed ? "max-h-0 opacity-0" : "max-h-96 opacity-100",
        )}
      >
        <CardContent className="px-2 pt-0 pb-3">
          <ul className="space-y-0.5" role="list" aria-label={t("checklistAriaLabel")}>
            {ONBOARDING_STEPS.map((step) => {
              const isCompleted = step.getCompleted(checklist);
              const Icon = step.icon;

              return (
                <li key={step.id}>
                  <Link
                    href={step.href}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      "hover:bg-sidebar-accent focus-visible:ring-sidebar-ring focus-visible:ring-2 focus-visible:outline-hidden",
                      isCompleted && "text-sidebar-foreground/50",
                    )}
                    tabIndex={isCollapsed ? -1 : 0}
                    aria-current={isCompleted ? "step" : undefined}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                        isCompleted
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-sidebar-border group-hover:border-sidebar-foreground/30 bg-transparent text-transparent",
                      )}
                      aria-hidden="true"
                    >
                      {isCompleted ? (
                        <Check className="size-2.5" />
                      ) : (
                        <Circle className="size-1.5" />
                      )}
                    </span>
                    <Icon
                      className={cn(
                        "size-3.5 shrink-0",
                        isCompleted ? "text-sidebar-foreground/30" : "text-sidebar-foreground/60",
                      )}
                    />
                    <span className={cn("truncate", isCompleted && "line-through")}>
                      {t(`steps.${step.labelKey}`)}
                    </span>
                    <span className="sr-only">
                      {isCompleted ? t("completedStatus") : t("pendingStatus")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </div>
    </Card>
  );
}
