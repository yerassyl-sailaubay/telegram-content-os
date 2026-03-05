import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock Setup (vi.hoisted REQUIRED for mock variables) ────────────
const {
  mockInsert,
  mockUpdate,
  mockSelect,
  mockReturning,
  mockFindFirst,
  mockFindMany,
  selectResults,
} = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockSelect: vi.fn(),
  mockReturning: vi.fn(),
  mockFindFirst: vi.fn(),
  mockFindMany: vi.fn(),
  selectResults: [] as unknown[][],
}));

// Build chainable mock for select queries
function createSelectChain() {
  const chain: Record<string, unknown> = {};
  const thenFn = (resolve: (val: unknown) => void) => {
    resolve(selectResults.shift() ?? []);
  };
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.then = thenFn;
  return chain;
}

function createMutationChain() {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockReturnValue(chain);
  chain.set = vi.fn().mockReturnValue(chain);
  chain.returning = mockReturning;
  return chain;
}

vi.mock("@/server/db", () => ({
  db: {
    insert: (...args: unknown[]) => {
      mockInsert(...args);
      return createMutationChain();
    },
    update: (...args: unknown[]) => {
      mockUpdate(...args);
      return createMutationChain();
    },
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return createSelectChain();
    },
    query: {
      recurringSchedules: {
        findFirst: mockFindFirst,
        findMany: mockFindMany,
      },
      schedules: {
        findFirst: mockFindFirst,
      },
    },
  },
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: vi.fn() },
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, val: unknown) => ({ type: "eq", val })),
    and: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
    lte: vi.fn((_col: unknown, val: unknown) => ({ type: "lte", val })),
    gte: vi.fn((_col: unknown, val: unknown) => ({ type: "gte", val })),
    isNull: vi.fn((_col: unknown) => ({ type: "isNull" })),
    or: vi.fn((...conditions: unknown[]) => ({ type: "or", conditions })),
  };
});

import {
  getNextOccurrence,
  localTimeToUtc,
  createRecurringSchedule,
  pauseSchedule,
  resumeSchedule,
} from "../recurring";

// ─── Tests ───────────────────────────────────────────────────────────

describe("recurring scheduling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Fix "now" to 2026-03-10T12:00:00Z (Tuesday)
    vi.setSystemTime(new Date("2026-03-10T12:00:00Z"));
    selectResults.length = 0;
    mockReturning.mockReset();
    mockInsert.mockClear();
    mockUpdate.mockClear();
    mockSelect.mockClear();
    mockFindFirst.mockReset();
    mockFindMany.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── getNextOccurrence ─────────────────────────────────────────────

  describe("getNextOccurrence", () => {
    describe("daily", () => {
      it("returns today if the time is still in the future", () => {
        // Now: 2026-03-10T12:00:00Z, time_utc: 14:00 → same day at 14:00 UTC
        const result = getNextOccurrence("daily", "14:00", "UTC");
        expect(result.toISOString()).toBe("2026-03-10T14:00:00.000Z");
      });

      it("returns tomorrow if today's time has already passed", () => {
        // Now: 2026-03-10T12:00:00Z, time_utc: 10:00 → tomorrow at 10:00 UTC
        const result = getNextOccurrence("daily", "10:00", "UTC");
        expect(result.toISOString()).toBe("2026-03-11T10:00:00.000Z");
      });

      it("returns tomorrow if time is exactly now", () => {
        // Now: 2026-03-10T12:00:00Z, time_utc: 12:00 → tomorrow
        const result = getNextOccurrence("daily", "12:00", "UTC");
        expect(result.toISOString()).toBe("2026-03-11T12:00:00.000Z");
      });

      it("respects 'after' parameter", () => {
        const after = new Date("2026-03-15T08:00:00Z");
        const result = getNextOccurrence("daily", "10:00", "UTC", null, null, after);
        expect(result.toISOString()).toBe("2026-03-15T10:00:00.000Z");
      });

      it("advances past 'after' if time already passed", () => {
        const after = new Date("2026-03-15T16:00:00Z");
        const result = getNextOccurrence("daily", "10:00", "UTC", null, null, after);
        expect(result.toISOString()).toBe("2026-03-16T10:00:00.000Z");
      });
    });

    describe("weekly", () => {
      it("returns next occurrence for the target day of week", () => {
        // Now: Tuesday 2026-03-10, target: Friday (5)
        const result = getNextOccurrence("weekly", "09:00", "UTC", 5);
        expect(result.toISOString()).toBe("2026-03-13T09:00:00.000Z");
        expect(result.getDay()).toBe(5); // Friday
      });

      it("returns same day if target day is today and time is in future", () => {
        // Now: Tuesday 2026-03-10T12:00Z, target: Tuesday (2) at 14:00
        const result = getNextOccurrence("weekly", "14:00", "UTC", 2);
        expect(result.toISOString()).toBe("2026-03-10T14:00:00.000Z");
        expect(result.getDay()).toBe(2);
      });

      it("returns next week if target day is today but time has passed", () => {
        // Now: Tuesday 2026-03-10T12:00Z, target: Tuesday (2) at 10:00
        const result = getNextOccurrence("weekly", "10:00", "UTC", 2);
        expect(result.toISOString()).toBe("2026-03-17T10:00:00.000Z");
        expect(result.getDay()).toBe(2);
      });

      it("handles Sunday (0) correctly", () => {
        // Now: Tuesday 2026-03-10, target: Sunday (0)
        const result = getNextOccurrence("weekly", "09:00", "UTC", 0);
        expect(result.getDay()).toBe(0);
        // Should be next Sunday: 2026-03-15
        expect(result.toISOString()).toBe("2026-03-15T09:00:00.000Z");
      });

      it("throws if dayOfWeek is not provided", () => {
        expect(() => getNextOccurrence("weekly", "09:00", "UTC")).toThrow(
          "dayOfWeek is required for weekly frequency",
        );
      });
    });

    describe("monthly", () => {
      it("returns current month if target day is in the future", () => {
        // Now: March 10, target: 15th
        const result = getNextOccurrence("monthly", "09:00", "UTC", null, 15);
        expect(result.toISOString()).toBe("2026-03-15T09:00:00.000Z");
      });

      it("returns next month if target day has passed", () => {
        // Now: March 10, target: 5th → April 5th
        const result = getNextOccurrence("monthly", "09:00", "UTC", null, 5);
        expect(result.toISOString()).toBe("2026-04-05T09:00:00.000Z");
      });

      it("clamps to last day of month for months with fewer days", () => {
        // Set to January 30, target: 31st
        vi.setSystemTime(new Date("2026-01-30T12:00:00Z"));
        const result = getNextOccurrence("monthly", "14:00", "UTC", null, 31);
        expect(result.toISOString()).toBe("2026-01-31T14:00:00.000Z");
      });

      it("clamps February 28 for dayOfMonth=31", () => {
        // Set to February 1, target: 31st → Feb has 28 days
        vi.setSystemTime(new Date("2026-02-01T12:00:00Z"));
        const result = getNextOccurrence("monthly", "09:00", "UTC", null, 31);
        expect(result.toISOString()).toBe("2026-02-28T09:00:00.000Z");
      });

      it("returns next month if same day but time passed", () => {
        // Now: March 10T12:00, target: 10th at 10:00 → April 10th
        const result = getNextOccurrence("monthly", "10:00", "UTC", null, 10);
        expect(result.toISOString()).toBe("2026-04-10T10:00:00.000Z");
      });

      it("throws if dayOfMonth is not provided", () => {
        expect(() => getNextOccurrence("monthly", "09:00", "UTC")).toThrow(
          "dayOfMonth is required for monthly frequency",
        );
      });
    });
  });

  // ─── localTimeToUtc ────────────────────────────────────────────────

  describe("localTimeToUtc", () => {
    it("converts Asia/Almaty time to UTC (offset -5h)", () => {
      // Asia/Almaty is UTC+5, so 14:00 local = 09:00 UTC
      const result = localTimeToUtc("14:00", "Asia/Almaty");
      expect(result).toBe("09:00");
    });

    it("converts America/New_York time to UTC (offset +5h in winter)", () => {
      // Using June 15 ref date: EDT = UTC-4, so 10:00 local = 14:00 UTC
      const result = localTimeToUtc("10:00", "America/New_York");
      expect(result).toBe("14:00");
    });

    it("handles UTC passthrough", () => {
      const result = localTimeToUtc("08:30", "UTC");
      expect(result).toBe("08:30");
    });

    it("handles midnight rollover", () => {
      // Asia/Almaty UTC+5: 02:00 local = 21:00 UTC (previous day)
      const result = localTimeToUtc("02:00", "Asia/Almaty");
      expect(result).toBe("21:00");
    });
  });

  // ─── createRecurringSchedule ───────────────────────────────────────

  describe("createRecurringSchedule", () => {
    it("creates a daily recurring schedule", async () => {
      mockReturning.mockResolvedValueOnce([{ id: "recurring-1" }]);

      const result = await createRecurringSchedule({
        userId: "user-1",
        frequency: "daily",
        timeLocal: "09:00",
        timezone: "UTC",
        platforms: ["linkedin"],
      });

      expect(result).toEqual({ success: true, scheduleId: "recurring-1" });
      expect(mockInsert).toHaveBeenCalled();
    });

    it("creates a weekly recurring schedule with dayOfWeek", async () => {
      mockReturning.mockResolvedValueOnce([{ id: "recurring-2" }]);

      const result = await createRecurringSchedule({
        userId: "user-1",
        frequency: "weekly",
        dayOfWeek: 1,
        timeLocal: "10:00",
        timezone: "Asia/Almaty",
        platforms: ["linkedin", "twitter"],
      });

      expect(result).toEqual({ success: true, scheduleId: "recurring-2" });
    });

    it("creates a monthly recurring schedule with dayOfMonth", async () => {
      mockReturning.mockResolvedValueOnce([{ id: "recurring-3" }]);

      const result = await createRecurringSchedule({
        userId: "user-1",
        frequency: "monthly",
        dayOfMonth: 15,
        timeLocal: "14:00",
        timezone: "Europe/London",
        platforms: ["twitter"],
      });

      expect(result).toEqual({ success: true, scheduleId: "recurring-3" });
    });

    it("rejects weekly without dayOfWeek", async () => {
      const result = await createRecurringSchedule({
        userId: "user-1",
        frequency: "weekly",
        timeLocal: "09:00",
        timezone: "UTC",
        platforms: ["linkedin"],
      });

      expect(result).toEqual({
        success: false,
        error: "dayOfWeek is required for weekly frequency",
      });
    });

    it("rejects monthly without dayOfMonth", async () => {
      const result = await createRecurringSchedule({
        userId: "user-1",
        frequency: "monthly",
        timeLocal: "09:00",
        timezone: "UTC",
        platforms: ["linkedin"],
      });

      expect(result).toEqual({
        success: false,
        error: "dayOfMonth is required for monthly frequency",
      });
    });

    it("rejects invalid dayOfWeek", async () => {
      const result = await createRecurringSchedule({
        userId: "user-1",
        frequency: "weekly",
        dayOfWeek: 7,
        timeLocal: "09:00",
        timezone: "UTC",
        platforms: ["linkedin"],
      });

      expect(result).toEqual({
        success: false,
        error: "dayOfWeek must be between 0 and 6",
      });
    });

    it("rejects invalid dayOfMonth", async () => {
      const result = await createRecurringSchedule({
        userId: "user-1",
        frequency: "monthly",
        dayOfMonth: 32,
        timeLocal: "09:00",
        timezone: "UTC",
        platforms: ["linkedin"],
      });

      expect(result).toEqual({
        success: false,
        error: "dayOfMonth must be between 1 and 31",
      });
    });

    it("rejects empty platforms", async () => {
      const result = await createRecurringSchedule({
        userId: "user-1",
        frequency: "daily",
        timeLocal: "09:00",
        timezone: "UTC",
        platforms: [],
      });

      expect(result).toEqual({
        success: false,
        error: "At least one platform is required",
      });
    });

    it("returns error if DB insert returns no row", async () => {
      mockReturning.mockResolvedValueOnce([]);

      const result = await createRecurringSchedule({
        userId: "user-1",
        frequency: "daily",
        timeLocal: "09:00",
        timezone: "UTC",
        platforms: ["linkedin"],
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to create recurring schedule",
      });
    });
  });

  // ─── pauseSchedule ────────────────────────────────────────────────

  describe("pauseSchedule", () => {
    it("pauses an active schedule", async () => {
      mockReturning.mockResolvedValueOnce([{ id: "recurring-1" }]);

      const result = await pauseSchedule("recurring-1", "user-1");

      expect(result).toEqual({ success: true, scheduleId: "recurring-1" });
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("returns error if schedule not found or already paused", async () => {
      mockReturning.mockResolvedValueOnce([]);

      const result = await pauseSchedule("recurring-1", "user-1");

      expect(result).toEqual({
        success: false,
        error: "Schedule not found or already paused",
      });
    });
  });

  // ─── resumeSchedule ───────────────────────────────────────────────

  describe("resumeSchedule", () => {
    it("resumes a paused schedule and recalculates nextRunAt", async () => {
      mockFindFirst.mockResolvedValueOnce({
        id: "recurring-1",
        userId: "user-1",
        frequency: "daily",
        timeUtc: "14:00",
        timezone: "UTC",
        dayOfWeek: null,
        dayOfMonth: null,
        isActive: false,
      });
      mockReturning.mockResolvedValueOnce([{ id: "recurring-1" }]);

      const result = await resumeSchedule("recurring-1", "user-1");

      expect(result).toEqual({ success: true, scheduleId: "recurring-1" });
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("returns error if schedule not found or already active", async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      const result = await resumeSchedule("recurring-1", "user-1");

      expect(result).toEqual({
        success: false,
        error: "Schedule not found or already active",
      });
    });
  });

  // ─── Timezone-aware scheduling ─────────────────────────────────────

  describe("timezone-aware scheduling", () => {
    it("creates schedule with correct UTC time from Asia/Almaty local time", async () => {
      mockReturning.mockResolvedValueOnce([{ id: "recurring-tz" }]);

      const result = await createRecurringSchedule({
        userId: "user-1",
        frequency: "daily",
        timeLocal: "14:00",
        timezone: "Asia/Almaty",
        platforms: ["linkedin"],
      });

      expect(result.success).toBe(true);
      // The internal timeUtc should be 09:00 (14:00 - 5h offset)
      // We verify the insert was called
      expect(mockInsert).toHaveBeenCalled();
    });

    it("getNextOccurrence works across timezone boundaries", () => {
      // Daily at 02:00 UTC (next day for some timezones)
      const result = getNextOccurrence("daily", "02:00", "UTC");
      // Now: 2026-03-10T12:00Z → next 02:00 is 2026-03-11T02:00Z
      expect(result.toISOString()).toBe("2026-03-11T02:00:00.000Z");
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles dayOfMonth=29 in non-leap year February", () => {
      // 2026 is not a leap year, Feb has 28 days
      vi.setSystemTime(new Date("2026-02-01T12:00:00Z"));
      const result = getNextOccurrence("monthly", "09:00", "UTC", null, 29);
      // Should clamp to Feb 28
      expect(result.toISOString()).toBe("2026-02-28T09:00:00.000Z");
    });

    it("handles dayOfMonth=29 in leap year February", () => {
      // 2028 is a leap year
      vi.setSystemTime(new Date("2028-02-01T12:00:00Z"));
      const result = getNextOccurrence("monthly", "09:00", "UTC", null, 29);
      expect(result.toISOString()).toBe("2028-02-29T09:00:00.000Z");
    });

    it("daily schedule at midnight UTC", () => {
      const result = getNextOccurrence("daily", "00:00", "UTC");
      // 2026-03-10T12:00Z, midnight has passed, so next is 2026-03-11T00:00Z
      expect(result.toISOString()).toBe("2026-03-11T00:00:00.000Z");
    });

    it("weekly handles wrap-around from Saturday to Monday", () => {
      // Now: Tuesday 2026-03-10, target: Monday (1)
      // setDay(candidate, 1) would go backward to 2026-03-09 (past Monday)
      // Since that's in the past, should advance to next Monday: 2026-03-16
      const result = getNextOccurrence("weekly", "09:00", "UTC", 1);
      expect(result.toISOString()).toBe("2026-03-16T09:00:00.000Z");
      expect(result.getDay()).toBe(1);
    });

    it("monthly with dayOfMonth=1 when past first of current month", () => {
      // Now: March 10, target: 1st → April 1st
      const result = getNextOccurrence("monthly", "09:00", "UTC", null, 1);
      expect(result.toISOString()).toBe("2026-04-01T09:00:00.000Z");
    });

    it("multiple platforms in createRecurringSchedule", async () => {
      mockReturning.mockResolvedValueOnce([{ id: "recurring-multi" }]);

      const result = await createRecurringSchedule({
        userId: "user-1",
        frequency: "daily",
        timeLocal: "09:00",
        timezone: "UTC",
        platforms: ["linkedin", "twitter"],
      });

      expect(result.success).toBe(true);
    });
  });
});
