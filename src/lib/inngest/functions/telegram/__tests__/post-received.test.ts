import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockInngestSend, selectQueues } = vi.hoisted(() => ({
  mockInngestSend: vi.fn(),
  selectQueues: [] as unknown[][],
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    createFunction: (_config: unknown, _trigger: unknown, fn: unknown) => ({ fn }),
    send: mockInngestSend,
  },
}));

function createSelectChain() {
  const chain: Record<string, unknown> = {};
  const thenFn = (resolve: (value: unknown) => void) => resolve(selectQueues.shift() ?? []);

  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.then = thenFn;
  return chain;
}

vi.mock("@/server/db", () => ({
  db: {
    select: vi.fn(() => createSelectChain()),
  },
}));

vi.mock("@/server/db/schema", () => ({
  telegramPosts: {
    id: "id",
    channelId: "channelId",
    contentRaw: "contentRaw",
    postedAt: "postedAt",
    mediaUrls: "mediaUrls",
  },
  telegramChannels: {
    id: "id",
    userId: "userId",
  },
  channelProfiles: {
    channelId: "channelId",
    generatedAt: "generatedAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((...args: unknown[]) => args),
  gt: vi.fn((...args: unknown[]) => args),
}));

import { telegramPostReceived } from "../post-received";

type InngestHandler = {
  fn: (args: { event: unknown; step: unknown }) => Promise<unknown>;
};

function createEvent(
  overrides: Partial<{
    postId: string;
    channelId: string;
    telegramChatId: string;
    mediaGroupId: string | null;
    messageId: number;
  }> = {},
) {
  return {
    name: "telegram/post.received" as const,
    data: {
      postId: overrides.postId ?? "post-1",
      channelId: overrides.channelId ?? "channel-1",
      telegramChatId: overrides.telegramChatId ?? "-100123",
      mediaGroupId: overrides.mediaGroupId ?? null,
      messageId: overrides.messageId ?? 101,
    },
  };
}

function createStep() {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    sendEvent: vi.fn(async () => undefined),
  };
}

async function runHandler(
  event: ReturnType<typeof createEvent>,
  step: ReturnType<typeof createStep>,
) {
  return (telegramPostReceived as unknown as InngestHandler).fn({ event, step });
}

describe("telegramPostReceived", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueues.length = 0;
  });

  it("queues initial channel profile generation once enough text posts exist", async () => {
    const step = createStep();

    selectQueues.push([
      {
        id: "post-1",
        channelId: "channel-1",
        contentRaw: "New post",
        mediaUrls: [],
        postedAt: new Date("2026-03-10T10:00:00.000Z"),
      },
    ]);
    selectQueues.push([{ id: "channel-1", userId: "user-1" }]);
    selectQueues.push([]);
    selectQueues.push(Array.from({ length: 8 }, (_, i) => ({ contentRaw: `Post ${i + 1}` })));

    const result = await runHandler(createEvent(), step);

    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "ai/profile-channel",
        data: expect.objectContaining({
          channelId: "channel-1",
          userId: "user-1",
          mode: "auto",
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        processed: true,
        profileRefreshQueued: true,
      }),
    );
  });

  it("skips profile refresh when cooldown is active", async () => {
    const step = createStep();

    selectQueues.push([
      {
        id: "post-1",
        channelId: "channel-1",
        contentRaw: "New post",
        mediaUrls: [],
        postedAt: new Date(),
      },
    ]);
    selectQueues.push([{ id: "channel-1", userId: "user-1" }]);
    selectQueues.push([{ generatedAt: new Date() }]);

    const result = await runHandler(createEvent(), step);

    expect(mockInngestSend).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        profileRefreshQueued: false,
        profileRefreshReason: "cooldown_active",
      }),
    );
  });

  it("queues incremental profile refresh when enough new posts were added", async () => {
    const step = createStep();

    selectQueues.push([
      {
        id: "post-1",
        channelId: "channel-1",
        contentRaw: "Newest post",
        mediaUrls: [],
        postedAt: new Date("2026-03-16T10:00:00.000Z"),
      },
    ]);
    selectQueues.push([{ id: "channel-1", userId: "user-1" }]);
    selectQueues.push([{ generatedAt: new Date("2026-03-15T00:00:00.000Z") }]);
    selectQueues.push(
      Array.from({ length: 5 }, (_, i) => ({
        contentRaw: `New post ${i + 1}`,
      })),
    );

    const result = await runHandler(createEvent(), step);

    expect(mockInngestSend).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        profileRefreshQueued: true,
        profileRefreshReason: "new_posts_threshold_met",
      }),
    );
  });
});
