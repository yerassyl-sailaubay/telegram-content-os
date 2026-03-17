import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDbSelect, mockDbLimit } = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbLimit: vi.fn(),
}));

function createSelectChain() {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = mockDbLimit;
  return chain;
}

vi.mock("@/server/db", () => ({
  db: {
    select: mockDbSelect.mockImplementation(() => createSelectChain()),
  },
}));

vi.mock("@/server/db/schema", () => ({
  contentLibrary: {
    id: "content_library.id",
    userId: "content_library.userId",
    sourceType: "content_library.sourceType",
    sourceMetadata: "content_library.sourceMetadata",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_column: unknown, value: unknown) => ({ op: "eq", value })),
  and: vi.fn((...conditions: unknown[]) => ({ op: "and", conditions })),
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
  }> = {},
) {
  return {
    data: {
      contentId: overrides.contentId ?? "content-1",
      userId: overrides.userId ?? "user-1",
      telegramUserId: overrides.telegramUserId ?? "777",
      telegramChatId: overrides.telegramChatId ?? "777",
      messageId: overrides.messageId ?? 123,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("telegramInboxReceived", () => {
  it("returns completed for captured bot inbox ideas", async () => {
    mockDbLimit.mockResolvedValue([
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

  it("returns skipped when the content row is missing", async () => {
    mockDbLimit.mockResolvedValue([]);

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
