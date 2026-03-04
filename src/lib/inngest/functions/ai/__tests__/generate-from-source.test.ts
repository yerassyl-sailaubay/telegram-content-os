import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — vi.mock() factories reference these
// ---------------------------------------------------------------------------

const {
  mockDbSelect,
  mockDbUpdate,
  mockDbFrom,
  mockDbWhere,
  mockDbSet,
  mockDbLimit,
  mockDbReturning,
  mockEnforceAiQuota,
  mockIncrementAiUsage,
  mockGenerationEngineGenerate,
} = vi.hoisted(() => {
  const mockGenerationEngineGenerate = vi.fn();
  return {
    mockDbSelect: vi.fn(),
    mockDbUpdate: vi.fn(),
    mockDbFrom: vi.fn(),
    mockDbWhere: vi.fn(),
    mockDbSet: vi.fn(),
    mockDbLimit: vi.fn(),
    mockDbReturning: vi.fn(),
    mockEnforceAiQuota: vi.fn(),
    mockIncrementAiUsage: vi.fn(),
    mockGenerationEngineGenerate: mockGenerationEngineGenerate,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/server/db", () => {
  const chain = {
    select: mockDbSelect,
    update: mockDbUpdate,
    from: mockDbFrom,
    where: mockDbWhere,
    set: mockDbSet,
    limit: mockDbLimit,
    returning: mockDbReturning,
  };
  // Each chain method returns the chain itself for fluent API
  mockDbSelect.mockReturnValue(chain);
  mockDbUpdate.mockReturnValue(chain);
  mockDbFrom.mockReturnValue(chain);
  mockDbWhere.mockReturnValue(chain);
  mockDbSet.mockReturnValue(chain);
  mockDbLimit.mockReturnValue(chain);
  mockDbReturning.mockReturnValue(chain);
  return { db: chain };
});

vi.mock("@/server/db/schema", () => ({
  contentLibrary: {
    id: "id",
    userId: "userId",
    content: "content",
    status: "status",
    channelId: "channelId",
    sourceType: "sourceType",
  },
  channelProfiles: {
    id: "id",
    channelId: "channelId",
    niche: "niche",
    tone: "tone",
    topTopics: "topTopics",
    language: "language",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ op: "eq", a, b })),
}));

vi.mock("@/lib/billing/ai-quota", () => ({
  enforceAiQuota: mockEnforceAiQuota,
  incrementAiUsage: mockIncrementAiUsage,
  AiQuotaExceededError: class AiQuotaExceededError extends Error {
    used: number;
    limit: number;
    upgradeUrl: string;
    constructor(used: number, limit: number) {
      super(`Monthly AI quota exceeded: ${used}/${limit}. Upgrade at /dashboard/billing`);
      this.name = "AiQuotaExceededError";
      this.used = used;
      this.limit = limit;
      this.upgradeUrl = "/dashboard/billing";
    }
  },
}));

vi.mock("@/lib/ai/google", () => ({
  GoogleClient: class MockGoogleClient {},
}));

vi.mock("@/lib/ai/generation-engine", () => ({
  GenerationEngine: class MockGenerationEngine {
    generate = mockGenerationEngineGenerate;
  },
}));

// ---------------------------------------------------------------------------
// Import SUT after mocks
// ---------------------------------------------------------------------------

import { generateFromSource } from "../generate-from-source";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type InngestHandler = {
  fn: (args: { event: unknown; step: unknown }) => Promise<unknown>;
};

function createMockStep() {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    sendEvent: vi.fn(async () => undefined),
  };
}

function createEvent(
  overrides: Partial<{
    contentItemId: string;
    userId: string;
    channelId: string;
  }> = {},
) {
  return {
    name: "ai/content.generate-from-source" as const,
    data: {
      contentItemId: overrides.contentItemId ?? "content-item-uuid-1",
      userId: overrides.userId ?? "user-uuid-1",
      channelId: overrides.channelId ?? "channel-uuid-1",
    },
  };
}

async function runHandler(
  event: ReturnType<typeof createEvent>,
  step: ReturnType<typeof createMockStep>,
) {
  return (generateFromSource as unknown as InngestHandler).fn({ event, step });
}

const MOCK_CONTENT_ITEM = {
  id: "content-item-uuid-1",
  userId: "user-uuid-1",
  content: "This is the source article content about AI technology.",
  title: "AI Technology Article",
  status: "draft",
  channelId: "channel-uuid-1",
  sourceType: "external_source",
  sourceUrl: "https://example.com/article",
};

const MOCK_CHANNEL_PROFILE = {
  id: "profile-uuid-1",
  channelId: "channel-uuid-1",
  niche: "Technology",
  tone: "Professional and informative",
  topTopics: ["AI", "Programming", "Startups"],
  language: "ru",
};

const MOCK_GENERATION_RESULT = {
  content: "Generated Telegram post about AI technology",
  type: "source_to_telegram" as const,
  modelUsed: "openai/gpt-4.1-mini",
  tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Default happy-path mocks
  mockEnforceAiQuota.mockResolvedValue({ allowed: true });
  mockIncrementAiUsage.mockResolvedValue(undefined);
  mockGenerationEngineGenerate.mockResolvedValue(MOCK_GENERATION_RESULT);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateFromSource", () => {
  it("is a valid Inngest function with accessible handler", () => {
    expect(generateFromSource).toBeDefined();
    expect((generateFromSource as unknown as InngestHandler).fn).toBeTypeOf("function");
  });

  it("successful generation: load → quota check → profile → generate → store → track usage", async () => {
    const event = createEvent();
    const step = createMockStep();

    // Step 1: load-content returns content item
    mockDbLimit.mockResolvedValueOnce([MOCK_CONTENT_ITEM]);

    // Step 3: load-channel-profile returns profile
    mockDbLimit.mockResolvedValueOnce([MOCK_CHANNEL_PROFILE]);

    // Step 5: store-result (update) returns updated item
    mockDbReturning.mockResolvedValueOnce([{ id: MOCK_CONTENT_ITEM.id }]);

    const result = await runHandler(event, step);

    // Verify step execution order
    const stepNames = step.run.mock.calls.map((call: unknown[]) => call[0]);
    expect(stepNames).toEqual([
      "load-content",
      "check-quota",
      "load-channel-profile",
      "generate",
      "store-result",
      "track-usage",
    ]);

    // Verify quota was checked
    expect(mockEnforceAiQuota).toHaveBeenCalledWith("user-uuid-1");

    // Verify generation engine was called with correct params
    expect(mockGenerationEngineGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "source_to_telegram",
        sourceContent: MOCK_CONTENT_ITEM.content,
        channelProfile: expect.objectContaining({
          niche: "Technology",
          tone: "Professional and informative",
          topTopics: ["AI", "Programming", "Startups"],
          language: "ru",
        }),
      }),
    );

    // Verify usage was incremented
    expect(mockIncrementAiUsage).toHaveBeenCalledWith("user-uuid-1");

    // Verify return value
    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
        contentItemId: MOCK_CONTENT_ITEM.id,
        modelUsed: "openai/gpt-4.1-mini",
      }),
    );
  });

  it("quota exceeded → rejects BEFORE AI call, no usage tracked", async () => {
    const event = createEvent();
    const step = createMockStep();

    // Step 1: load-content returns content item
    mockDbLimit.mockResolvedValueOnce([MOCK_CONTENT_ITEM]);

    // Step 2: quota check fails
    mockEnforceAiQuota.mockResolvedValueOnce({
      allowed: false,
      reason: "ai_quota_exceeded",
      used: 100,
      limit: 100,
      upgradeUrl: "/dashboard/billing",
    });

    await expect(runHandler(event, step)).rejects.toThrow(/quota.*exceeded/i);

    // Verify generation was NOT called
    expect(mockGenerationEngineGenerate).not.toHaveBeenCalled();

    // Verify usage was NOT incremented
    expect(mockIncrementAiUsage).not.toHaveBeenCalled();
  });

  it("content item not found → throws descriptive error", async () => {
    const event = createEvent({ contentItemId: "nonexistent-uuid" });
    const step = createMockStep();

    // Step 1: load-content returns empty
    mockDbLimit.mockResolvedValueOnce([]);

    await expect(runHandler(event, step)).rejects.toThrow(/not found/i);

    // Nothing after should execute
    expect(mockEnforceAiQuota).not.toHaveBeenCalled();
    expect(mockGenerationEngineGenerate).not.toHaveBeenCalled();
    expect(mockIncrementAiUsage).not.toHaveBeenCalled();
  });

  it("channel profile not found → uses default profile for generation", async () => {
    const event = createEvent();
    const step = createMockStep();

    // Step 1: load-content returns content item
    mockDbLimit.mockResolvedValueOnce([MOCK_CONTENT_ITEM]);

    // Step 3: load-channel-profile returns empty (no profile)
    mockDbLimit.mockResolvedValueOnce([]);

    // Step 5: store-result
    mockDbReturning.mockResolvedValueOnce([{ id: MOCK_CONTENT_ITEM.id }]);

    const result = await runHandler(event, step);

    // Verify generation was called with undefined channelProfile (engine uses defaults)
    expect(mockGenerationEngineGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "source_to_telegram",
        sourceContent: MOCK_CONTENT_ITEM.content,
        channelProfile: undefined,
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
      }),
    );
  });

  it("AI usage incremented AFTER successful generation", async () => {
    const event = createEvent();
    const step = createMockStep();

    // Track call order
    const callOrder: string[] = [];
    mockGenerationEngineGenerate.mockImplementation(async () => {
      callOrder.push("generate");
      return MOCK_GENERATION_RESULT;
    });
    mockIncrementAiUsage.mockImplementation(async () => {
      callOrder.push("increment");
    });

    // Step 1: load-content
    mockDbLimit.mockResolvedValueOnce([MOCK_CONTENT_ITEM]);
    // Step 3: load-channel-profile
    mockDbLimit.mockResolvedValueOnce([MOCK_CHANNEL_PROFILE]);
    // Step 5: store-result
    mockDbReturning.mockResolvedValueOnce([{ id: MOCK_CONTENT_ITEM.id }]);

    await runHandler(event, step);

    expect(callOrder).toEqual(["generate", "increment"]);
    expect(mockIncrementAiUsage).toHaveBeenCalledTimes(1);
    expect(mockIncrementAiUsage).toHaveBeenCalledWith("user-uuid-1");
  });

  it("stores generated content back into content_library via DB update", async () => {
    const event = createEvent();
    const step = createMockStep();

    // Step 1: load-content
    mockDbLimit.mockResolvedValueOnce([MOCK_CONTENT_ITEM]);
    // Step 3: load-channel-profile
    mockDbLimit.mockResolvedValueOnce([MOCK_CHANNEL_PROFILE]);
    // Step 5: store-result
    mockDbReturning.mockResolvedValueOnce([{ id: MOCK_CONTENT_ITEM.id }]);

    await runHandler(event, step);

    // Verify DB update was called (set is part of the chain)
    expect(mockDbUpdate).toHaveBeenCalled();
    expect(mockDbSet).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Generated Telegram post about AI technology",
        status: "draft",
      }),
    );
  });
});
