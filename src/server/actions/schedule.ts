"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  createSchedule,
  cancelSchedule,
  reschedulePost,
  getSchedulesInRange,
} from "@/lib/scheduling/engine";

// ─── Helpers ─────────────────────────────────────────────────────────

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

// ─── Actions ─────────────────────────────────────────────────────────

export async function createScheduleAction(formData: FormData) {
  const user = await requireUser();

  const crossPostId = formData.get("crossPostId") as string;
  const scheduledAt = formData.get("scheduledAt") as string;
  const timezone = formData.get("timezone") as string;

  if (!crossPostId || !scheduledAt || !timezone) {
    return { success: false, error: "Missing required fields" };
  }

  const result = await createSchedule({
    userId: user.id,
    crossPostId,
    scheduledAt: new Date(scheduledAt),
    timezone,
  });

  return result;
}

export async function cancelScheduleAction(formData: FormData) {
  const user = await requireUser();

  const scheduleId = formData.get("scheduleId") as string;

  if (!scheduleId) {
    return { success: false, error: "Missing schedule ID" };
  }

  const result = await cancelSchedule(scheduleId, user.id);

  return result;
}

export async function rescheduleAction(formData: FormData) {
  const user = await requireUser();

  const scheduleId = formData.get("scheduleId") as string;
  const newScheduledAt = formData.get("newScheduledAt") as string;
  const timezone = formData.get("timezone") as string;

  if (!scheduleId || !newScheduledAt || !timezone) {
    return { success: false, error: "Missing required fields" };
  }

  const result = await reschedulePost({
    scheduleId,
    userId: user.id,
    newScheduledAt: new Date(newScheduledAt),
    timezone,
  });

  return result;
}

export async function getSchedulesForCalendar(startUtc: string, endUtc: string) {
  const user = await requireUser();

  const schedules = await getSchedulesInRange(user.id, new Date(startUtc), new Date(endUtc));

  return schedules;
}
