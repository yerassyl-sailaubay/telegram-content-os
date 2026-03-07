import { describe, expect, it } from "vitest";
import { mapScheduleRowsToItems, type CalendarScheduleRow } from "../schedule-mapper";

describe("mapScheduleRowsToItems", () => {
  it("maps telegram publish schedules to telegram platform rows", () => {
    const rows: CalendarScheduleRow[] = [
      {
        id: "schedule-1",
        scheduledAt: new Date("2030-01-01T10:00:00.000Z"),
        timezone: "Asia/Almaty",
        status: "pending",
        targetType: "telegram_publish",
        crossPost: null,
        contentLibraryItem: {
          content: "Telegram planned post",
        },
      },
    ];

    const result = mapScheduleRowsToItems(rows);

    expect(result).toEqual([
      {
        id: "schedule-1",
        scheduledAt: new Date("2030-01-01T10:00:00.000Z"),
        timezone: "Asia/Almaty",
        status: "pending",
        platform: "telegram",
        contentPreview: "Telegram planned post",
      },
    ]);
  });

  it("maps cross-post schedules with platform/content from crossPost relation", () => {
    const rows: CalendarScheduleRow[] = [
      {
        id: "schedule-2",
        scheduledAt: new Date("2030-01-02T10:00:00.000Z"),
        timezone: "UTC",
        status: "pending",
        targetType: "cross_post",
        crossPost: {
          platform: "twitter",
          adaptedContent: "Thread teaser",
        },
        contentLibraryItem: {
          content: "Fallback content",
        },
      },
    ];

    const result = mapScheduleRowsToItems(rows);

    expect(result).toEqual([
      {
        id: "schedule-2",
        scheduledAt: new Date("2030-01-02T10:00:00.000Z"),
        timezone: "UTC",
        status: "pending",
        platform: "twitter",
        contentPreview: "Thread teaser",
      },
    ]);
  });
});
