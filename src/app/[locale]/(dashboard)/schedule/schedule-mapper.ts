import type { ScheduleItem } from "@/components/schedule/calendar";

type ScheduleTargetType = "cross_post" | "telegram_publish";
type ScheduleStatus = ScheduleItem["status"];

export type CalendarScheduleRow = {
  id: string;
  scheduledAt: Date | string;
  timezone: string | null;
  status: string | null;
  targetType?: ScheduleTargetType | null;
  crossPost?: {
    platform: "linkedin" | "twitter" | string;
    adaptedContent: string | null;
  } | null;
  contentLibraryItem?: {
    content: string | null;
  } | null;
};

function normalizeStatus(status: string | null): ScheduleStatus {
  if (
    status === "pending" ||
    status === "processing" ||
    status === "completed" ||
    status === "failed" ||
    status === "cancelled"
  ) {
    return status;
  }

  return "pending";
}

export function mapScheduleRowsToItems(rows: CalendarScheduleRow[]): ScheduleItem[] {
  return rows.map((row) => {
    const platform =
      row.targetType === "telegram_publish"
        ? "telegram"
        : row.crossPost?.platform === "twitter"
          ? "twitter"
          : "linkedin";

    return {
      id: row.id,
      scheduledAt: row.scheduledAt,
      timezone: row.timezone,
      status: normalizeStatus(row.status),
      platform,
      contentPreview: row.crossPost?.adaptedContent ?? row.contentLibraryItem?.content ?? null,
    };
  });
}
