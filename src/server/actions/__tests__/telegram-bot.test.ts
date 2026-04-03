import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUser, mockInsert, mockReturning, mockResolveTelegramBotUsername, mockValues } =
  vi.hoisted(() => ({
    mockUser: { id: "user-123", email: "test@example.com" },
    mockInsert: vi.fn(),
    mockReturning: vi.fn(),
    mockResolveTelegramBotUsername: vi.fn(),
    mockValues: vi.fn(),
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

function createMutationChain() {
  const chain: Record<string, unknown> = {};
  chain.values = vi.fn((values: unknown) => {
    mockValues(values);
    return chain;
  });
  chain.returning = mockReturning;
  return chain;
}

vi.mock("@/server/db", () => ({
  db: {
    insert: (...args: unknown[]) => {
      mockInsert(...args);
      return createMutationChain();
    },
  },
}));

vi.mock("@/lib/telegram/bot-identity", () => ({
  resolveTelegramBotUsername: (...args: unknown[]) => mockResolveTelegramBotUsername(...args),
}));

import { createTelegramBotLink } from "../telegram-bot";

describe("createTelegramBotLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([{ id: "link-token-1" }]);
    mockResolveTelegramBotUsername.mockResolvedValue("teleflow_bot");
  });

  it("returns an error when the user is not authenticated", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await createTelegramBotLink();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Unauthorized");
    }
  });

  it("creates a link token and deep link for the current user", async () => {
    const result = await createTelegramBotLink();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.botUsername).toBe("teleflow_bot");
      expect(result.data.deepLinkUrl).toMatch(
        /^https:\/\/t\.me\/teleflow_bot\?start=[A-Za-z0-9_-]+$/,
      );
      expect(result.data.token).toMatch(/^[A-Za-z0-9_-]+$/);
    }
    expect(mockInsert).toHaveBeenCalled();
  });

  it("stores the generated token with a 7 day expiry", async () => {
    const now = new Date("2026-03-09T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const result = await createTelegramBotLink();

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        token: expect.stringMatching(/^[A-Za-z0-9_-]+$/),
        expiresAt: new Date("2026-03-16T12:00:00.000Z"),
      }),
    );

    vi.useRealTimers();
  });

  it("returns different tokens on successive calls", async () => {
    const first = await createTelegramBotLink();
    const second = await createTelegramBotLink();

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);

    if (first.success && second.success) {
      expect(first.data.token).not.toBe(second.data.token);
    }
  });

  it("returns an error when the bot username cannot be resolved", async () => {
    mockResolveTelegramBotUsername.mockResolvedValue("bot");

    const result = await createTelegramBotLink();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("bot username");
    }
  });
});
