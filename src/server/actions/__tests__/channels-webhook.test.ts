import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockUser,
  mockInsert,
  mockReturning,
  mockTgGetChat,
  mockTgGetChatMemberCount,
  mockTgSetWebhook,
  selectResults,
} = vi.hoisted(() => ({
  mockUser: { id: "user-123", email: "test@example.com" },
  mockInsert: vi.fn(),
  mockReturning: vi.fn(),
  mockTgGetChat: vi.fn(),
  mockTgGetChatMemberCount: vi.fn(),
  mockTgSetWebhook: vi.fn(),
  selectResults: [] as unknown[][],
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

vi.mock("@/lib/telegram/client", () => ({
  getTelegramClient: vi.fn().mockReturnValue({
    getMe: vi.fn().mockResolvedValue({ username: "teleflow_bot" }),
    getChat: mockTgGetChat,
    getChatMemberCount: mockTgGetChatMemberCount,
    setWebhook: mockTgSetWebhook,
  }),
}));

function createSelectChain() {
  const chain: Record<string, unknown> = {};
  const thenFn = (resolve: (value: unknown) => void) => {
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
  chain.values = vi.fn().mockReturnValue(chain);
  chain.returning = mockReturning;
  return chain;
}

vi.mock("@/server/db", () => ({
  db: {
    select: () => createSelectChain(),
    insert: (...args: unknown[]) => {
      mockInsert(...args);
      return createMutationChain();
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { connectChannel } from "../channels";

describe("connectChannel webhook registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults.length = 0;
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://teleflow.test");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "webhook-secret");
  });

  it("registers the webhook with private messages enabled", async () => {
    mockTgGetChat.mockResolvedValueOnce({
      id: -100777666,
      type: "channel",
      title: "New Channel",
      username: "newchannel",
      description: "A new channel",
    });
    mockTgGetChatMemberCount.mockResolvedValueOnce(250);
    mockTgSetWebhook.mockResolvedValueOnce(true);
    selectResults.push([]);
    mockReturning.mockResolvedValueOnce([
      {
        id: "channel-new",
        userId: "user-123",
        telegramChatId: "-100777666",
        title: "New Channel",
        username: "newchannel",
        description: "A new channel",
        memberCount: 250,
      },
    ]);

    const result = await connectChannel({ username: "newchannel" });

    expect(result.success).toBe(true);
    expect(mockTgSetWebhook).toHaveBeenCalledWith("https://teleflow.test/api/telegram/webhook", {
      allowed_updates: ["message", "channel_post", "edited_channel_post"],
      secret_token: "webhook-secret",
    });
  });
});
