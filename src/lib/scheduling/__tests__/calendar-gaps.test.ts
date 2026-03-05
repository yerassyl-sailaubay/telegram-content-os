import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Setup ──────────────────────────────────────────────────────────────

const { scheduleResults, contentResults } = vi.hoisted(() => ({
  scheduleResults: [] as unknown[][],
  contentResults: [] as unknown[][],
}));

function createSelectChain(resultQueue: unknown[][]) {
  const chain: Record<string, unknown> = {};
  const thenFn = (resolve: (val: unknown) => void) => {
    resolve(resultQueue.shift() ?? []);
  };
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.then = thenFn;
  return chain;
}

let selectCallCount = 0;

vi.mock("@/server/db", () => ({
  db: {
    select: () => {
      selectCallCount++;
      // First select() call → schedules query, second → content_library query
      if (selectCallCount % 2 === 1) {
        return createSelectChain(scheduleResults);
      }
      return createSelectChain(contentResults);
    },
  },
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, val: unknown) => ({ type: "eq", val })),
    and: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
    gte: vi.fn((_col: unknown, val: unknown) => ({ type: "gte", val })),
    lte: vi.fn((_col: unknown, val: unknown) => ({ type: "lte", val })),
    between: vi.fn((_col: unknown, a: unknown, b: unknown) => ({ type: "between", a, b })),
    sql: actual.sql,
  };
});

// ─── Import under test (after mocks) ────────────────────────────────────────

import { detectCalendarGaps } from "../calendar-gaps";

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  scheduleResults.length = 0;
  contentResults.length = 0;
  selectCallCount = 0;
});

describe("detectCalendarGaps", () => {
  it("returns dates without scheduled or published content", async () => {
    // Schedules on 2026-03-01 and 2026-03-03
    scheduleResults.push([
      { scheduledAt: new Date("2026-03-01T10:00:00Z") },
      { scheduledAt: new Date("2026-03-03T14:00:00Z") },
    ]);
    // Published content on 2026-03-02
    contentResults.push([{ createdAt: new Date("2026-03-02T08:00:00Z") }]);

    const gaps = await detectCalendarGaps("channel-1", "2026-03-01", "2026-03-05");

    expect(gaps).toEqual(["2026-03-04", "2026-03-05"]);
  });

  it("returns empty array when all dates have content", async () => {
    // Every day has a schedule
    scheduleResults.push([
      { scheduledAt: new Date("2026-03-01T10:00:00Z") },
      { scheduledAt: new Date("2026-03-02T10:00:00Z") },
      { scheduledAt: new Date("2026-03-03T10:00:00Z") },
    ]);
    contentResults.push([]);

    const gaps = await detectCalendarGaps("channel-1", "2026-03-01", "2026-03-03");

    expect(gaps).toEqual([]);
  });

  it("returns all dates when no content exists", async () => {
    scheduleResults.push([]);
    contentResults.push([]);

    const gaps = await detectCalendarGaps("channel-1", "2026-03-01", "2026-03-03");

    expect(gaps).toEqual(["2026-03-01", "2026-03-02", "2026-03-03"]);
  });

  it("throws error when date range exceeds 14 days", async () => {
    await expect(detectCalendarGaps("channel-1", "2026-03-01", "2026-03-20")).rejects.toThrow(
      /range/i,
    );
  });

  it("throws error when startDate is after endDate", async () => {
    await expect(detectCalendarGaps("channel-1", "2026-03-05", "2026-03-01")).rejects.toThrow(
      /start.*before.*end|invalid/i,
    );
  });

  it("handles single-day range", async () => {
    scheduleResults.push([]);
    contentResults.push([]);

    const gaps = await detectCalendarGaps("channel-1", "2026-03-01", "2026-03-01");

    expect(gaps).toEqual(["2026-03-01"]);
  });
});
