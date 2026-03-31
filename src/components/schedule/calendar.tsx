"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isSameMonth,
  isSameDay,
  isToday,
  getHours,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "./calendar-event";
import { utcToLocal, formatInTz } from "@/lib/scheduling/timezone";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  Calendar as CalendarIcon,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

export type CalendarView = "month" | "week" | "day";

export type ScheduleItem = {
  id: string;
  scheduledAt: Date | string;
  timezone: string | null;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  platform: "linkedin" | "twitter" | "telegram";
  contentPreview: string | null;
};

type ScheduleCalendarProps = {
  schedules: ScheduleItem[];
  timezone: string;
  onSlotClick: (date: Date, hour?: number) => void;
  onCancelSchedule: (id: string) => void;
  onRescheduleClick: (id: string) => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────

function getSchedulesForDay(
  schedules: ScheduleItem[],
  day: Date,
  timezone: string,
): ScheduleItem[] {
  return schedules.filter((s) => {
    const local = utcToLocal(new Date(s.scheduledAt), timezone);
    return isSameDay(local, day);
  });
}

// ─── Calendar Component ──────────────────────────────────────────────

export function ScheduleCalendar({
  schedules,
  timezone,
  onSlotClick,
  onCancelSchedule,
  onRescheduleClick,
}: ScheduleCalendarProps) {
  const t = useTranslations("schedule");
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [view, setView] = React.useState<CalendarView>("month");

  // Navigation handlers
  function goToToday() {
    setCurrentDate(new Date());
  }

  function goPrev() {
    if (view === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  }

  function goNext() {
    if (view === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  }

  const viewIcons: Record<CalendarView, React.ComponentType<{ className?: string }>> = {
    month: CalendarDays,
    week: CalendarRange,
    day: CalendarIcon,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center justify-between gap-3"
        data-tour="schedule-view-controls"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            {t("today")}
          </Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold tracking-tight">
            {view === "month" && format(currentDate, "MMMM yyyy")}
            {view === "week" &&
              `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d")} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d, yyyy")}`}
            {view === "day" && format(currentDate, "EEEE, MMMM d, yyyy")}
          </h2>
        </div>

        <div className="bg-muted/30 flex items-center rounded-lg border p-0.5">
          {(["month", "week", "day"] as CalendarView[]).map((v) => {
            const Icon = viewIcons[v];
            return (
              <Button
                key={v}
                variant={view === v ? "secondary" : "ghost"}
                size="sm"
                className={cn("h-7 gap-1.5 px-3 text-xs font-medium", view === v && "shadow-sm")}
                onClick={() => setView(v)}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(`${v}View` as "monthView" | "weekView" | "dayView")}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Calendar Grid */}
      {view === "month" && (
        <MonthView
          currentDate={currentDate}
          schedules={schedules}
          timezone={timezone}
          onSlotClick={onSlotClick}
          onCancelSchedule={onCancelSchedule}
          onRescheduleClick={onRescheduleClick}
          onDayClick={(day) => {
            setCurrentDate(day);
            setView("day");
          }}
        />
      )}
      {view === "week" && (
        <WeekView
          currentDate={currentDate}
          schedules={schedules}
          timezone={timezone}
          onSlotClick={onSlotClick}
          onCancelSchedule={onCancelSchedule}
          onRescheduleClick={onRescheduleClick}
        />
      )}
      {view === "day" && (
        <DayView
          currentDate={currentDate}
          schedules={schedules}
          timezone={timezone}
          onSlotClick={onSlotClick}
          onCancelSchedule={onCancelSchedule}
          onRescheduleClick={onRescheduleClick}
        />
      )}
    </div>
  );
}

// ─── Month View ──────────────────────────────────────────────────────

function MonthView({
  currentDate,
  schedules,
  timezone,
  onSlotClick,
  onCancelSchedule,
  onRescheduleClick,
  onDayClick,
}: {
  currentDate: Date;
  schedules: ScheduleItem[];
  timezone: string;
  onSlotClick: (date: Date, hour?: number) => void;
  onCancelSchedule: (id: string) => void;
  onRescheduleClick: (id: string) => void;
  onDayClick: (day: Date) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Day names header */}
      <div className="bg-muted/30 grid grid-cols-7 border-b">
        {dayNames.map((name) => (
          <div key={name} className="text-muted-foreground p-2 text-center text-xs font-medium">
            {name}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const daySchedules = getSchedulesForDay(schedules, day, timezone);
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "group relative min-h-[100px] border-r border-b p-1.5 transition-colors",
                i % 7 === 6 && "border-r-0",
                !inMonth && "bg-muted/20",
                "hover:bg-accent/30 cursor-pointer",
              )}
              onClick={() => {
                if (daySchedules.length > 0) {
                  onDayClick(day);
                } else {
                  onSlotClick(day, 12);
                }
              }}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  today && "bg-primary text-primary-foreground font-bold",
                  !inMonth && "text-muted-foreground/50",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-0.5">
                {daySchedules.slice(0, 3).map((s) => (
                  <CalendarEvent
                    key={s.id}
                    id={s.id}
                    scheduledAt={new Date(s.scheduledAt)}
                    timezone={timezone}
                    platform={s.platform}
                    status={s.status}
                    contentPreview={s.contentPreview}
                    compact
                    onCancel={onCancelSchedule}
                    onReschedule={onRescheduleClick}
                  />
                ))}
                {daySchedules.length > 3 && (
                  <span className="text-muted-foreground block text-center text-[10px]">
                    +{daySchedules.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ───────────────────────────────────────────────────────

function WeekView({
  currentDate,
  schedules,
  timezone,
  onSlotClick,
  onCancelSchedule,
  onRescheduleClick,
}: {
  currentDate: Date;
  schedules: ScheduleItem[];
  timezone: string;
  onSlotClick: (date: Date, hour?: number) => void;
  onCancelSchedule: (id: string) => void;
  onRescheduleClick: (id: string) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="overflow-auto rounded-lg border">
      {/* Header with day names */}
      <div className="bg-background sticky top-0 z-10 grid grid-cols-[60px_repeat(7,1fr)] border-b">
        <div className="border-r p-2" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "border-r p-2 text-center last:border-r-0",
              isToday(day) && "bg-primary/5",
            )}
          >
            <p className="text-muted-foreground text-xs">{format(day, "EEE")}</p>
            <p className={cn("text-lg font-semibold", isToday(day) && "text-primary")}>
              {format(day, "d")}
            </p>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)]">
        {hours.map((hour) => (
          <React.Fragment key={hour}>
            {/* Time label */}
            <div className="relative border-r border-b p-1 text-right">
              <span className="text-muted-foreground font-mono text-[10px]">
                {String(hour).padStart(2, "0")}:00
              </span>
            </div>
            {/* Day columns */}
            {days.map((day) => {
              const daySchedules = getSchedulesForDay(schedules, day, timezone).filter((s) => {
                const local = utcToLocal(new Date(s.scheduledAt), timezone);
                return getHours(local) === hour;
              });

              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className={cn(
                    "min-h-[48px] border-r border-b p-0.5 transition-colors last:border-r-0",
                    "hover:bg-accent/20 cursor-pointer",
                    isToday(day) && "bg-primary/[0.02]",
                  )}
                  onClick={() => onSlotClick(day, hour)}
                >
                  {daySchedules.map((s) => (
                    <CalendarEvent
                      key={s.id}
                      id={s.id}
                      scheduledAt={new Date(s.scheduledAt)}
                      timezone={timezone}
                      platform={s.platform}
                      status={s.status}
                      contentPreview={s.contentPreview}
                      compact
                      onCancel={onCancelSchedule}
                      onReschedule={onRescheduleClick}
                    />
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Day View ────────────────────────────────────────────────────────

function DayView({
  currentDate,
  schedules,
  timezone,
  onSlotClick,
  onCancelSchedule,
  onRescheduleClick,
}: {
  currentDate: Date;
  schedules: ScheduleItem[];
  timezone: string;
  onSlotClick: (date: Date, hour?: number) => void;
  onCancelSchedule: (id: string) => void;
  onRescheduleClick: (id: string) => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const daySchedules = getSchedulesForDay(schedules, currentDate, timezone);

  return (
    <div className="overflow-auto rounded-lg border">
      {/* Day header */}
      <div className="bg-background sticky top-0 z-10 border-b p-3">
        <div className="flex items-center gap-2">
          {isToday(currentDate) && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
              Today
            </span>
          )}
          <span className="text-muted-foreground text-sm">
            {format(currentDate, "EEEE, MMMM d, yyyy")}
          </span>
          <span className="text-muted-foreground text-xs">· {daySchedules.length} scheduled</span>
        </div>
      </div>

      {/* Hourly grid */}
      <div className="grid grid-cols-[80px_1fr]">
        {hours.map((hour) => {
          const hourSchedules = daySchedules.filter((s) => {
            const local = utcToLocal(new Date(s.scheduledAt), timezone);
            return getHours(local) === hour;
          });

          return (
            <React.Fragment key={hour}>
              {/* Time label */}
              <div className="flex items-start justify-end border-r border-b p-2">
                <span className="text-muted-foreground font-mono text-xs">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
              {/* Content area */}
              <div
                className={cn(
                  "min-h-[56px] border-b p-2 transition-colors",
                  "hover:bg-accent/20 cursor-pointer",
                )}
                onClick={() => onSlotClick(currentDate, hour)}
              >
                <div className="space-y-2">
                  {hourSchedules.map((s) => (
                    <CalendarEvent
                      key={s.id}
                      id={s.id}
                      scheduledAt={new Date(s.scheduledAt)}
                      timezone={timezone}
                      platform={s.platform}
                      status={s.status}
                      contentPreview={s.contentPreview}
                      onCancel={onCancelSchedule}
                      onReschedule={onRescheduleClick}
                    />
                  ))}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
