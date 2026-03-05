import { db } from "@/server/db";
import { schedules, contentLibrary } from "@/server/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

const MAX_DATE_RANGE_DAYS = 14;

function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]!);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function dateToIsoDate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

export async function detectCalendarGaps(
  channelId: string,
  startDate: string,
  endDate: string,
): Promise<string[]> {
  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");

  if (start > end) {
    throw new Error("Invalid date range: startDate must be before endDate");
  }

  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > MAX_DATE_RANGE_DAYS) {
    throw new Error(`Date range exceeds ${MAX_DATE_RANGE_DAYS} days`);
  }

  const endOfDay = new Date(endDate + "T23:59:59.999Z");

  const [scheduledItems, publishedItems] = await Promise.all([
    db
      .select({ scheduledAt: schedules.scheduledAt })
      .from(schedules)
      .where(
        and(
          eq(schedules.channelId, channelId),
          eq(schedules.targetType, "telegram_publish"),
          gte(schedules.scheduledAt, start),
          lte(schedules.scheduledAt, endOfDay),
        ),
      ),
    db
      .select({ createdAt: contentLibrary.createdAt })
      .from(contentLibrary)
      .where(
        and(
          eq(contentLibrary.channelId, channelId),
          eq(contentLibrary.status, "published"),
          gte(contentLibrary.createdAt, start),
          lte(contentLibrary.createdAt, endOfDay),
        ),
      ),
  ]);

  const coveredDates = new Set<string>();

  for (const item of scheduledItems) {
    if (item.scheduledAt) {
      coveredDates.add(dateToIsoDate(item.scheduledAt));
    }
  }

  for (const item of publishedItems) {
    if (item.createdAt) {
      coveredDates.add(dateToIsoDate(item.createdAt));
    }
  }

  const allDates = generateDateRange(startDate, endDate);
  return allDates.filter((date) => !coveredDates.has(date));
}
