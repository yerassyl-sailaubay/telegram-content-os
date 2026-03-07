"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatInTz } from "@/lib/scheduling/timezone";
import { Linkedin, Twitter, Clock, X, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ScheduleStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

type CalendarEventProps = {
  id: string;
  scheduledAt: Date;
  timezone: string;
  platform: "linkedin" | "twitter" | "telegram";
  status: ScheduleStatus;
  contentPreview?: string | null;
  onCancel?: (id: string) => void;
  onReschedule?: (id: string) => void;
  compact?: boolean;
  className?: string;
};

const platformIcons: Record<
  "linkedin" | "twitter" | "telegram",
  React.ComponentType<{ className?: string }>
> = {
  linkedin: Linkedin,
  twitter: Twitter,
  telegram: Send,
};

const statusColors: Record<ScheduleStatus, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  processing: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  failed: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
  cancelled: "bg-muted text-muted-foreground border-muted",
};

export function CalendarEvent({
  id,
  scheduledAt,
  timezone,
  platform,
  status,
  contentPreview,
  onCancel,
  onReschedule,
  compact = false,
  className,
}: CalendarEventProps) {
  const t = useTranslations("schedule");
  const PlatformIcon = platformIcons[platform] ?? Clock;
  const timeStr = formatInTz(new Date(scheduledAt), timezone, "HH:mm");

  const statusKey = `status${status.charAt(0).toUpperCase() + status.slice(1)}` as
    | "statusPending"
    | "statusProcessing"
    | "statusCompleted"
    | "statusFailed"
    | "statusCancelled";

  if (compact) {
    return (
      <div
        className={cn(
          "group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
          "hover:bg-accent cursor-pointer",
          status === "cancelled" && "line-through opacity-50",
          className,
        )}
      >
        <PlatformIcon className="h-3 w-3 shrink-0" />
        <span className="font-mono tabular-nums">{timeStr}</span>
        {contentPreview && <span className="text-muted-foreground truncate">{contentPreview}</span>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative rounded-lg border p-3 transition-all",
        "bg-card hover:shadow-md",
        status === "cancelled" && "opacity-60",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md",
              platform === "linkedin"
                ? "bg-[#0A66C2]/10 text-[#0A66C2]"
                : platform === "telegram"
                  ? "bg-[#26A5E4]/10 text-[#26A5E4]"
                  : "bg-foreground/10 text-foreground",
            )}
          >
            <PlatformIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm leading-none font-medium">
              {t(platform as "linkedin" | "twitter" | "telegram")}
            </p>
            <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              <span className="font-mono tabular-nums">{timeStr}</span>
            </p>
          </div>
        </div>
        <Badge variant="outline" className={cn("text-[10px] font-medium", statusColors[status])}>
          {t(statusKey)}
        </Badge>
      </div>

      {contentPreview && (
        <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">{contentPreview}</p>
      )}

      {status === "pending" && (onCancel || onReschedule) && (
        <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onReschedule && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onReschedule(id)}
            >
              {t("reschedule")}
            </Button>
          )}
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive h-6 px-2 text-xs"
              onClick={() => onCancel(id)}
            >
              <X className="mr-1 h-3 w-3" />
              {t("cancelSchedule")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
