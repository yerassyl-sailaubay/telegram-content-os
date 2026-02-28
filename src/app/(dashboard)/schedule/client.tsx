"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ScheduleCalendar, type ScheduleItem } from "@/components/schedule/calendar";
import { ScheduleDialog } from "@/components/schedule/schedule-dialog";
import { TimezoneSelect } from "@/components/schedule/timezone-select";
import { Button } from "@/components/ui/button";
import { detectBrowserTimezone } from "@/lib/scheduling/timezone";
import { cancelScheduleAction, getSchedulesForCalendar } from "@/server/actions/schedule";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarPlus } from "lucide-react";

export function SchedulePageClient() {
  const t = useTranslations("schedule");
  const tCommon = useTranslations("common");
  const router = useRouter();

  // Timezone state — detect from browser on mount
  const [timezone, setTimezone] = React.useState("UTC");
  const [schedules, setSchedules] = React.useState<ScheduleItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogDate, setDialogDate] = React.useState<Date | undefined>();
  const [dialogHour, setDialogHour] = React.useState<number | undefined>();

  // Cancel confirmation
  const [cancelId, setCancelId] = React.useState<string | null>(null);

  // Detect browser timezone on mount
  React.useEffect(() => {
    setTimezone(detectBrowserTimezone());
  }, []);

  // Fetch schedules for current month range
  const fetchSchedules = React.useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      // Fetch a wide range: previous month through next month
      const start = startOfWeek(startOfMonth(now), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(now), { weekStartsOn: 1 });

      // Extend range by ±2 months for smooth navigation
      const rangeStart = new Date(start);
      rangeStart.setMonth(rangeStart.getMonth() - 2);
      const rangeEnd = new Date(end);
      rangeEnd.setMonth(rangeEnd.getMonth() + 2);

      const data = await getSchedulesForCalendar(rangeStart.toISOString(), rangeEnd.toISOString());

      setSchedules(
        data.map((s) => ({
          id: s.id,
          scheduledAt: s.scheduledAt!,
          timezone: s.timezone,
          status: s.status as ScheduleItem["status"],
          crossPost: s.crossPost
            ? {
                platform: s.crossPost.platform as "linkedin" | "twitter",
                adaptedContent: s.crossPost.adaptedContent,
              }
            : null,
        })),
      );
    } catch {
      // Silently fail — empty calendar
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Handlers
  function handleSlotClick(date: Date, hour?: number) {
    setDialogDate(date);
    setDialogHour(hour);
    setDialogOpen(true);
  }

  async function handleCreateSchedule(data: {
    platform: string;
    scheduledAt: Date;
    timezone: string;
  }) {
    // Redirect to crosspost workflow where proper content selection and scheduling happens
    router.push(
      `/dashboard/crosspost?scheduledAt=${data.scheduledAt.toISOString()}&timezone=${data.timezone}&platform=${data.platform}`,
    );
    setDialogOpen(false);
  }

  async function handleCancelSchedule() {
    if (!cancelId) return;

    const formData = new FormData();
    formData.set("scheduleId", cancelId);

    await cancelScheduleAction(formData);
    setCancelId(null);
    await fetchSchedules();
  }

  function handleRescheduleClick(id: string) {
    // For now, open the schedule dialog — full reschedule flow would
    // pre-populate with existing data
    const schedule = schedules.find((s) => s.id === id);
    if (schedule) {
      setDialogDate(new Date(schedule.scheduledAt));
      setDialogOpen(true);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar with timezone + new schedule */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TimezoneSelect value={timezone} onValueChange={setTimezone} className="w-[280px]" />
        <Button onClick={() => setDialogOpen(true)}>
          <CalendarPlus className="mr-2 h-4 w-4" />
          {t("newSchedule")}
        </Button>
      </div>

      {/* Calendar */}
      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
          <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
        </div>
      ) : (
        <ScheduleCalendar
          schedules={schedules}
          timezone={timezone}
          onSlotClick={handleSlotClick}
          onCancelSchedule={(id) => setCancelId(id)}
          onRescheduleClick={handleRescheduleClick}
        />
      )}

      {/* Schedule Dialog */}
      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialDate={dialogDate}
        initialHour={dialogHour}
        timezone={timezone}
        onTimezoneChange={setTimezone}
        onSubmit={handleCreateSchedule}
      />

      {/* Cancel Confirmation */}
      <AlertDialog open={cancelId !== null} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("cancelConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSchedule}>
              {t("cancelSchedule")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
