import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockEnforceAiQuota,
  mockIncrementAiUsage,
  mockGenerateEngine,
  mockDbSelect,
  mockDbInsert,
  selectQueues,
  mockReturning,
} = vi.hoisted(() => ({
  mockEnforceAiQuota: vi.fn(),
  mockIncrementAiUsage: vi.fn(),
  mockGenerateEngine: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  selectQueues: [] as unknown[][],
  mockReturning: vi.fn(),
}));

vi.mock("@/lib/billing/ai-quota", () => ({
  enforceAiQuota: mockEnforceAiQuota,
  incrementAiUsage: mockIncrementAiUsage,
}));

vi.mock("@/lib/ai/google", () => ({
  GoogleClient: vi.fn(),
}));

vi.mock("@/lib/ai/generation-engine", () => ({
  GenerationEngine: vi.fn().mockImplementation(function () {
    return { generate: mockGenerateEngine };
  }),
}));

function createSelectChain() {
  const chain: Record<string, unknown> = {};
  const thenFn = (resolve: (val: unknown) => void) => {
    resolve(selectQueues.shift() ?? []);
  };
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.then = thenFn;
  return chain;
}

function createMutationChain() {
  const chain: Record<string, unknown> = {};
  chain.values = vi.fn().mockReturnValue(chain);
  chain.returning = mockReturning;
  return chain;
}

vi.mock("@/server/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockDbSelect(...args);
      return createSelectChain();
    },
    insert: (...args: unknown[]) => {
      mockDbInsert(...args);
      return createMutationChain();
    },
  },
}));

vi.mock("@/server/db/schema", () => ({
  contentLibrary: {
    id: "id",
    userId: "user_id",
    content: "content",
    channelId: "channel_id",
  },
  channelProfiles: {
    channelId: "channel_id",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
}));

import { repurposeContent } from "../repurpose-content";

type InngestHandler = { fn: (args: { event: unknown; step: unknown }) => Promise<unknown> };

function createMockStep() {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    sendEvent: vi.fn(async () => undefined),
  };
}

function createEvent(
  overrides: Partial<{
    contentId: string;
    mode: string;
    numVariations: number;
    userId: string;
    channelId: string;
  }> = {},
) {
  return {
    name: "ai/content.repurpose" as const,
    data: {
      contentId: overrides.contentId ?? "content-uuid-1",
      mode: overrides.mode ?? "shorter",
      numVariations: overrides.numVariations ?? 1,
      userId: overrides.userId ?? "user-123",
      channelId: overrides.channelId ?? "channel-uuid-1",
    },
  };
}

async function runHandler(
  event: ReturnType<typeof createEvent>,
  step: ReturnType<typeof createMockStep>,
) {
  return (repurposeContent as unknown as InngestHandler).fn({ event, step });
}

beforeEach(() => {
  vi.clearAllMocks();
  selectQueues.length = 0;
});

describe("repurposeContent", () => {
  it("is a valid Inngest function with accessible handler", () => {
    expect(repurposeContent).toBeDefined();
    expect((repurposeContent as unknown as InngestHandler).fn).toBeTypeOf("function");
  });

  it("full success flow: load → quota → profile → generate → store → track", async () => {
    const event = createEvent({ numVariations: 1 });
    const step = createMockStep();

    selectQueues.push([
      {
        id: "content-uuid-1",
        userId: "user-123",
        content: "Original telegram post about AI trends.",
        channelId: "channel-uuid-1",
        title: "AI Trends",
      },
    ]);

    mockEnforceAiQuota.mockResolvedValue({ allowed: true });

    selectQueues.push([
      {
        channelId: "channel-uuid-1",
        niche: "technology",
        tone: "professional",
        topTopics: ["AI", "startups"],
        language: "ru",
      },
    ]);

    mockGenerateEngine.mockResolvedValue({
      content: "Shorter version of the AI trends post.",
      type: "repurpose",
      modelUsed: "openai/gpt-4.1-mini",
      tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    });

    mockReturning.mockResolvedValue([{ id: "new-content-uuid-1" }]);
    mockIncrementAiUsage.mockResolvedValue(undefined);

    const result = await runHandler(event, step);

    expect(mockEnforceAiQuota).toHaveBeenCalledWith("user-123");
    expect(mockGenerateEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "repurpose",
        sourceContent: "Original telegram post about AI trends.",
        options: expect.objectContaining({
          repurposeMode: "shorter",
          numVariations: 1,
        }),
      }),
    );
    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockIncrementAiUsage).toHaveBeenCalledWith("user-123");
    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
        newContentIds: ["new-content-uuid-1"],
      }),
    );
  });

  it("throws when AI quota is exceeded", async () => {
    const event = createEvent();
    const step = createMockStep();

    selectQueues.push([
      {
        id: "content-uuid-1",
        userId: "user-123",
        content: "Some content",
        channelId: "channel-uuid-1",
      },
    ]);

    mockEnforceAiQuota.mockResolvedValue({
      allowed: false,
      reason: "ai_quota_exceeded",
      used: 100,
      limit: 100,
      upgradeUrl: "/dashboard/billing",
    });

    await expect(runHandler(event, step)).rejects.toThrow(/quota/i);
    expect(mockGenerateEngine).not.toHaveBeenCalled();
    expect(mockIncrementAiUsage).not.toHaveBeenCalled();
  });

  it("throws when content is not found", async () => {
    const event = createEvent({ contentId: "nonexistent" });
    const step = createMockStep();

    selectQueues.push([]);

    await expect(runHandler(event, step)).rejects.toThrow(/not found/i);
    expect(mockEnforceAiQuota).not.toHaveBeenCalled();
    expect(mockGenerateEngine).not.toHaveBeenCalled();
  });

  it("stores multiple variations as separate content items", async () => {
    const event = createEvent({ numVariations: 2 });
    const step = createMockStep();

    selectQueues.push([
      {
        id: "content-uuid-1",
        userId: "user-123",
        content: "Original content for repurposing.",
        channelId: "channel-uuid-1",
        title: "Original",
      },
    ]);

    mockEnforceAiQuota.mockResolvedValue({ allowed: true });

    selectQueues.push([
      {
        channelId: "channel-uuid-1",
        niche: "tech",
        tone: "casual",
        topTopics: ["AI"],
        language: "en",
      },
    ]);

    mockGenerateEngine.mockResolvedValue({
      content: ["Variation 1 of content.", "Variation 2 of content."],
      type: "repurpose",
      modelUsed: "openai/gpt-4.1-mini",
      tokenUsage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
    });

    mockReturning
      .mockResolvedValueOnce([{ id: "new-uuid-1" }])
      .mockResolvedValueOnce([{ id: "new-uuid-2" }]);
    mockIncrementAiUsage.mockResolvedValue(undefined);

    const result = await runHandler(event, step);

    expect(mockDbInsert).toHaveBeenCalledTimes(2);
    expect(mockIncrementAiUsage).toHaveBeenCalledWith("user-123");
    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
        newContentIds: ["new-uuid-1", "new-uuid-2"],
      }),
    );
  });

  it("proceeds gracefully when no channel profile exists", async () => {
    const event = createEvent();
    const step = createMockStep();

    selectQueues.push([
      {
        id: "content-uuid-1",
        userId: "user-123",
        content: "Content without channel profile.",
        channelId: "channel-uuid-1",
        title: "No Profile",
      },
    ]);

    mockEnforceAiQuota.mockResolvedValue({ allowed: true });
    selectQueues.push([]);

    mockGenerateEngine.mockResolvedValue({
      content: "Generated content without profile context.",
      type: "repurpose",
      modelUsed: "openai/gpt-4.1-mini",
      tokenUsage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
    });

    mockReturning.mockResolvedValue([{ id: "new-uuid-3" }]);
    mockIncrementAiUsage.mockResolvedValue(undefined);

    const result = await runHandler(event, step);

    expect(mockGenerateEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        channelProfile: undefined,
      }),
    );
    expect(result).toEqual(expect.objectContaining({ status: "completed" }));
  });
});
