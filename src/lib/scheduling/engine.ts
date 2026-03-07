import { db } from "@/server/db";
import { schedules } from "@/server/db/schema";
import { crossPosts } from "@/server/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { localToUtc, isInPast } from "./timezone";
import { inngest } from "@/lib/inngest/client";

// ─── Types ───────────────────────────────────────────────────────────

export type CreateScheduleInput = {
  userId: string;
  crossPostId: string;
  /** Local datetime the user picked in the UI */
  scheduledAt: Date;
  /** IANA timezone string, e.g. "Asia/Almaty" */
  timezone: string;
};

export type RescheduleInput = {
  scheduleId: string;
  userId: string;
  /** New local datetime */
  newScheduledAt: Date;
  /** IANA timezone */
  timezone: string;
};

export type ScheduleResult = {
  success: boolean;
  scheduleId?: string;
  error?: string;
};

// ─── Validation ──────────────────────────────────────────────────────

/**
 * Validate that a schedule date is not in the past.
 * Returns the UTC date if valid, or an error string.
 */
export function validateScheduleTime(
  localDate: Date,
  timezone: string,
): { utcDate: Date } | { error: string } {
  const utcDate = localToUtc(localDate, timezone);
  if (isInPast(utcDate)) {
    return { error: "Cannot schedule in the past" };
  }
  return { utcDate };
}

// ─── Core Engine ─────────────────────────────────────────────────────

/**
 * Create a new schedule. Stores the UTC time in DB and emits an Inngest
 * event that will fire at the scheduled time.
 */
export async function createSchedule(input: CreateScheduleInput): Promise<ScheduleResult> {
  const validation = validateScheduleTime(input.scheduledAt, input.timezone);
  if ("error" in validation) {
    return { success: false, error: validation.error };
  }

  const [schedule] = await db
    .insert(schedules)
    .values({
      userId: input.userId,
      crossPostId: input.crossPostId,
      scheduledAt: validation.utcDate,
      timezone: input.timezone,
      status: "pending",
    })
    .returning({ id: schedules.id });

  if (!schedule) {
    return { success: false, error: "Failed to create schedule" };
  }

  // Send Inngest event to fire at the scheduled time
  await inngest.send({
    name: "schedule/execute-post",
    data: {
      scheduleId: schedule.id,
      userId: input.userId,
    },
    ts: validation.utcDate.getTime(),
  });

  return { success: true, scheduleId: schedule.id };
}

/**
 * Cancel a pending schedule. Marks it as cancelled in DB.
 * The Inngest function will check the status before executing.
 */
export async function cancelSchedule(scheduleId: string, userId: string): Promise<ScheduleResult> {
  const [updated] = await db
    .update(schedules)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schedules.id, scheduleId),
        eq(schedules.userId, userId),
        eq(schedules.status, "pending"),
      ),
    )
    .returning({ id: schedules.id });

  if (!updated) {
    return {
      success: false,
      error: "Schedule not found or already processed",
    };
  }

  return { success: true, scheduleId: updated.id };
}

/**
 * Reschedule a pending post to a new time.
 * Cancels the old schedule and creates a logical "update" (same row, new time).
 */
export async function reschedulePost(input: RescheduleInput): Promise<ScheduleResult> {
  const validation = validateScheduleTime(input.newScheduledAt, input.timezone);
  if ("error" in validation) {
    return { success: false, error: validation.error };
  }

  const [updated] = await db
    .update(schedules)
    .set({
      scheduledAt: validation.utcDate,
      timezone: input.timezone,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schedules.id, input.scheduleId),
        eq(schedules.userId, input.userId),
        eq(schedules.status, "pending"),
      ),
    )
    .returning({ id: schedules.id });

  if (!updated) {
    return {
      success: false,
      error: "Schedule not found or already processed",
    };
  }

  // Send updated Inngest event for the new time
  await inngest.send({
    name: "schedule/execute-post",
    data: {
      scheduleId: updated.id,
      userId: input.userId,
    },
    ts: validation.utcDate.getTime(),
  });

  return { success: true, scheduleId: updated.id };
}

// ─── Queries ─────────────────────────────────────────────────────────

/**
 * Fetch schedules for a user within a date range (UTC).
 * Used by the calendar to display scheduled posts.
 */
export async function getSchedulesInRange(userId: string, startUtc: Date, endUtc: Date) {
  return db.query.schedules.findMany({
    where: and(
      eq(schedules.userId, userId),
      gte(schedules.scheduledAt, startUtc),
      lte(schedules.scheduledAt, endUtc),
    ),
    with: {
      crossPost: true,
      contentLibraryItem: true,
    },
    orderBy: (s, { asc }) => [asc(s.scheduledAt)],
  });
}

/**
 * Fetch a single schedule by ID and user.
 */
export async function getScheduleById(scheduleId: string, userId: string) {
  return db.query.schedules.findFirst({
    where: and(eq(schedules.id, scheduleId), eq(schedules.userId, userId)),
    with: {
      crossPost: true,
      contentLibraryItem: true,
    },
  });
}
