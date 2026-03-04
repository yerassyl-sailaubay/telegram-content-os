"use server";

import { db } from "@/server/db";
import { telegramChannels, contentLibrary } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { eq, and, desc } from "drizzle-orm";
import type { CalendarFillSuggestion } from "@/lib/ai/types";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

const MAX_DATE_RANGE_DAYS = 14;

async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user.id;
}

function validateDateRange(startDate: string, endDate: string): string | null {
  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return "Invalid date format";
  }

  if (start > end) {
    return "Start date must be before end date";
  }

  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > MAX_DATE_RANGE_DAYS) {
    return `Date range exceeds ${MAX_DATE_RANGE_DAYS} days`;
  }

  return null;
}

export async function requestCalendarSuggestions(
  channelId: string,
  startDate: string,
  endDate: string,
): Promise<ActionResult<{ message: string }>> {
  try {
    const userId = await getCurrentUserId();

    const dateError = validateDateRange(startDate, endDate);
    if (dateError) {
      return { success: false, error: dateError };
    }

    const [channel] = await db
      .select()
      .from(telegramChannels)
      .where(and(eq(telegramChannels.id, channelId), eq(telegramChannels.userId, userId)))
      .limit(1);

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    await inngest.send({
      name: "ai/calendar.suggest-fill",
      data: {
        channelId,
        userId,
        startDate,
        endDate,
      },
    });

    return { success: true, data: { message: "Calendar suggestions requested" } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to request suggestions";
    return { success: false, error: message };
  }
}

export async function getCalendarSuggestions(
  channelId: string,
): Promise<ActionResult<CalendarFillSuggestion[]>> {
  try {
    const userId = await getCurrentUserId();

    const items = await db
      .select()
      .from(contentLibrary)
      .where(
        and(
          eq(contentLibrary.userId, userId),
          eq(contentLibrary.channelId, channelId),
          eq(contentLibrary.sourceType, "idea"),
        ),
      )
      .orderBy(desc(contentLibrary.createdAt))
      .limit(50);

    const suggestions: CalendarFillSuggestion[] = items
      .filter((item) => {
        const meta = item.sourceMetadata as Record<string, unknown> | null;
        return meta?.generatedBy === "calendar-fill";
      })
      .map((item) => {
        const meta = item.sourceMetadata as Record<string, unknown>;
        return {
          date: (meta.date as string) ?? "",
          suggestedContent: item.title ?? item.content ?? "",
          sourceId: item.id,
          sourceType: "idea" as const,
          confidence: (meta.confidence as number) ?? 0,
        };
      });

    return { success: true, data: suggestions };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get suggestions";
    return { success: false, error: message };
  }
}
