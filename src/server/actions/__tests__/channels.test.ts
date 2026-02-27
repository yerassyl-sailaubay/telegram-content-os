import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Setup ──────────────────────────────────────────────────────────────

const {
  mockUser,
  mockReturning,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockSelect,
  mockTgGetChat,
  mockTgGetChatMemberCount,
  mockTgSetWebhook,
  mockTgDeleteWebhook,
  selectResults,
} = vi.hoisted(() => ({
  mockUser: { id: "user-123", email: "test@example.com" },
  mockReturning: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockSelect: vi.fn(),
  mockTgGetChat: vi.fn(),
  mockTgGetChatMemberCount: vi.fn(),
  mockTgSetWebhook: vi.fn(),
  mockTgDeleteWebhook: vi.fn(),
  selectResults: [] as unknown[][],
}));

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockUser },
      }),
    },
  }),
}));

// Mock Telegram client
vi.mock("@/lib/telegram/client", () => ({
  getTelegramClient: vi.fn().mockReturnValue({
    getMe: vi.fn().mockResolvedValue({ username: "mybot" }),
    getChat: mockTgGetChat,
    getChatMemberCount: mockTgGetChatMemberCount,
    setWebhook: mockTgSetWebhook,
    deleteWebhook: mockTgDeleteWebhook,
  }),
}));

// Build a chainable mock that resolves to queued data when awaited
function createSelectChain() {
  const chain: Record<string, unknown> = {};
  const thenFn = (resolve: (val: unknown) => void) => {
    resolve(selectResults.shift() ?? []);
  };
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockReturnValue(chain);
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
    delete: (...args: unknown[]) => {
      mockDelete(...args);
      return createMutationChain();
    },
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return createSelectChain();
    },
  },
}));

// Mock drizzle-orm — preserve real exports, override operators
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, val: unknown) => ({ type: "eq", val })),
    and: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
    desc: vi.fn((col: unknown) => ({ type: "desc", col })),
    sql: vi.fn(() => ({ type: "sql" })),
  };
});

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ─── Import under test (after mocks) ────────────────────────────────────────

import {
  listChannels,
  getChannelDetails,
  connectChannel,
  disconnectChannel,
  updateChannelSettings,
} from "../channels";

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  selectResults.length = 0;
  mockTgGetChat.mockReset();
  mockTgGetChatMemberCount.mockReset();
  mockTgSetWebhook.mockReset();
  mockTgDeleteWebhook.mockReset();
});

// ─── listChannels ────────────────────────────────────────────────────────────

describe("listChannels", () => {
  it("returns empty array when no channels connected", async () => {
    // First select: channels list → empty
    selectResults.push([]);

    const result = await listChannels();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("returns channels with post counts", async () => {
    const mockChannel = {
      id: "channel-1",
      userId: "user-123",
      telegramChatId: "-100123456",
      title: "My Channel",
      username: "mychannel",
      description: null,
      memberCount: 1000,
      botTokenEncrypted: null,
      webhookSecret: null,
      connectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // First select: channels list
    selectResults.push([mockChannel]);
    // Second select: post stats for channel-1
    selectResults.push([{ count: 5, lastPostAt: new Date("2026-01-15") }]);

    const result = await listChannels();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe("My Channel");
      expect(result.data[0].postCount).toBe(5);
    }
  });

  it("handles post stats with zero posts", async () => {
    const mockChannel = {
      id: "channel-1",
      userId: "user-123",
      telegramChatId: "-100123456",
      title: "Empty Channel",
      username: "emptychannel",
      description: null,
      memberCount: 0,
      botTokenEncrypted: null,
      webhookSecret: null,
      connectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    selectResults.push([mockChannel]);
    selectResults.push([{ count: 0, lastPostAt: null }]);

    const result = await listChannels();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].postCount).toBe(0);
      expect(result.data[0].lastPostAt).toBeNull();
    }
  });
});

// ─── getChannelDetails ───────────────────────────────────────────────────────

describe("getChannelDetails", () => {
  it("returns error when ID is empty", async () => {
    const result = await getChannelDetails("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel ID is required");
    }
  });

  it("returns error when channel not found", async () => {
    selectResults.push([]);

    const result = await getChannelDetails("nonexistent");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel not found");
    }
  });

  it("returns channel details with post stats and recent posts", async () => {
    const mockChannel = {
      id: "channel-1",
      userId: "user-123",
      telegramChatId: "-100123456",
      title: "My Channel",
      username: "mychannel",
      description: "A great channel",
      memberCount: 500,
      botTokenEncrypted: null,
      webhookSecret: null,
      connectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPost = {
      id: "post-1",
      channelId: "channel-1",
      telegramMessageId: 42,
      contentRaw: "Hello world",
      contentParsed: null,
      mediaUrls: [],
      views: 100,
      forwards: 5,
      reactions: {},
      postedAt: new Date(),
      createdAt: new Date(),
    };

    // Select 1: channel lookup
    selectResults.push([mockChannel]);
    // Select 2: post stats
    selectResults.push([{ count: 1, lastPostAt: mockPost.postedAt }]);
    // Select 3: recent posts
    selectResults.push([mockPost]);

    const result = await getChannelDetails("channel-1");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("My Channel");
      expect(result.data.postCount).toBe(1);
      expect(result.data.recentPosts).toHaveLength(1);
    }
  });
});

// ─── connectChannel ──────────────────────────────────────────────────────────

describe("connectChannel", () => {
  it("returns error when username is empty", async () => {
    const result = await connectChannel({ username: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel username is required");
    }
  });

  it("returns error when username is whitespace only", async () => {
    const result = await connectChannel({ username: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel username is required");
    }
  });

  it("returns error when bot has no access to the channel", async () => {
    mockTgGetChat.mockRejectedValueOnce(new Error("Forbidden: bot is not a member"));

    const result = await connectChannel({ username: "privatechannel" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Bot is not an admin");
    }
  });

  it("returns error when chat is not a channel", async () => {
    mockTgGetChat.mockResolvedValueOnce({
      id: -123456,
      type: "group",
      title: "My Group",
    });

    const result = await connectChannel({ username: "mygroup" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not a channel");
    }
  });

  it("returns error when channel is already connected", async () => {
    mockTgGetChat.mockResolvedValueOnce({
      id: -100123456,
      type: "channel",
      title: "My Channel",
      username: "mychannel",
    });
    mockTgGetChatMemberCount.mockResolvedValueOnce(500);

    // Existing channel lookup returns a result
    selectResults.push([
      {
        id: "channel-1",
        userId: "user-123",
        telegramChatId: "-100123456",
      },
    ]);

    const result = await connectChannel({ username: "mychannel" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("already connected");
    }
  });

  it("strips @ prefix from username", async () => {
    mockTgGetChat.mockResolvedValueOnce({
      id: -100999888,
      type: "channel",
      title: "Test Channel",
      username: "testchannel",
    });
    mockTgGetChatMemberCount.mockResolvedValueOnce(100);

    // No existing channel
    selectResults.push([]);

    const mockChannel = {
      id: "channel-new",
      userId: "user-123",
      telegramChatId: "-100999888",
      title: "Test Channel",
      username: "testchannel",
      description: null,
      memberCount: 100,
      botTokenEncrypted: null,
      webhookSecret: null,
      connectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockReturning.mockResolvedValueOnce([mockChannel]);

    const result = await connectChannel({ username: "@testchannel" });
    expect(result.success).toBe(true);
    // getChat should have been called with @testchannel (no double @@)
    expect(mockTgGetChat).toHaveBeenCalledWith("@testchannel");
  });

  it("connects channel successfully", async () => {
    mockTgGetChat.mockResolvedValueOnce({
      id: -100777666,
      type: "channel",
      title: "New Channel",
      username: "newchannel",
      description: "A new channel",
    });
    mockTgGetChatMemberCount.mockResolvedValueOnce(250);
    mockTgSetWebhook.mockResolvedValueOnce(true);

    // No existing channel
    selectResults.push([]);

    const mockChannel = {
      id: "channel-new",
      userId: "user-123",
      telegramChatId: "-100777666",
      title: "New Channel",
      username: "newchannel",
      description: "A new channel",
      memberCount: 250,
      botTokenEncrypted: null,
      webhookSecret: null,
      connectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockReturning.mockResolvedValueOnce([mockChannel]);

    const result = await connectChannel({ username: "newchannel" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("New Channel");
      expect(result.data.telegramChatId).toBe("-100777666");
    }
    expect(mockInsert).toHaveBeenCalled();
  });
});

// ─── disconnectChannel ───────────────────────────────────────────────────────

describe("disconnectChannel", () => {
  it("returns error when ID is empty", async () => {
    const result = await disconnectChannel("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel ID is required");
    }
  });

  it("returns error when channel not found", async () => {
    // Ownership check returns empty
    selectResults.push([]);

    const result = await disconnectChannel("nonexistent");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel not found");
    }
  });

  it("disconnects channel and removes webhook", async () => {
    const mockChannel = {
      id: "channel-1",
      userId: "user-123",
      telegramChatId: "-100123456",
      title: "My Channel",
    };

    // Ownership check returns channel
    selectResults.push([mockChannel]);

    mockTgDeleteWebhook.mockResolvedValueOnce(true);
    mockReturning.mockResolvedValueOnce([{ id: "channel-1" }]);

    const result = await disconnectChannel("channel-1");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("channel-1");
    }
    expect(mockDelete).toHaveBeenCalled();
    expect(mockTgDeleteWebhook).toHaveBeenCalled();
  });

  it("proceeds with deletion even if webhook removal fails", async () => {
    const mockChannel = {
      id: "channel-1",
      userId: "user-123",
      telegramChatId: "-100123456",
    };

    selectResults.push([mockChannel]);

    mockTgDeleteWebhook.mockRejectedValueOnce(new Error("Webhook error"));
    mockReturning.mockResolvedValueOnce([{ id: "channel-1" }]);

    const result = await disconnectChannel("channel-1");
    expect(result.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
  });
});

// ─── updateChannelSettings ───────────────────────────────────────────────────

describe("updateChannelSettings", () => {
  it("returns error when ID is empty", async () => {
    const result = await updateChannelSettings({ id: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel ID is required");
    }
  });

  it("returns error when channel not found", async () => {
    selectResults.push([]);

    const result = await updateChannelSettings({ id: "nonexistent" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel not found");
    }
  });

  it("updates channel settings successfully", async () => {
    const mockChannel = {
      id: "channel-1",
      userId: "user-123",
      telegramChatId: "-100123456",
      title: "My Channel",
      username: "mychannel",
      description: null,
      memberCount: 100,
      botTokenEncrypted: null,
      webhookSecret: null,
      connectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    selectResults.push([mockChannel]);
    mockReturning.mockResolvedValueOnce([{ ...mockChannel, updatedAt: new Date() }]);

    const result = await updateChannelSettings({ id: "channel-1" });
    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
