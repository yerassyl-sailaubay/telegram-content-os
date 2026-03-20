import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { TelegramUpdate } from "../types";

// ---------------------------------------------------------------------------
// Mocks — must be set up BEFORE importing the route handler
// ---------------------------------------------------------------------------

// Mock DB
const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbFrom = vi.fn();
const mockDbWhere = vi.fn();
const mockDbLimit = vi.fn();
const mockDbValues = vi.fn();
const mockDbReturning = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    select: () => {
      mockDbSelect();
      return {
        from: (table: unknown) => {
          mockDbFrom(table);
          return {
            where: (cond: unknown) => {
              mockDbWhere(cond);
              return {
                limit: (n: number) => {
                  mockDbLimit(n);
                  return Promise.resolve(mockDbLimitResult);
                },
              };
            },
          };
        },
      };
    },
    insert: (table: unknown) => {
      mockDbInsert(table);
      return {
        values: (vals: unknown) => {
          mockDbValues(vals);
          return {
            returning: (cols: unknown) => {
              mockDbReturning(cols);
              return Promise.resolve(mockDbReturningResult);
            },
          };
        },
      };
    },
  },
}));

// Mock Inngest
const mockInngestSend = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    send: (...args: unknown[]) => mockInngestSend(...args),
  },
}));

// Mock DB schema (just pass through — the mock DB doesn't use real Drizzle)
vi.mock("@/server/db/schema", () => ({
  telegramChannels: {
    id: "id",
    telegramChatId: "telegram_chat_id",
    webhookSecret: "webhook_secret",
  },
  telegramPosts: { id: "id" },
}));

// Mock drizzle-orm eq function
vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

// Default mock results
let mockDbLimitResult: Array<Record<string, unknown>> = [];
let mockDbReturningResult: Array<Record<string, unknown>> = [];

// ---------------------------------------------------------------------------
// Import POST handler after mocks
// ---------------------------------------------------------------------------

 
let POST: typeof import("@/app/api/telegram/webhook/route").POST;

beforeEach(async () => {
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "test-webhook-secret-123");

  // Reset mock return values
  mockDbLimitResult = [];
  mockDbReturningResult = [{ id: "post-uuid-123" }];

  // Reset all mocks
  mockDbSelect.mockClear();
  mockDbInsert.mockClear();
  mockDbFrom.mockClear();
  mockDbWhere.mockClear();
  mockDbLimit.mockClear();
  mockDbValues.mockClear();
  mockDbReturning.mockClear();
  mockInngestSend.mockClear();

  // Dynamic import to pick up mocks
  const mod = await import("@/app/api/telegram/webhook/route");
  POST = mod.POST;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown, headers?: Record<string, string>): NextRequest {
  return new NextRequest("https://example.com/api/telegram/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function makeChannelPostUpdate(overrides?: Partial<TelegramUpdate>): TelegramUpdate {
  return {
    update_id: 123456,
    channel_post: {
      message_id: 42,
      date: 1700000000,
      chat: {
        id: -1001234567890,
        type: "channel",
        title: "Test Channel",
      },
      text: "Hello from the channel!",
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/telegram/webhook", () => {
  describe("secret verification", () => {
    it("returns 403 when secret header is missing", async () => {
      const req = makeRequest(makeChannelPostUpdate());
      const res = await POST(req);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });

    it("returns 403 when secret header is wrong", async () => {
      const req = makeRequest(makeChannelPostUpdate(), {
        "x-telegram-bot-api-secret-token": "wrong-secret",
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
    });

    it("returns 403 when secret has different length", async () => {
      const req = makeRequest(makeChannelPostUpdate(), {
        "x-telegram-bot-api-secret-token": "short",
      });
      const res = await POST(req);

      expect(res.status).toBe(403);
    });

    it("returns 500 when TELEGRAM_WEBHOOK_SECRET env is not set", async () => {
      vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "");

      const req = makeRequest(makeChannelPostUpdate(), {
        "x-telegram-bot-api-secret-token": "anything",
      });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Server misconfiguration");
    });
  });

  describe("non-channel-post updates", () => {
    it("acknowledges and ignores non-channel-post updates", async () => {
      const update: TelegramUpdate = {
        update_id: 1,
        message: {
          message_id: 1,
          date: 1700000000,
          chat: { id: 123, type: "private" },
          text: "hello",
        },
      };

      const req = makeRequest(update, {
        "x-telegram-bot-api-secret-token": "test-webhook-secret-123",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);

      // Should NOT query DB
      expect(mockDbSelect).not.toHaveBeenCalled();
    });
  });

  describe("channel post processing", () => {
    it("stores a new channel post and fires Inngest event", async () => {
      // Mock: channel found in DB
      mockDbLimitResult = [{ id: "channel-uuid-123", webhookSecret: null }];

      const update = makeChannelPostUpdate();
      const req = makeRequest(update, {
        "x-telegram-bot-api-secret-token": "test-webhook-secret-123",
      });

      const res = await POST(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);

      // Should have queried for the channel
      expect(mockDbSelect).toHaveBeenCalled();

      // Should have inserted a post
      expect(mockDbInsert).toHaveBeenCalled();
      expect(mockDbValues).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: "channel-uuid-123",
          telegramMessageId: 42,
          contentRaw: "Hello from the channel!",
        }),
      );

      // Should have fired Inngest event
      expect(mockInngestSend).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "telegram/post.received",
          data: expect.objectContaining({
            postId: "post-uuid-123",
            channelId: "channel-uuid-123",
            telegramChatId: "-1001234567890",
            mediaGroupId: null,
            messageId: 42,
          }),
        }),
      );
    });

    it("acknowledges updates for unknown channels without error", async () => {
      // Mock: no channel found
      mockDbLimitResult = [];

      const update = makeChannelPostUpdate();
      const req = makeRequest(update, {
        "x-telegram-bot-api-secret-token": "test-webhook-secret-123",
      });

      const res = await POST(req);

      expect(res.status).toBe(200);

      // Should NOT insert a post
      expect(mockDbInsert).not.toHaveBeenCalled();
      expect(mockInngestSend).not.toHaveBeenCalled();
    });

    it("handles post with caption and media (photo)", async () => {
      mockDbLimitResult = [{ id: "channel-uuid-456", webhookSecret: null }];

      const update: TelegramUpdate = {
        update_id: 2,
        channel_post: {
          message_id: 100,
          date: 1700000000,
          chat: {
            id: -1001234567890,
            type: "channel",
            title: "Test",
          },
          caption: "Photo caption",
          photo: [
            {
              file_id: "small-photo-id",
              file_unique_id: "small-unique",
              width: 90,
              height: 90,
            },
            {
              file_id: "large-photo-id",
              file_unique_id: "large-unique",
              width: 800,
              height: 600,
            },
          ],
        },
      };

      const req = makeRequest(update, {
        "x-telegram-bot-api-secret-token": "test-webhook-secret-123",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // Should store with caption and largest photo file_id
      expect(mockDbValues).toHaveBeenCalledWith(
        expect.objectContaining({
          contentRaw: "Photo caption",
          mediaUrls: ["large-photo-id"],
        }),
      );
    });

    it("returns 200 even when DB operation fails (to prevent Telegram retries)", async () => {
      mockDbLimitResult = [{ id: "channel-uuid-789", webhookSecret: null }];

      // Make the insert throw
      mockDbReturningResult = [];
      mockDbInsert.mockImplementation(() => {
        throw new Error("DB connection failed");
      });

      const update = makeChannelPostUpdate();
      const req = makeRequest(update, {
        "x-telegram-bot-api-secret-token": "test-webhook-secret-123",
      });

      const res = await POST(req);

      // Should still return 200 to acknowledge
      expect(res.status).toBe(200);
    });
  });
});
