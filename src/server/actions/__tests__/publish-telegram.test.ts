import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUser,
  mockReturning,
  mockInsert,
  mockUpdate,
  mockSelect,
  selectResults,
  mockInngestSend,
} = vi.hoisted(() => ({
  mockUser: { id: "user-123", email: "test@example.com" },
  mockReturning: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockSelect: vi.fn(),
  selectResults: [] as unknown[][],
  mockInngestSend: vi.fn().mockResolvedValue(undefined),
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

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    send: mockInngestSend,
  },
}));

import { publishToTelegram } from "../publish-telegram";

beforeEach(() => {
  vi.clearAllMocks();
  selectResults.length = 0;
  mockInngestSend.mockResolvedValue(undefined);
});

describe("publishToTelegram", () => {
  it("emits event without ts for immediate publish and returns success", async () => {
    selectResults.push([{ id: "content-1", userId: "user-123", status: "draft" }]);
    selectResults.push([{ id: "channel-1", userId: "user-123" }]);
    mockReturning.mockResolvedValueOnce([{ id: "content-1", status: "draft" }]);

    const result = await publishToTelegram("content-1", "channel-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe("Publishing started");
    }

    expect(mockInngestSend).toHaveBeenCalledTimes(1);
    const eventArg = mockInngestSend.mock.calls[0][0];
    expect(eventArg.name).toBe("telegram/post.publish");
    expect(eventArg.data).toEqual({
      contentId: "content-1",
      userId: "user-123",
      channelId: "channel-1",
    });
    expect(eventArg.ts).toBeUndefined();
  });

  it("creates schedule record and emits event with ts for scheduled publish", async () => {
    selectResults.push([{ id: "content-1", userId: "user-123", status: "draft" }]);
    selectResults.push([{ id: "channel-1", userId: "user-123" }]);
    mockReturning.mockResolvedValueOnce([{ id: "schedule-1" }]);
    mockReturning.mockResolvedValueOnce([{ id: "content-1", status: "scheduled" }]);

    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();

    const result = await publishToTelegram("content-1", "channel-1", futureDate, "UTC");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe("Post scheduled");
    }

    expect(mockInsert).toHaveBeenCalledTimes(1);

    expect(mockInngestSend).toHaveBeenCalledTimes(1);
    const eventArg = mockInngestSend.mock.calls[0][0];
    expect(eventArg.name).toBe("telegram/post.publish");
    expect(eventArg.ts).toBe(new Date(futureDate).getTime());

    expect(mockUpdate).toHaveBeenCalled();
  });

  it("rejects scheduling in the past", async () => {
    selectResults.push([{ id: "content-1", userId: "user-123", status: "draft" }]);
    selectResults.push([{ id: "channel-1", userId: "user-123" }]);

    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();

    const result = await publishToTelegram("content-1", "channel-1", pastDate, "UTC");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cannot schedule in the past");
    }

    expect(mockInngestSend).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects content that is already published", async () => {
    selectResults.push([{ id: "content-1", userId: "user-123", status: "published" }]);
    selectResults.push([{ id: "channel-1", userId: "user-123" }]);

    const result = await publishToTelegram("content-1", "channel-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("cannot be published");
    }

    expect(mockInngestSend).not.toHaveBeenCalled();
  });

  it("rejects content that is archived", async () => {
    selectResults.push([{ id: "content-1", userId: "user-123", status: "archived" }]);
    selectResults.push([{ id: "channel-1", userId: "user-123" }]);

    const result = await publishToTelegram("content-1", "channel-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("cannot be published");
    }

    expect(mockInngestSend).not.toHaveBeenCalled();
  });

  it("rejects when channel does not belong to user", async () => {
    selectResults.push([{ id: "content-1", userId: "user-123", status: "draft" }]);
    selectResults.push([]);

    const result = await publishToTelegram("content-1", "channel-999");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel not found");
    }

    expect(mockInngestSend).not.toHaveBeenCalled();
  });

  it("returns error when user is not authenticated", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    } as never);

    const result = await publishToTelegram("content-1", "channel-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized");
    }

    expect(mockInngestSend).not.toHaveBeenCalled();
  });

  it("returns error when content is not found", async () => {
    selectResults.push([]);

    const result = await publishToTelegram("nonexistent", "channel-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Content not found");
    }

    expect(mockInngestSend).not.toHaveBeenCalled();
  });

  it("updates content status to scheduled when scheduling", async () => {
    selectResults.push([{ id: "content-1", userId: "user-123", status: "draft" }]);
    selectResults.push([{ id: "channel-1", userId: "user-123" }]);
    mockReturning.mockResolvedValueOnce([{ id: "schedule-1" }]);
    mockReturning.mockResolvedValueOnce([{ id: "content-1", status: "scheduled" }]);

    const futureDate = new Date(Date.now() + 7200 * 1000).toISOString();

    const result = await publishToTelegram("content-1", "channel-1", futureDate, "UTC");

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
