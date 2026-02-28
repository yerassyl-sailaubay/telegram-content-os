import { db } from "@/server/db";
import { recurringSchedules, schedules, crossPosts } from "@/server/db/schema";
import { eq, and, lte, isNull, or } from "drizzle-orm";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

// ─── Types ───────────────────────────────────────────────────────────

export type RecurringFrequency = "daily" | "weekly" | "monthly";

export type CreateRecurringScheduleInput = {
  userId: string;
  channelId?: string;
  frequency: RecurringFrequency;
  /** 0=Sunday..6=Saturday, required for weekly */
  dayOfWeek?: number;
  /** 1–31, required for monthly */
  dayOfMonth?: number;
  /** HH:mm in user's local timezone */
  timeLocal: string;
  timezone: string;
  platforms: string[];
  contentTemplateId?: string;
};

export type RecurringScheduleResult = {
  success: boolean;
  scheduleId?: string;
  error?: string;
};

// ─── Next Occurrence Calculation ─────────────────────────────────────

/**
 * Calculate the next occurrence of a recurring schedule.
 *
 * @param frequency - daily, weekly, or monthly
 * @param timeUtc - HH:mm in UTC
 * @param timezone - IANA timezone string
 * @param dayOfWeek - 0-6 (Sunday-Saturday) for weekly
 * @param dayOfMonth - 1-31 for monthly
 * @param after - Calculate next occurrence after this UTC date (defaults to now)
 * @returns The next occurrence as a UTC Date
 */
export function getNextOccurrence(
  frequency: RecurringFrequency,
  timeUtc: string,
  timezone: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
  after?: Date,
): Date {
  const now = after ?? new Date();
  const [hours, minutes] = timeUtc.split(":").map(Number) as [number, number];

  // Build candidate date entirely in UTC
  let candidate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes, 0, 0),
  );

  switch (frequency) {
    case "daily": {
      // If today's time has passed or is exactly now, move to tomorrow
      if (now >= candidate) {
        candidate = new Date(candidate.getTime() + 86_400_000);
      }
      break;
    }

    case "weekly": {
      if (dayOfWeek == null) {
        throw new Error("dayOfWeek is required for weekly frequency");
      }
      // Calculate day difference to target day of week (in UTC)
      const currentDay = candidate.getUTCDay();
      let diff = dayOfWeek - currentDay;
      if (diff < 0) diff += 7;
      if (diff === 0 && now >= candidate) {
        // Same day but time passed, go to next week
        diff = 7;
      }
      candidate = new Date(candidate.getTime() + diff * 86_400_000);
      break;
    }

    case "monthly": {
      if (dayOfMonth == null) {
        throw new Error("dayOfMonth is required for monthly frequency");
      }
      // Clamp to last day of current month
      const targetDay = Math.min(dayOfMonth, daysInMonth(candidate));
      candidate.setUTCDate(targetDay);
      // If we landed on a past date/time, advance to next month
      if (now >= candidate) {
        // Move to first of next month, then clamp
        const nextMonth = new Date(
          Date.UTC(
            candidate.getUTCFullYear(),
            candidate.getUTCMonth() + 1,
            1,
            hours,
            minutes,
            0,
            0,
          ),
        );
        const nextTargetDay = Math.min(dayOfMonth, daysInMonth(nextMonth));
        nextMonth.setUTCDate(nextTargetDay);
        candidate = nextMonth;
      }
      break;
    }
  }

  return candidate;
}

/** Get number of days in the month for a given date (UTC) */
function daysInMonth(date: Date): number {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

/**
 * Convert user's local time (HH:mm) to UTC time (HH:mm).
 * We use a reference date to handle timezone offsets properly.
 */
export function localTimeToUtc(timeLocal: string, timezone: string): string {
  const [hours, minutes] = timeLocal.split(":").map(Number) as [number, number];
  // Use a fixed reference date to avoid DST edge cases at year boundaries
  const refDate = new Date(2026, 5, 15, hours, minutes, 0, 0);
  const utcDate = fromZonedTime(refDate, timezone);
  const utcHours = String(utcDate.getUTCHours()).padStart(2, "0");
  const utcMinutes = String(utcDate.getUTCMinutes()).padStart(2, "0");
  return `${utcHours}:${utcMinutes}`;
}

// ─── Core Operations ─────────────────────────────────────────────────

/**
 * Create a new recurring schedule.
 */
export async function createRecurringSchedule(
  input: CreateRecurringScheduleInput,
): Promise<RecurringScheduleResult> {
  // Validate frequency-specific fields
  if (input.frequency === "weekly" && input.dayOfWeek == null) {
    return { success: false, error: "dayOfWeek is required for weekly frequency" };
  }
  if (input.frequency === "monthly" && input.dayOfMonth == null) {
    return { success: false, error: "dayOfMonth is required for monthly frequency" };
  }
  if (input.dayOfWeek != null && (input.dayOfWeek < 0 || input.dayOfWeek > 6)) {
    return { success: false, error: "dayOfWeek must be between 0 and 6" };
  }
  if (input.dayOfMonth != null && (input.dayOfMonth < 1 || input.dayOfMonth > 31)) {
    return { success: false, error: "dayOfMonth must be between 1 and 31" };
  }
  if (input.platforms.length === 0) {
    return { success: false, error: "At least one platform is required" };
  }

  const timeUtc = localTimeToUtc(input.timeLocal, input.timezone);
  const nextRunAt = getNextOccurrence(
    input.frequency,
    timeUtc,
    input.timezone,
    input.dayOfWeek,
    input.dayOfMonth,
  );

  const [schedule] = await db
    .insert(recurringSchedules)
    .values({
      userId: input.userId,
      channelId: input.channelId ?? null,
      frequency: input.frequency,
      dayOfWeek: input.dayOfWeek ?? null,
      dayOfMonth: input.dayOfMonth ?? null,
      timeUtc,
      timezone: input.timezone,
      platforms: input.platforms,
      contentTemplateId: input.contentTemplateId ?? null,
      isActive: true,
      nextRunAt,
    })
    .returning({ id: recurringSchedules.id });

  if (!schedule) {
    return { success: false, error: "Failed to create recurring schedule" };
  }

  return { success: true, scheduleId: schedule.id };
}

/**
 * Pause an active recurring schedule.
 */
export async function pauseSchedule(
  scheduleId: string,
  userId: string,
): Promise<RecurringScheduleResult> {
  const [updated] = await db
    .update(recurringSchedules)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(recurringSchedules.id, scheduleId),
        eq(recurringSchedules.userId, userId),
        eq(recurringSchedules.isActive, true),
      ),
    )
    .returning({ id: recurringSchedules.id });

  if (!updated) {
    return { success: false, error: "Schedule not found or already paused" };
  }

  return { success: true, scheduleId: updated.id };
}

/**
 * Resume a paused recurring schedule. Recalculates next_run_at.
 */
export async function resumeSchedule(
  scheduleId: string,
  userId: string,
): Promise<RecurringScheduleResult> {
  // First fetch the schedule to get frequency details
  const existing = await db.query.recurringSchedules.findFirst({
    where: and(
      eq(recurringSchedules.id, scheduleId),
      eq(recurringSchedules.userId, userId),
      eq(recurringSchedules.isActive, false),
    ),
  });

  if (!existing) {
    return { success: false, error: "Schedule not found or already active" };
  }

  const nextRunAt = getNextOccurrence(
    existing.frequency,
    existing.timeUtc,
    existing.timezone,
    existing.dayOfWeek,
    existing.dayOfMonth,
  );

  const [updated] = await db
    .update(recurringSchedules)
    .set({
      isActive: true,
      nextRunAt,
      updatedAt: new Date(),
    })
    .where(eq(recurringSchedules.id, scheduleId))
    .returning({ id: recurringSchedules.id });

  if (!updated) {
    return { success: false, error: "Failed to resume schedule" };
  }

  return { success: true, scheduleId: updated.id };
}

/**
 * Get all recurring schedules for a user.
 */
export async function getRecurringSchedules(userId: string) {
  return db.query.recurringSchedules.findMany({
    where: eq(recurringSchedules.userId, userId),
    orderBy: (s, { asc }) => [asc(s.createdAt)],
  });
}

/**
 * Get active recurring schedules whose next_run_at is within the given window.
 * Used by the cron function.
 */
export async function getDueRecurringSchedules(windowEnd: Date) {
  return db.query.recurringSchedules.findMany({
    where: and(eq(recurringSchedules.isActive, true), lte(recurringSchedules.nextRunAt, windowEnd)),
  });
}

/**
 * Check if a scheduled post already exists for a specific recurring schedule occurrence.
 * Prevents duplicate posts for the same occurrence.
 */
export async function hasExistingOccurrence(
  recurringScheduleId: string,
  occurrenceTime: Date,
): Promise<boolean> {
  // We check schedules table for posts linked to this recurring schedule
  // with the same scheduled_at time (within 1 minute tolerance)
  const toleranceMs = 60_000;
  const lower = new Date(occurrenceTime.getTime() - toleranceMs);
  const upper = new Date(occurrenceTime.getTime() + toleranceMs);

  const existing = await db.query.schedules.findFirst({
    where: and(
      eq(schedules.recurrenceRule, recurringScheduleId),
      lte(schedules.scheduledAt, upper),
      // scheduledAt >= lower — use a subquery approach
    ),
  });

  // Additional check: verify the time is close enough
  if (existing && existing.scheduledAt) {
    const diff = Math.abs(existing.scheduledAt.getTime() - occurrenceTime.getTime());
    return diff <= toleranceMs;
  }

  return false;
}

/**
 * Update next_run_at and last_run_at for a recurring schedule after processing.
 */
export async function advanceRecurringSchedule(scheduleId: string) {
  const schedule = await db.query.recurringSchedules.findFirst({
    where: eq(recurringSchedules.id, scheduleId),
  });

  if (!schedule) return;

  const now = new Date();
  const nextRunAt = getNextOccurrence(
    schedule.frequency,
    schedule.timeUtc,
    schedule.timezone,
    schedule.dayOfWeek,
    schedule.dayOfMonth,
    now,
  );

  await db
    .update(recurringSchedules)
    .set({
      lastRunAt: now,
      nextRunAt,
      updatedAt: now,
    })
    .where(eq(recurringSchedules.id, scheduleId));
}
