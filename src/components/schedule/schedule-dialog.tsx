"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimezoneSelect } from "./timezone-select";
import { Calendar, Clock, Loader2 } from "lucide-react";

type ScheduleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  initialHour?: number;
  timezone: string;
  onTimezoneChange: (tz: string) => void;
  onSubmit: (data: {
    platform: string;
    scheduledAt: Date;
    timezone: string;
  }) => Promise<void>;
};

export function ScheduleDialog({
  open,
  onOpenChange,
  initialDate,
  initialHour,
  timezone,
  onTimezoneChange,
  onSubmit,
}: ScheduleDialogProps) {
  const t = useTranslations("schedule");
  const tCommon = useTranslations("common");

  const [platform, setPlatform] = React.useState<string>("");
  const [date, setDate] = React.useState<string>(
    initialDate ? format(initialDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
  );
  const [time, setTime] = React.useState<string>(
    initialHour !== undefined
      ? `${String(initialHour).padStart(2, "0")}:00`
      : "12:00",
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset state when dialog opens with new initial values
  React.useEffect(() => {
    if (open) {
      if (initialDate) {
        setDate(format(initialDate, "yyyy-MM-dd"));
      }
      if (initialHour !== undefined) {
        setTime(`${String(initialHour).padStart(2, "0")}:00`);
      }
      setError(null);
      setPlatform("");
    }
  }, [open, initialDate, initialHour]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!platform) {
      setError(t("selectPlatform"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [year, month, day] = date.split("-").map(Number);
      const [hours, minutes] = time.split(":").map(Number);
      const scheduledAt = new Date(year!, month! - 1, day!, hours, minutes);

      await onSubmit({
        platform,
        scheduledAt,
        timezone,
      });

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("newSchedule")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Platform */}
          <div className="space-y-2">
            <Label>{t("platform")}</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectPlatform")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linkedin">{t("linkedin")}</SelectItem>
                <SelectItem value="twitter">{t("twitter")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {t("selectDate")}
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {t("selectTime")}
              </Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label>{t("timezone")}</Label>
            <TimezoneSelect
              value={timezone}
              onValueChange={onTimezoneChange}
            />
            <p className="text-xs text-muted-foreground">
              {t("timezoneDescription")}
            </p>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("newSchedule")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
