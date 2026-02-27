import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock DB and Inngest to avoid needing DATABASE_URL in test
vi.mock("@/server/db", () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    query: { schedules: { findMany: vi.fn(), findFirst: vi.fn() } },
  },
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: vi.fn() },
}));

import { validateScheduleTime } from "../engine";

describe("scheduling engine", () => {
  describe("validateScheduleTime", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Fix "now" to 2026-03-05T12:00:00Z
      vi.setSystemTime(new Date("2026-03-05T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns utcDate for a valid future time", () => {
      // User picks 2026-03-06 10:00 in Asia/Almaty → 2026-03-06 05:00 UTC (future)
      const localDate = new Date(2026, 2, 6, 10, 0, 0);
      const result = validateScheduleTime(localDate, "Asia/Almaty");
      expect(result).toHaveProperty("utcDate");
      if ("utcDate" in result) {
        expect(result.utcDate.toISOString()).toBe("2026-03-06T05:00:00.000Z");
      }
    });

    it("returns error for a past time", () => {
      // User picks 2026-03-04 10:00 in UTC → clearly in the past
      const localDate = new Date(2026, 2, 4, 10, 0, 0);
      const result = validateScheduleTime(localDate, "UTC");
      expect(result).toHaveProperty("error");
      if ("error" in result) {
        expect(result.error).toBe("Cannot schedule in the past");
      }
    });

    it("handles timezone conversion correctly for edge case", () => {
      // It's currently 2026-03-05T12:00:00Z
      // User picks 2026-03-05 18:00 in Asia/Almaty (+5) → 2026-03-05 13:00 UTC → future
      const localDate = new Date(2026, 2, 5, 18, 0, 0);
      const result = validateScheduleTime(localDate, "Asia/Almaty");
      expect(result).toHaveProperty("utcDate");
      if ("utcDate" in result) {
        expect(result.utcDate.toISOString()).toBe("2026-03-05T13:00:00.000Z");
      }
    });

    it("rejects time that looks future locally but is past in UTC", () => {
      // It's currently 2026-03-05T12:00:00Z
      // User picks 2026-03-05 13:00 in Asia/Almaty (+5) → 2026-03-05 08:00 UTC → PAST
      const localDate = new Date(2026, 2, 5, 13, 0, 0);
      const result = validateScheduleTime(localDate, "Asia/Almaty");
      expect(result).toHaveProperty("error");
    });

    it("accepts a time just barely in the future", () => {
      // It's 2026-03-05T12:00:00Z, schedule for 12:01 UTC
      const localDate = new Date(2026, 2, 5, 12, 1, 0);
      const result = validateScheduleTime(localDate, "UTC");
      expect(result).toHaveProperty("utcDate");
    });
  });
});
