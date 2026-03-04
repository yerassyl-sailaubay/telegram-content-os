import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockEnforceAiQuota, mockIncrementAiUsage, mockGenerate, mockDbSelect, mockDbUpdate } =
  vi.hoisted(() => ({
    mockEnforceAiQuota: vi.fn(),
    mockIncrementAiUsage: vi.fn(),
    mockGenerate: vi.fn(),
    mockDbSelect: vi.fn(),
    mockDbUpdate: vi.fn(),
  }));

vi.mock("@/lib/billing/ai-quota", () => ({
  enforceAiQuota: mockEnforceAiQuota,
  incrementAiUsage: mockIncrementAiUsage,
}));

vi.mock("@/lib/ai/generation-engine", () => ({
  GenerationEngine: class {
    generate = mockGenerate;
  },
}));

vi.mock("@/lib/ai/openrouter", () => ({
  OpenRouterClient: class {},
}));

function createSelectChain(data: unknown[]) {
  const chain: Record<string, unknown> = {};
  const thenFn = (resolve: (val: unknown) => void) => {
    resolve(data);
  };
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.then = thenFn;
  return chain;
}

function createUpdateChain(data: unknown[] = []) {
  const chain: Record<string, unknown> = {};
  const thenFn = (resolve: (val: unknown) => void) => {
    resolve(data);
  };
  chain.set = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockReturnValue({ then: thenFn });
  chain.then = thenFn;
  return chain;
}

const selectResults: unknown[][] = [];

vi.mock("@/server/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockDbSelect(...args);
      return createSelectChain(selectResults.shift() ?? []);
    },
    update: (...args: unknown[]) => {
      mockDbUpdate(...args);
      return createUpdateChain(selectResults.shift() ?? []);
    },
  },
}));

vi.mock("@/server/db/schema", () => ({
  contentLibrary: {
    id: "id",
    userId: "userId",
    channelId: "channelId",
    sourceType: "sourceType",
    status: "status",
    content: "content",
    title: "title",
    updatedAt: "updatedAt",
  },
  channelProfiles: { channelId: "channelId" },
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, val: unknown) => ({ type: "eq", val })),
    and: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
    desc: vi.fn((col: unknown) => ({ type: "desc", col })),
  };
});

import { developIdea } from "../develop-idea";

type InngestHandler = { fn: (args: { event: unknown; step: unknown }) => Promise<unknown> };

function createMockStep() {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    sendEvent: vi.fn(async () => undefined),
  };
}

function createEvent(
  overrides: Partial<{ contentId: string; userId: string; channelId: string }> = {},
) {
  return {
    name: "ai/content.develop-idea" as const,
    data: {
      contentId: overrides.contentId ?? "content-uuid-1",
      userId: overrides.userId ?? "user-uuid-1",
      channelId: overrides.channelId ?? "channel-uuid-1",
    },
  };
}

async function runHandler(
  event: ReturnType<typeof createEvent>,
  step: ReturnType<typeof createMockStep>,
) {
  return (developIdea as unknown as InngestHandler).fn({ event, step });
}

beforeEach(() => {
  vi.clearAllMocks();
  selectResults.length = 0;
  mockEnforceAiQuota.mockResolvedValue({ allowed: true });
  mockIncrementAiUsage.mockResolvedValue(undefined);
});

describe("developIdea Inngest function", () => {
  it("is a valid Inngest function with accessible handler", () => {
    expect(developIdea).toBeDefined();
    expect((developIdea as unknown as InngestHandler).fn).toBeTypeOf("function");
  });

  it("full pipeline: load content → check quota → load profile → load recent drafts → generate → update → track usage", async () => {
    const event = createEvent();
    const step = createMockStep();

    selectResults.push([
      {
        id: "content-uuid-1",
        userId: "user-uuid-1",
        title: "My Idea",
        content: "An idea about AI trends",
        sourceType: "idea",
        status: "draft",
        channelId: "channel-uuid-1",
      },
    ]);

    selectResults.push([
      {
        id: "profile-1",
        channelId: "channel-uuid-1",
        niche: "tech",
        tone: "professional",
        topTopics: ["AI", "startups"],
        language: "en",
      },
    ]);

    selectResults.push([
      { id: "draft-1", title: "Existing Draft 1" },
      { id: "draft-2", title: "Existing Draft 2" },
    ]);

    mockGenerate.mockResolvedValue({
      content: "Generated draft content about AI trends",
      type: "idea_to_draft",
      modelUsed: "anthropic/claude-3.5-haiku",
      tokenUsage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
    });

    selectResults.push([
      {
        id: "content-uuid-1",
        content: "Generated draft content about AI trends",
        status: "draft",
        sourceType: "ai_generated",
      },
    ]);

    const result = await runHandler(event, step);

    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
        contentId: "content-uuid-1",
      }),
    );

    expect(mockEnforceAiQuota).toHaveBeenCalledWith("user-uuid-1");
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "idea_to_draft",
        sourceContent: "An idea about AI trends",
      }),
    );
    expect(mockIncrementAiUsage).toHaveBeenCalledWith("user-uuid-1");

    const stepNames = step.run.mock.calls.map((call: unknown[]) => call[0]);
    expect(stepNames).toContain("load-content");
    expect(stepNames).toContain("check-quota");
    expect(stepNames).toContain("load-channel-profile");
    expect(stepNames).toContain("load-recent-drafts");
    expect(stepNames).toContain("generate");
    expect(stepNames).toContain("update-content");
    expect(stepNames).toContain("track-usage");
  });

  it("throws when AI quota is exceeded", async () => {
    const event = createEvent();
    const step = createMockStep();

    selectResults.push([
      {
        id: "content-uuid-1",
        userId: "user-uuid-1",
        title: "My Idea",
        content: "An idea",
        sourceType: "idea",
        status: "draft",
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
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockIncrementAiUsage).not.toHaveBeenCalled();
  });

  it("throws when content is not found", async () => {
    const event = createEvent();
    const step = createMockStep();

    selectResults.push([]);

    await expect(runHandler(event, step)).rejects.toThrow(/not found/i);
    expect(mockEnforceAiQuota).not.toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("handles missing channel profile gracefully", async () => {
    const event = createEvent();
    const step = createMockStep();

    selectResults.push([
      {
        id: "content-uuid-1",
        userId: "user-uuid-1",
        title: "My Idea",
        content: "An idea",
        sourceType: "idea",
        status: "draft",
        channelId: "channel-uuid-1",
      },
    ]);

    selectResults.push([]);

    selectResults.push([]);

    mockGenerate.mockResolvedValue({
      content: "Generated content",
      type: "idea_to_draft",
      modelUsed: "anthropic/claude-3.5-haiku",
      tokenUsage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
    });

    selectResults.push([{ id: "content-uuid-1" }]);

    const result = await runHandler(event, step);

    expect(result).toEqual(expect.objectContaining({ status: "completed" }));
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        channelProfile: undefined,
      }),
    );
  });
});
