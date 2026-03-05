"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimezoneSelect } from "./timezone-select";
import { Calendar, Clock, Loader2, Repeat, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

export type RecurringFrequency = "none" | "daily" | "weekly" | "monthly";

export type RecurringFormData = {
  frequency: RecurringFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeLocal: string;
  timezone: string;
  platforms: string[];
};

type RecurringFormProps = {
  initialData?: Partial<RecurringFormData>;
  timezone: string;
  onTimezoneChange: (tz: string) => void;
  onSubmit: (data: RecurringFormData) => Promise<void>;
  onCancel?: () => void;
  /** If set, shows pause/resume toggle */
  isActive?: boolean;
  onToggleActive?: () => Promise<void>;
  loading?: boolean;
};

// ─── Constants ───────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { value: 0, key: "sunday" },
  { value: 1, key: "monday" },
  { value: 2, key: "tuesday" },
  { value: 3, key: "wednesday" },
  { value: 4, key: "thursday" },
  { value: 5, key: "friday" },
  { value: 6, key: "saturday" },
] as const;

const PLATFORMS = [
  { value: "linkedin", key: "linkedin" },
  { value: "twitter", key: "twitter" },
] as const;

// ─── Component ───────────────────────────────────────────────────────

export function RecurringForm({
  initialData,
  timezone,
  onTimezoneChange,
  onSubmit,
  onCancel,
  isActive,
  onToggleActive,
  loading: externalLoading,
}: RecurringFormProps) {
  const t = useTranslations("scheduling.recurring");
  const tSchedule = useTranslations("schedule");
  const tCommon = useTranslations("common");

  const [frequency, setFrequency] = React.useState<RecurringFrequency>(
    initialData?.frequency ?? "none",
  );
  const [dayOfWeek, setDayOfWeek] = React.useState<number>(initialData?.dayOfWeek ?? 1);
  const [dayOfMonth, setDayOfMonth] = React.useState<number>(initialData?.dayOfMonth ?? 1);
  const [timeLocal, setTimeLocal] = React.useState<string>(initialData?.timeLocal ?? "09:00");
  const [platforms, setPlatforms] = React.useState<string[]>(initialData?.platforms ?? []);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isSubmitting = loading || externalLoading;

  function togglePlatform(platform: string) {
    setPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (frequency === "none") {
      setError(t("selectFrequency"));
      return;
    }
    if (platforms.length === 0) {
      setError(tSchedule("selectPlatform"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        frequency,
        dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
        dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
        timeLocal,
        timezone,
        platforms,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Frequency */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Repeat className="h-3.5 w-3.5" />
          {t("frequency")}
        </Label>
        <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurringFrequency)}>
          <SelectTrigger>
            <SelectValue placeholder={t("selectFrequency")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("frequencyNone")}</SelectItem>
            <SelectItem value="daily">{t("frequencyDaily")}</SelectItem>
            <SelectItem value="weekly">{t("frequencyWeekly")}</SelectItem>
            <SelectItem value="monthly">{t("frequencyMonthly")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Day picker for weekly */}
      {frequency === "weekly" && (
        <div className="space-y-2">
          <Label>{t("dayOfWeek")}</Label>
          <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((day) => (
                <SelectItem key={day.value} value={String(day.value)}>
                  {t(day.key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Day picker for monthly */}
      {frequency === "monthly" && (
        <div className="space-y-2">
          <Label>{t("dayOfMonth")}</Label>
          <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={String(day)}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">{t("dayOfMonthHint")}</p>
        </div>
      )}

      {/* Time */}
      {frequency !== "none" && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {tSchedule("selectTime")}
          </Label>
          <Input
            type="time"
            value={timeLocal}
            onChange={(e) => setTimeLocal(e.target.value)}
            required
          />
        </div>
      )}

      {/* Timezone */}
      {frequency !== "none" && (
        <div className="space-y-2">
          <Label>{tSchedule("timezone")}</Label>
          <TimezoneSelect value={timezone} onValueChange={onTimezoneChange} />
          <p className="text-muted-foreground text-xs">{tSchedule("timezoneDescription")}</p>
        </div>
      )}

      {/* Platform selection */}
      {frequency !== "none" && (
        <div className="space-y-2">
          <Label>{tSchedule("platform")}</Label>
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <Badge
                key={p.value}
                variant={platforms.includes(p.value) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer px-3 py-1.5 text-sm transition-colors select-none",
                  platforms.includes(p.value)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                )}
                onClick={() => togglePlatform(p.value)}
              >
                {tSchedule(p.key)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Pause/Resume toggle */}
      {isActive !== undefined && onToggleActive && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleActive}
            disabled={isSubmitting}
          >
            {isActive ? (
              <>
                <Pause className="mr-1.5 h-3.5 w-3.5" />
                {t("pause")}
              </>
            ) : (
              <>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                {t("resume")}
              </>
            )}
          </Button>
          <span className="text-muted-foreground text-xs">
            {isActive ? t("statusActive") : t("statusPaused")}
          </span>
        </div>
      )}

      {error && (
        <p className="bg-destructive/10 text-destructive rounded-md p-2 text-sm">{error}</p>
      )}

      {/* Action buttons */}
      {frequency !== "none" && (
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              {tCommon("cancel")}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("createRecurring")}
          </Button>
        </div>
      )}
    </form>
  );
}
