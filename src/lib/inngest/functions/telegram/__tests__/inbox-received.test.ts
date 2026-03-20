import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDbSelect,
  mockDbUpdate,
  mockDbSet,
  mockDbWhere,
  mockDbLimit,
  selectQueues,
  mockEnforceAiQuota,
  mockIncrementAiUsage,
  mockRecordAiTelemetry,
  mockDownloadTelegramVoiceFileById,
  mockTranscribeVoiceNoteToPost,
  mockSendMessage,
} = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockDbSet: vi.fn(),
  mockDbWhere: vi.fn(),
  mockDbLimit: vi.fn(),
  selectQueues: [] as unknown[][],
  mockEnforceAiQuota: vi.fn(),
  mockIncrementAiUsage: vi.fn(),
  mockRecordAiTelemetry: vi.fn(),
  mockDownloadTelegramVoiceFileById: vi.fn(),
  mockTranscribeVoiceNoteToPost: vi.fn(),
  mockSendMessage: vi.fn().mockResolvedValue(undefined),
}));

function createSelectChain() {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn(() => {
    mockDbLimit();
    return Promise.resolve(selectQueues.shift() ?? []);
  });
  return chain;
}

function createUpdateChain() {
  const chain: Record<string, unknown> = {};
  chain.set = vi.fn((values: unknown) => {
    mockDbSet(values);
    return chain;
  });
  chain.where = vi.fn((condition: unknown) => {
    mockDbWhere(condition);
    return Promise.resolve([]);
  });
  return chain;
}

vi.mock("@/server/db", () => ({
  db: {
    select: mockDbSelect.mockImplementation(() => createSelectChain()),
    update: mockDbUpdate.mockImplementation(() => createUpdateChain()),
  },
}));

vi.mock("@/server/db/schema", () => ({
  contentLibrary: {
    id: "content_library.id",
    userId: "content_library.userId",
    sourceType: "content_library.sourceType",
    sourceMetadata: "content_library.sourceMetadata",
    title: "content_library.title",
    content: "content_library.content",
    updatedAt: "content_library.updatedAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_column: unknown, value: unknown) => ({ op: "eq", value })),
  and: vi.fn((...conditions: unknown[]) => ({ op: "and", conditions })),
}));

vi.mock("@/lib/billing/ai-quota", () => ({
  enforceAiQuota: mockEnforceAiQuota,
  incrementAiUsage: mockIncrementAiUsage,
}));

vi.mock("@/lib/ai/telemetry", () => ({
  recordAiTelemetry: mockRecordAiTelemetry,
}));

vi.mock("@/lib/telegram/voice-notes", () => ({
  downloadTelegramVoiceFileById: mockDownloadTelegramVoiceFileById,
}));

vi.mock("@/lib/ai/voice-to-post", () => ({
  transcribeVoiceNoteToPost: mockTranscribeVoiceNoteToPost,
}));

vi.mock("@/lib/telegram/client", () => ({
  getTelegramClient: vi.fn().mockReturnValue({
    sendMessage: mockSendMessage,
  }),
}));

import { telegramInboxReceived } from "../inbox-received";

type InngestHandler = {
  fn: (args: {
    event: { data: unknown };
    step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> };
  }) => Promise<unknown>;
};

function createStep() {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
  };
}

function createEvent(
  overrides: Partial<{
    contentId: string;
    userId: string;
    telegramUserId: string;
    telegramChatId: string;
    messageId: number;
    captureType: "text" | "voice";
  }> = {},
) {
  return {
    data: {
      contentId: overrides.contentId ?? "content-1",
      userId: overrides.userId ?? "user-1",
      telegramUserId: overrides.telegramUserId ?? "777",
      telegramChatId: overrides.telegramChatId ?? "777",
      messageId: overrides.messageId ?? 123,
      captureType: overrides.captureType ?? "text",
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  selectQueues.length = 0;
  mockEnforceAiQuota.mockResolvedValue({ allowed: true });
  mockIncrementAiUsage.mockResolvedValue(undefined);
  mockRecordAiTelemetry.mockResolvedValue(undefined);
  mockDownloadTelegramVoiceFileById.mockResolvedValue({
    bytes: Buffer.from("voice-bytes"),
    mimeType: "audio/ogg",
    filePath: "voice/path.oga",
  });
  mockTranscribeVoiceNoteToPost.mockResolvedValue({
    transcript: "raw transcript",
    polishedPost: "Polished Telegram post",
    title: "Polished Telegram post",
    modelUsed: "gemini-3-flash-preview",
    tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
  });
});

describe("telegramInboxReceived", () => {
  it("returns completed for captured bot inbox ideas", async () => {
    selectQueues.push([
      {
        id: "content-1",
        sourceType: "idea",
        sourceMetadata: {
          telegramCaptureType: "bot_inbox",
        },
      },
    ]);

    const step = createStep();
    const result = await (telegramInboxReceived as unknown as InngestHandler).fn({
      event: createEvent(),
      step,
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
        contentId: "content-1",
        userId: "user-1",
        isBotInboxIdea: true,
      }),
    );
  });

  it("processes voice inbox ideas into polished drafts", async () => {
    selectQueues.push([
      {
        id: "content-1",
        sourceType: "idea",
        sourceMetadata: {
          telegramCaptureType: "bot_inbox_voice",
          telegramVoiceFileId: "voice-file-1",
          telegramVoiceMimeType: "audio/ogg",
          telegramVoiceDurationSec: 19,
        },
      },
    ]);

    const step = createStep();
    const result = await (telegramInboxReceived as unknown as InngestHandler).fn({
      event: createEvent({ captureType: "voice" }),
      step,
    });

    expect(mockEnforceAiQuota).toHaveBeenCalledWith("user-1");
    expect(mockDownloadTelegramVoiceFileById).toHaveBeenCalledWith("voice-file-1", {
      fallbackMimeType: "audio/ogg",
    });
    expect(mockTranscribeVoiceNoteToPost).toHaveBeenCalledWith(
      expect.objectContaining({
        audioBuffer: expect.any(Buffer),
        mimeType: "audio/ogg",
      }),
    );
    expect(mockDbUpdate).toHaveBeenCalledTimes(1);
    expect(mockDbSet).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: "ai_generated",
        content: "Polished Telegram post",
      }),
    );
    expect(mockIncrementAiUsage).toHaveBeenCalledWith("user-1");
    expect(mockRecordAiTelemetry).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
        contentId: "content-1",
        voiceProcessed: true,
      }),
    );
  });

  it("returns skipped when the content row is missing", async () => {
    selectQueues.push([]);

    const step = createStep();
    const result = await (telegramInboxReceived as unknown as InngestHandler).fn({
      event: createEvent(),
      step,
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "skipped",
        reason: "Inbox content not found",
        contentId: "content-1",
      }),
    );
  });
});
