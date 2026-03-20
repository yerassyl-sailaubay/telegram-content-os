import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { TelegramUpdate } from "../types";

const {
  mockDbSelect,
  mockDbInsert,
  mockDbUpdate,
  mockDbWhere,
  mockDbLimit,
  mockDbValues,
  mockDbSet,
  mockDbReturning,
  mockSendMessage,
  selectResults,
  insertResults,
  updateResults,
} = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockDbWhere: vi.fn(),
  mockDbLimit: vi.fn(),
  mockDbValues: vi.fn(),
  mockDbSet: vi.fn(),
  mockDbReturning: vi.fn(),
  mockSendMessage: vi.fn().mockResolvedValue(undefined),
  selectResults: [] as unknown[][],
  insertResults: [] as unknown[][],
  updateResults: [] as unknown[][],
}));

vi.mock("@/server/db", () => ({
  db: {
    select: () => {
      mockDbSelect();
      return {
        from: () => ({
          where: (cond: unknown) => {
            mockDbWhere(cond);
            return {
              limit: (n: number) => {
                mockDbLimit(n);
                return Promise.resolve(selectResults.shift() ?? []);
              },
            };
          },
        }),
      };
    },
    insert: (table: unknown) => {
      mockDbInsert(table);
      return {
        values: (values: unknown) => {
          mockDbValues(values);
          return {
            returning: (cols: unknown) => {
              mockDbReturning(cols);
              return Promise.resolve(insertResults.shift() ?? []);
            },
          };
        },
      };
    },
    update: (table: unknown) => {
      mockDbUpdate(table);
      return {
        set: (values: unknown) => {
          mockDbSet(values);
          return {
            where: (cond: unknown) => {
              mockDbWhere(cond);
              return {
                returning: (cols: unknown) => {
                  mockDbReturning(cols);
                  return Promise.resolve(updateResults.shift() ?? []);
                },
              };
            },
          };
        },
      };
    },
  },
}));

const mockInngestSend = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    send: (...args: unknown[]) => mockInngestSend(...args),
  },
}));

vi.mock("@/lib/telegram/client", () => ({
  getTelegramClient: vi.fn().mockReturnValue({
    sendMessage: mockSendMessage,
  }),
}));

vi.mock("@/server/db/schema", () => ({
  telegramChannels: {
    id: "id",
    telegramChatId: "telegram_chat_id",
    webhookSecret: "webhook_secret",
  },
  telegramPosts: { id: "id", telegramMessageId: "telegram_message_id" },
  telegramLinkTokens: {
    id: "id",
    token: "token",
    userId: "user_id",
    expiresAt: "expires_at",
    usedAt: "used_at",
  },
  users: {
    id: "id",
    telegramUserId: "telegram_user_id",
    telegramLinkedAt: "telegram_linked_at",
    updatedAt: "updated_at",
  },
  contentLibrary: {
    id: "id",
    userId: "user_id",
    sourceType: "source_type",
    createdAt: "created_at",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ type: "eq", col, val }),
  and: (...conditions: unknown[]) => ({ type: "and", conditions }),
  gt: (col: unknown, val: unknown) => ({ type: "gt", col, val }),
  isNull: (col: unknown) => ({ type: "isNull", col }),
}));

let POST: typeof import("@/app/api/telegram/webhook/route").POST;

beforeEach(async () => {
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "test-webhook-secret-123");
  selectResults.length = 0;
  insertResults.length = 0;
  updateResults.length = 0;
  vi.clearAllMocks();

  const mod = await import("@/app/api/telegram/webhook/route");
  POST = mod.POST;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("https://example.com/api/telegram/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-telegram-bot-api-secret-token": "test-webhook-secret-123",
    },
    body: JSON.stringify(body),
  });
}

function makePrivateMessageUpdate(
  overrides?: Partial<NonNullable<TelegramUpdate["message"]>>,
): TelegramUpdate {
  return {
    update_id: 9001,
    message: {
      message_id: 77,
      date: 1700000000,
      chat: { id: 777, type: "private" },
      from: { id: 777, is_bot: false, first_name: "Test", username: "tester" },
      text: "A fresh idea from Telegram",
      ...overrides,
    },
  };
}

describe("POST /api/telegram/webhook inbox routing", () => {
  it("links a user from /start token and sends confirmation", async () => {
    updateResults.push([{ userId: "user-123" }], [{ id: "user-123" }]);
    selectResults.push([]);

    const req = makeRequest(makePrivateMessageUpdate({ text: "/start link-token-123" }));
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockDbUpdate).toHaveBeenCalledTimes(2);
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });

  it("handles invalid /start tokens without inserting content", async () => {
    updateResults.push([]);

    const req = makeRequest(makePrivateMessageUpdate({ text: "/start bad-token" }));
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockDbInsert).not.toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });

  it("creates an idea draft for linked private text messages", async () => {
    selectResults.push([{ id: "user-123" }], []);
    insertResults.push([{ id: "content-1" }]);

    const req = makeRequest(makePrivateMessageUpdate());
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockDbInsert).toHaveBeenCalledTimes(1);
    expect(mockDbValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        sourceType: "idea",
        status: "draft",
        content: "A fresh idea from Telegram",
      }),
    );
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "telegram/inbox.received",
        data: expect.objectContaining({ contentId: "content-1", userId: "user-123" }),
      }),
    );
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });

  it("captures linked private voice notes and queues transcription", async () => {
    selectResults.push([{ id: "user-123" }], []);
    insertResults.push([{ id: "content-voice-1" }]);

    const req = makeRequest(
      makePrivateMessageUpdate({
        text: undefined,
        voice: {
          file_id: "voice-file-id-1",
          file_unique_id: "voice-unique-1",
          duration: 23,
          mime_type: "audio/ogg",
        },
      }),
    );
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockDbInsert).toHaveBeenCalledTimes(1);
    expect(mockDbValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        sourceType: "idea",
        status: "draft",
      }),
    );
    expect(mockDbValues).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceMetadata: expect.objectContaining({
          telegramCaptureType: "bot_inbox_voice",
          telegramVoiceFileId: "voice-file-id-1",
          telegramVoiceMimeType: "audio/ogg",
          telegramVoiceDurationSec: 23,
        }),
      }),
    );
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "telegram/inbox.received",
        data: expect.objectContaining({
          contentId: "content-voice-1",
          userId: "user-123",
          captureType: "voice",
        }),
      }),
    );
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });

  it("prompts unlinked users to connect their account", async () => {
    selectResults.push([]);

    const req = makeRequest(makePrivateMessageUpdate());
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockDbInsert).not.toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });

  it("asks linked users to send text when the message has no text", async () => {
    selectResults.push([{ id: "user-123" }]);

    const req = makeRequest(
      makePrivateMessageUpdate({
        text: undefined,
        caption: undefined,
      }),
    );
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockDbInsert).not.toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });
});
