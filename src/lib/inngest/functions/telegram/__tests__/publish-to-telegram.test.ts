import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockDbSelect,
  mockDbUpdate,
  mockDbSet,
  mockDbLimit,
  mockTelegramClient,
  mockGetTelegramClient,
  mockDecrypt,
} = vi.hoisted(() => {
  const mockTelegramClient = {
    sendMessage: vi.fn(),
    sendPhoto: vi.fn(),
    sendMediaGroup: vi.fn(),
    sendPoll: vi.fn(),
  };

  const mockGetTelegramClient = vi.fn(() => mockTelegramClient);
  const mockDecrypt = vi.fn((value: string) => value);

  const mockDbLimit = vi.fn();
  const mockDbWhere = vi.fn(() => ({ limit: mockDbLimit }));
  const mockDbFrom = vi.fn(() => ({ where: mockDbWhere }));
  const mockDbSelect = vi.fn(() => ({ from: mockDbFrom }));
  const mockDbSet = vi.fn(() => ({ where: vi.fn() }));
  const mockDbUpdate = vi.fn(() => ({ set: mockDbSet }));

  return {
    mockDbSelect,
    mockDbUpdate,
    mockDbFrom,
    mockDbWhere,
    mockDbSet,
    mockDbLimit,
    mockTelegramClient,
    mockGetTelegramClient,
    mockDecrypt,
  };
});

vi.mock("@/server/db", () => ({
  db: {
    select: mockDbSelect,
    update: mockDbUpdate,
  },
}));

vi.mock("@/server/db/schema", () => ({
  contentLibrary: { id: "id", status: "status", updatedAt: "updated_at" },
  telegramChannels: {
    id: "id",
    telegramChatId: "telegram_chat_id",
    botTokenEncrypted: "bot_token_encrypted",
  },
  schedules: { id: "id", status: "status", processedAt: "processed_at", updatedAt: "updated_at" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

vi.mock("@/lib/telegram/client", () => ({
  getTelegramClient: mockGetTelegramClient,
}));

vi.mock("@/lib/platforms/encryption", () => ({
  decrypt: mockDecrypt,
}));

vi.mock("@/lib/telegram/types", () => ({
  TelegramApiError: class TelegramApiError extends Error {
    statusCode: number;
    errorCode?: number;
    constructor(message: string, statusCode: number, errorCode?: number) {
      super(message);
      this.name = "TelegramApiError";
      this.statusCode = statusCode;
      this.errorCode = errorCode;
    }
  },
}));

import { publishToTelegram } from "../publish-to-telegram";

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
    userId: string;
    channelId: string;
    scheduleId: string;
    scheduledAt: string;
  }> = {},
) {
  return {
    name: "telegram/post.publish" as const,
    data: {
      contentId: overrides.contentId ?? "content-uuid-1",
      userId: overrides.userId ?? "user-uuid-1",
      channelId: overrides.channelId ?? "channel-uuid-1",
      ...(overrides.scheduleId ? { scheduleId: overrides.scheduleId } : {}),
      ...(overrides.scheduledAt ? { scheduledAt: overrides.scheduledAt } : {}),
    },
  };
}

async function runHandler(
  event: ReturnType<typeof createEvent>,
  step: ReturnType<typeof createMockStep>,
) {
  return (publishToTelegram as unknown as InngestHandler).fn({ event, step });
}

/** Configure mock DB to return content then channel on sequential select calls. */
function setupDbMocks(
  contentRow: Record<string, unknown> | null,
  channelRow: Record<string, unknown> | null,
) {
  let callCount = 0;
  mockDbLimit.mockImplementation(() => {
    callCount++;
    if (callCount === 1) return contentRow ? [contentRow] : [];
    if (callCount === 2) return channelRow ? [channelRow] : [];
    return [];
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = "env-fallback-token";
});

describe("publishToTelegram", () => {
  it("is a valid Inngest function with accessible handler", () => {
    expect(publishToTelegram).toBeDefined();
    expect((publishToTelegram as unknown as InngestHandler).fn).toBeTypeOf("function");
  });

  it("plain text → sendMessage called with MarkdownV2", async () => {
    const event = createEvent();
    const step = createMockStep();

    setupDbMocks(
      {
        id: "content-uuid-1",
        content: "Hello world, this is a test post",
        status: "draft",
        userId: "user-uuid-1",
      },
      {
        id: "channel-uuid-1",
        telegramChatId: "-1001234567890",
        botTokenEncrypted: "fake-bot-token",
      },
    );

    mockTelegramClient.sendMessage.mockResolvedValue({ message_id: 42 });

    const result = await runHandler(event, step);

    expect(mockTelegramClient.sendMessage).toHaveBeenCalledWith(
      "-1001234567890",
      expect.any(String),
      { parse_mode: "MarkdownV2" },
    );
    expect(mockTelegramClient.sendPhoto).not.toHaveBeenCalled();
    expect(mockTelegramClient.sendPoll).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ status: "published", format: "text" }));
  });

  it("text + single image URL → sendPhoto called", async () => {
    const event = createEvent();
    const step = createMockStep();

    setupDbMocks(
      {
        id: "content-uuid-1",
        content: "Check this out https://example.com/photo.jpg",
        status: "draft",
        userId: "user-uuid-1",
      },
      {
        id: "channel-uuid-1",
        telegramChatId: "-1001234567890",
        botTokenEncrypted: "fake-bot-token",
      },
    );

    mockTelegramClient.sendPhoto.mockResolvedValue({ message_id: 43 });

    const result = await runHandler(event, step);

    expect(mockTelegramClient.sendPhoto).toHaveBeenCalledWith(
      "-1001234567890",
      "https://example.com/photo.jpg",
      expect.objectContaining({ parse_mode: "MarkdownV2" }),
    );
    expect(mockTelegramClient.sendMessage).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ status: "published", format: "photo" }));
  });

  it("text + multiple images → sendMediaGroup called", async () => {
    const event = createEvent();
    const step = createMockStep();

    setupDbMocks(
      {
        id: "content-uuid-1",
        content: "Look at these https://example.com/a.png and https://example.com/b.jpg",
        status: "draft",
        userId: "user-uuid-1",
      },
      {
        id: "channel-uuid-1",
        telegramChatId: "-1001234567890",
        botTokenEncrypted: "fake-bot-token",
      },
    );

    mockTelegramClient.sendMediaGroup.mockResolvedValue([{ message_id: 44 }]);

    const result = await runHandler(event, step);

    expect(mockTelegramClient.sendMediaGroup).toHaveBeenCalledWith(
      "-1001234567890",
      expect.arrayContaining([
        expect.objectContaining({ type: "photo", media: "https://example.com/a.png" }),
        expect.objectContaining({ type: "photo", media: "https://example.com/b.jpg" }),
      ]),
    );
    expect(result).toEqual(expect.objectContaining({ status: "published", format: "media_group" }));
  });

  it("poll format → sendPoll called", async () => {
    const event = createEvent();
    const step = createMockStep();

    const pollContent = JSON.stringify({
      question: "What do you prefer?",
      options: ["Option A", "Option B", "Option C"],
    });

    setupDbMocks(
      {
        id: "content-uuid-1",
        content: `POLL:${pollContent}`,
        status: "draft",
        userId: "user-uuid-1",
      },
      {
        id: "channel-uuid-1",
        telegramChatId: "-1001234567890",
        botTokenEncrypted: "fake-bot-token",
      },
    );

    mockTelegramClient.sendPoll.mockResolvedValue({ message_id: 45 });

    const result = await runHandler(event, step);

    expect(mockTelegramClient.sendPoll).toHaveBeenCalledWith(
      "-1001234567890",
      "What do you prefer?",
      ["Option A", "Option B", "Option C"],
    );
    expect(result).toEqual(expect.objectContaining({ status: "published", format: "poll" }));
  });

  it("Telegram API 403 error → does NOT update status to published", async () => {
    const event = createEvent();
    const step = createMockStep();

    setupDbMocks(
      {
        id: "content-uuid-1",
        content: "Some text",
        status: "draft",
        userId: "user-uuid-1",
      },
      {
        id: "channel-uuid-1",
        telegramChatId: "-1001234567890",
        botTokenEncrypted: "fake-bot-token",
      },
    );

    const { TelegramApiError } = await import("@/lib/telegram/types");
    mockTelegramClient.sendMessage.mockRejectedValue(
      new TelegramApiError("Forbidden: bot was blocked by the user", 403),
    );

    await expect(runHandler(event, step)).rejects.toThrow(/forbidden/i);
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it("content with 'archived' status is rejected", async () => {
    const event = createEvent();
    const step = createMockStep();

    setupDbMocks(
      {
        id: "content-uuid-1",
        content: "Some text",
        status: "archived",
        userId: "user-uuid-1",
      },
      null,
    );

    await expect(runHandler(event, step)).rejects.toThrow(/cannot publish.*archived/i);
  });

  it("content not found → error thrown", async () => {
    const event = createEvent();
    const step = createMockStep();

    setupDbMocks(null, null);

    await expect(runHandler(event, step)).rejects.toThrow(/not found/i);
  });

  it("MarkdownV2 special characters are escaped in text content", async () => {
    const event = createEvent();
    const step = createMockStep();

    setupDbMocks(
      {
        id: "content-uuid-1",
        content: "Hello! Use *bold* and _italic_ (also [links](http://example.com))",
        status: "draft",
        userId: "user-uuid-1",
      },
      {
        id: "channel-uuid-1",
        telegramChatId: "-1001234567890",
        botTokenEncrypted: "fake-bot-token",
      },
    );

    mockTelegramClient.sendMessage.mockResolvedValue({ message_id: 46 });

    await runHandler(event, step);

    const sentText = mockTelegramClient.sendMessage.mock.calls[0][1] as string;
    expect(sentText).toContain("\\!");
    expect(sentText).toContain("\\*");
    expect(sentText).toContain("\\_");
    expect(sentText).toContain("\\(");
    expect(sentText).toContain("\\)");
    expect(sentText).toContain("\\[");
    expect(sentText).toContain("\\]");
  });

  it("updates content status to 'published' after successful publish", async () => {
    const event = createEvent();
    const step = createMockStep();

    setupDbMocks(
      {
        id: "content-uuid-1",
        content: "Success post",
        status: "draft",
        userId: "user-uuid-1",
      },
      {
        id: "channel-uuid-1",
        telegramChatId: "-1001234567890",
        botTokenEncrypted: "fake-bot-token",
      },
    );

    mockTelegramClient.sendMessage.mockResolvedValue({ message_id: 47 });

    await runHandler(event, step);

    expect(mockDbUpdate).toHaveBeenCalled();
    expect(mockDbSet).toHaveBeenCalledWith(expect.objectContaining({ status: "published" }));
  });

  it("falls back to TELEGRAM_BOT_TOKEN when channel token is null", async () => {
    const event = createEvent();
    const step = createMockStep();

    setupDbMocks(
      {
        id: "content-uuid-1",
        content: "Fallback token post",
        status: "draft",
        userId: "user-uuid-1",
      },
      {
        id: "channel-uuid-1",
        telegramChatId: "-1001234567890",
        botTokenEncrypted: null,
      },
    );

    mockTelegramClient.sendMessage.mockResolvedValue({ message_id: 48 });

    await runHandler(event, step);

    expect(mockGetTelegramClient).toHaveBeenCalledWith("env-fallback-token");
  });

  it("updates schedule status from processing to completed when scheduleId is provided", async () => {
    const event = createEvent({ scheduleId: "schedule-uuid-1" });
    const step = createMockStep();

    setupDbMocks(
      {
        id: "content-uuid-1",
        content: "Scheduled run",
        status: "scheduled",
        userId: "user-uuid-1",
      },
      {
        id: "channel-uuid-1",
        telegramChatId: "-1001234567890",
        botTokenEncrypted: null,
      },
    );

    mockTelegramClient.sendMessage.mockResolvedValue({ message_id: 49 });

    await runHandler(event, step);

    const statuses = mockDbSet.mock.calls
      .map((call: unknown[]) => (call[0] as { status?: string } | undefined)?.status)
      .filter((status) => typeof status === "string");

    expect(statuses).toContain("processing");
    expect(statuses).toContain("completed");
    expect(statuses).toContain("published");
  });

  it("marks schedule as failed when publish throws and scheduleId is provided", async () => {
    const event = createEvent({ scheduleId: "schedule-uuid-2" });
    const step = createMockStep();

    setupDbMocks(
      {
        id: "content-uuid-1",
        content: "Scheduled fail run",
        status: "scheduled",
        userId: "user-uuid-1",
      },
      {
        id: "channel-uuid-1",
        telegramChatId: "-1001234567890",
        botTokenEncrypted: null,
      },
    );

    const { TelegramApiError } = await import("@/lib/telegram/types");
    mockTelegramClient.sendMessage.mockRejectedValue(new TelegramApiError("Forbidden", 403));

    await expect(runHandler(event, step)).rejects.toThrow(/forbidden/i);

    const statuses = mockDbSet.mock.calls
      .map((call: unknown[]) => (call[0] as { status?: string } | undefined)?.status)
      .filter((status) => typeof status === "string");

    expect(statuses).toContain("failed");
    expect(statuses).not.toContain("completed");
  });
});
