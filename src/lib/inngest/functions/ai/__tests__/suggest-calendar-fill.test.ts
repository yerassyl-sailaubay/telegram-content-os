import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Setup ──────────────────────────────────────────────────────────────

const {
  mockDetectCalendarGaps,
  mockEnforceAiQuota,
  mockIncrementAiUsage,
  mockGenerateEngine,
  scheduleResults,
  contentResults,
  channelProfileResults,
  insertResults,
} = vi.hoisted(() => ({
  mockDetectCalendarGaps: vi.fn(),
  mockEnforceAiQuota: vi.fn(),
  mockIncrementAiUsage: vi.fn(),
  mockGenerateEngine: { generate: vi.fn() },
  scheduleResults: [] as unknown[][],
  contentResults: [] as unknown[][],
  channelProfileResults: [] as unknown[][],
  insertResults: [] as unknown[][],
}));

vi.mock("@/lib/scheduling/calendar-gaps", () => ({
  detectCalendarGaps: mockDetectCalendarGaps,
}));

vi.mock("@/lib/billing/ai-quota", () => ({
  enforceAiQuota: mockEnforceAiQuota,
  incrementAiUsage: mockIncrementAiUsage,
}));

vi.mock("@/lib/ai/generation-engine", () => ({
  GenerationEngine: vi.fn(function () {
    return mockGenerateEngine;
  }),
}));

vi.mock("@/lib/ai/google", () => ({
  GoogleClient: vi.fn(function () {
    return {};
  }),
}));

function createSelectChain(resultQueue: unknown[][]) {
  const chain: Record<string, unknown> = {};
  const thenFn = (resolve: (val: unknown) => void) => {
    resolve(resultQueue.shift() ?? []);
  };
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.then = thenFn;
  return chain;
}

function createInsertChain() {
  const chain: Record<string, unknown> = {};
  const thenFn = (resolve: (val: unknown) => void) => {
    resolve(insertResults.shift() ?? []);
  };
  chain.values = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockReturnValue(chain);
  chain.then = thenFn;
  return chain;
}

let selectCallIdx = 0;

vi.mock("@/server/db", () => ({
  db: {
    select: () => {
      selectCallIdx++;
      // Call 1: existing schedules/content titles, Call 2: channel profile
      if (selectCallIdx % 3 === 1) return createSelectChain(scheduleResults);
      if (selectCallIdx % 3 === 2) return createSelectChain(contentResults);
      return createSelectChain(channelProfileResults);
    },
    insert: () => createInsertChain(),
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
    desc: vi.fn((_col: unknown) => ({ type: "desc" })),
  };
});

// ─── Import under test (after mocks) ────────────────────────────────────────

import { suggestCalendarFill } from "../suggest-calendar-fill";

type InngestHandler = { fn: (args: { event: unknown; step: unknown }) => Promise<unknown> };

function createMockStep() {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    sendEvent: vi.fn(async () => undefined),
  };
}

function createEvent(
  overrides: Partial<{
    channelId: string;
    userId: string;
    startDate: string;
    endDate: string;
  }> = {},
) {
  return {
    name: "ai/calendar.suggest-fill" as const,
    data: {
      channelId: overrides.channelId ?? "channel-uuid-1",
      userId: overrides.userId ?? "user-uuid-1",
      startDate: overrides.startDate ?? "2026-03-01",
      endDate: overrides.endDate ?? "2026-03-05",
    },
  };
}

async function runHandler(
  event: ReturnType<typeof createEvent>,
  step: ReturnType<typeof createMockStep>,
) {
  return (suggestCalendarFill as unknown as InngestHandler).fn({ event, step });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  scheduleResults.length = 0;
  contentResults.length = 0;
  channelProfileResults.length = 0;
  insertResults.length = 0;
  selectCallIdx = 0;
});

describe("suggestCalendarFill", () => {
  it("is a valid Inngest function with accessible handler", () => {
    expect(suggestCalendarFill).toBeDefined();
    expect((suggestCalendarFill as unknown as InngestHandler).fn).toBeTypeOf("function");
  });

  it("successful flow: detects gaps → loads context → generates suggestions → stores them", async () => {
    const event = createEvent();
    const step = createMockStep();

    // Gap detection returns 2 gap dates
    mockDetectCalendarGaps.mockResolvedValue(["2026-03-02", "2026-03-04"]);

    // Existing content titles
    contentResults.push([{ title: "Post about AI" }, { title: "Post about Design" }]);

    // Channel profile
    channelProfileResults.push([
      { niche: "tech", tone: "professional", topTopics: ["AI", "design"], language: "en" },
    ]);

    // Quota allowed
    mockEnforceAiQuota.mockResolvedValue({ allowed: true });

    // AI generation response
    mockGenerateEngine.generate.mockResolvedValue({
      content: JSON.stringify([
        {
          date: "2026-03-02",
          suggestedContent: "AI tools roundup",
          sourceType: "idea",
          confidence: 0.85,
        },
        {
          date: "2026-03-04",
          suggestedContent: "Design systems overview",
          sourceType: "idea",
          confidence: 0.78,
        },
      ]),
      type: "calendar_fill",
      modelUsed: "openai/gpt-4.1",
      tokenUsage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
    });

    // Store results
    insertResults.push([{ id: "content-1" }]);
    insertResults.push([{ id: "content-2" }]);

    // Usage tracking
    mockIncrementAiUsage.mockResolvedValue(undefined);

    const result = await runHandler(event, step);

    expect(mockDetectCalendarGaps).toHaveBeenCalledWith(
      "channel-uuid-1",
      "2026-03-01",
      "2026-03-05",
    );
    expect(mockEnforceAiQuota).toHaveBeenCalledWith("user-uuid-1");
    expect(mockGenerateEngine.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "calendar_fill",
      }),
    );
    expect(mockIncrementAiUsage).toHaveBeenCalledWith("user-uuid-1");
    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
        suggestionsCount: 2,
      }),
    );
  });

  it("skips AI generation when no gaps found", async () => {
    const event = createEvent();
    const step = createMockStep();

    mockDetectCalendarGaps.mockResolvedValue([]);

    const result = await runHandler(event, step);

    expect(mockDetectCalendarGaps).toHaveBeenCalled();
    expect(mockEnforceAiQuota).not.toHaveBeenCalled();
    expect(mockGenerateEngine.generate).not.toHaveBeenCalled();
    expect(mockIncrementAiUsage).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
        suggestionsCount: 0,
      }),
    );
  });

  it("throws when quota is exceeded", async () => {
    const event = createEvent();
    const step = createMockStep();

    mockDetectCalendarGaps.mockResolvedValue(["2026-03-02"]);
    contentResults.push([]);
    channelProfileResults.push([]);

    mockEnforceAiQuota.mockResolvedValue({
      allowed: false,
      reason: "ai_quota_exceeded",
      used: 100,
      limit: 100,
      upgradeUrl: "/dashboard/billing",
    });

    await expect(runHandler(event, step)).rejects.toThrow(/quota/i);
    expect(mockGenerateEngine.generate).not.toHaveBeenCalled();
    expect(mockIncrementAiUsage).not.toHaveBeenCalled();
  });

  it("propagates gap detection errors", async () => {
    const event = createEvent();
    const step = createMockStep();

    mockDetectCalendarGaps.mockRejectedValue(new Error("Date range exceeds 14 days"));

    await expect(runHandler(event, step)).rejects.toThrow(/range/i);
    expect(mockEnforceAiQuota).not.toHaveBeenCalled();
  });

  it("executes steps in correct order", async () => {
    const event = createEvent();
    const step = createMockStep();

    mockDetectCalendarGaps.mockResolvedValue(["2026-03-02"]);
    contentResults.push([]);
    channelProfileResults.push([]);
    mockEnforceAiQuota.mockResolvedValue({ allowed: true });
    mockGenerateEngine.generate.mockResolvedValue({
      content: JSON.stringify([
        {
          date: "2026-03-02",
          suggestedContent: "Content idea",
          sourceType: "idea",
          confidence: 0.8,
        },
      ]),
      type: "calendar_fill",
      modelUsed: "openai/gpt-4.1",
      tokenUsage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
    });
    insertResults.push([{ id: "content-1" }]);
    mockIncrementAiUsage.mockResolvedValue(undefined);

    await runHandler(event, step);

    const stepNames = step.run.mock.calls.map((call: unknown[]) => call[0]);
    expect(stepNames).toEqual([
      "detect-gaps",
      "load-existing-content",
      "load-channel-profile",
      "check-quota",
      "generate-suggestions",
      "store-suggestions",
      "track-usage",
    ]);
  });
});
