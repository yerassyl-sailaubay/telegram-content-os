import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockUser,
  mockReturning,
  mockInsert,
  mockUpdate,
  mockSelect,
  selectResults,
  mockPublishToTelegram,
} = vi.hoisted(() => ({
  mockUser: { id: "user-123", email: "test@example.com" },
  mockReturning: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockSelect: vi.fn(),
  selectResults: [] as unknown[][],
  mockPublishToTelegram: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockUser },
      }),
    },
  }),
}));

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
  },
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, val: unknown) => ({ type: "eq", val })),
    and: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
  };
});

vi.mock("../publish-telegram", () => ({
  publishToTelegram: mockPublishToTelegram,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { saveTelegramDraft, scheduleTelegramPost } from "../telegram-post";

beforeEach(() => {
  vi.clearAllMocks();
  selectResults.length = 0;
});

describe("saveTelegramDraft", () => {
  it("returns validation error when both content and image are empty", async () => {
    const result = await saveTelegramDraft({
      content: "   ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Content or image is required");
    }
  });

  it("creates a new draft with channel ownership check", async () => {
    selectResults.push([{ id: "channel-1", userId: "user-123" }]);
    mockReturning.mockResolvedValueOnce([
      {
        id: "content-1",
        status: "draft",
      },
    ]);

    const result = await saveTelegramDraft({
      channelId: "channel-1",
      content: "My draft content",
      parseMode: "MarkdownV2",
      imageUrl: "https://example.com/photo.jpg",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("content-1");
      expect(result.data.status).toBe("draft");
    }

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("updates an existing draft when contentId is provided", async () => {
    selectResults.push([{ id: "content-1", userId: "user-123", status: "draft" }]);
    selectResults.push([{ id: "channel-1", userId: "user-123" }]);
    mockReturning.mockResolvedValueOnce([
      {
        id: "content-1",
        status: "draft",
      },
    ]);

    const result = await saveTelegramDraft({
      contentId: "content-1",
      channelId: "channel-1",
      content: "Updated draft",
      parseMode: "HTML",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("content-1");
    }

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("preserves scheduled status when editing an already scheduled item", async () => {
    selectResults.push([{ id: "content-1", userId: "user-123", status: "scheduled" }]);
    selectResults.push([{ id: "channel-1", userId: "user-123" }]);
    mockReturning.mockResolvedValueOnce([
      {
        id: "content-1",
        status: "scheduled",
      },
    ]);

    const result = await saveTelegramDraft({
      contentId: "content-1",
      channelId: "channel-1",
      content: "Updated scheduled content",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("scheduled");
    }
  });

  it("returns an error when channel does not belong to user", async () => {
    selectResults.push([]);

    const result = await saveTelegramDraft({
      channelId: "channel-999",
      content: "Draft text",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel not found");
    }
  });
});

describe("scheduleTelegramPost", () => {
  it("returns validation error when channel is missing", async () => {
    const result = await scheduleTelegramPost({
      channelId: "",
      content: "Scheduled content",
      scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
      timezone: "UTC",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel ID is required");
    }
  });

  it("persists content first, then schedules publish via publishToTelegram", async () => {
    selectResults.push([{ id: "channel-1", userId: "user-123" }]);
    mockReturning.mockResolvedValueOnce([
      {
        id: "content-1",
        status: "draft",
      },
    ]);
    mockPublishToTelegram.mockResolvedValueOnce({
      success: true,
      data: { message: "Post scheduled" },
    });

    const scheduledAt = new Date(Date.now() + 7200_000).toISOString();
    const result = await scheduleTelegramPost({
      channelId: "channel-1",
      content: "Schedule me",
      scheduledAt,
      timezone: "UTC",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("content-1");
      expect(result.data.status).toBe("scheduled");
    }

    expect(mockPublishToTelegram).toHaveBeenCalledWith(
      "content-1",
      "channel-1",
      scheduledAt,
      "UTC",
    );
  });

  it("returns publish error when scheduling fails downstream", async () => {
    selectResults.push([{ id: "channel-1", userId: "user-123" }]);
    mockReturning.mockResolvedValueOnce([
      {
        id: "content-1",
        status: "draft",
      },
    ]);
    mockPublishToTelegram.mockResolvedValueOnce({
      success: false,
      error: "Cannot schedule in the past",
    });

    const result = await scheduleTelegramPost({
      channelId: "channel-1",
      content: "Schedule me",
      scheduledAt: new Date(Date.now() + 7200_000).toISOString(),
      timezone: "UTC",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cannot schedule in the past");
    }
  });
});
