import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Setup ──────────────────────────────────────────────────────────────

const {
  mockUser,
  mockReturning,
  mockInsert,
  mockUpdate,
  mockSelect,
  selectResults,
  mockTgSendMessage,
} = vi.hoisted(() => ({
  mockUser: { id: "user-123", email: "test@example.com" },
  mockReturning: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockSelect: vi.fn(),
  selectResults: [] as unknown[][],
  mockTgSendMessage: vi.fn(),
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
    sendMessage: mockTgSendMessage,
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
  };
});

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock DB schema
vi.mock("@/server/db/schema", () => ({
  welcomeTemplates: {
    id: "id",
    channelId: "channel_id",
    userId: "user_id",
    templateText: "template_text",
    isEnabled: "is_enabled",
  },
  telegramChannels: {
    id: "id",
    userId: "user_id",
    telegramChatId: "telegram_chat_id",
    title: "title",
    username: "username",
    memberCount: "member_count",
  },
}));

// ─── Import under test (after mocks) ────────────────────────────────────────

import {
  getWelcomeTemplate,
  saveWelcomeTemplate,
  testWelcomeMessage,
} from "../welcome";

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  selectResults.length = 0;
});

// ─── getWelcomeTemplate ─────────────────────────────────────────────────────

describe("getWelcomeTemplate", () => {
  it("returns error when channelId is empty", async () => {
    const result = await getWelcomeTemplate("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel ID is required");
    }
  });

  it("returns error when channel not found (ownership check fails)", async () => {
    // First select: verifyChannelOwnership → empty
    selectResults.push([]);
    const result = await getWelcomeTemplate("ch-1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel not found");
    }
  });

  it("returns null when no template exists", async () => {
    // First select: verifyChannelOwnership → found
    selectResults.push([{ id: "ch-1", userId: "user-123" }]);
    // Second select: template query → empty
    selectResults.push([]);
    const result = await getWelcomeTemplate("ch-1");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it("returns template when it exists", async () => {
    const template = {
      id: "tpl-1",
      channelId: "ch-1",
      userId: "user-123",
      templateText: "Welcome {name}!",
      isEnabled: true,
    };
    selectResults.push([{ id: "ch-1", userId: "user-123" }]);
    selectResults.push([template]);
    const result = await getWelcomeTemplate("ch-1");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(template);
    }
  });
});

// ─── saveWelcomeTemplate ────────────────────────────────────────────────────

describe("saveWelcomeTemplate", () => {
  it("returns error when channelId is empty", async () => {
    const result = await saveWelcomeTemplate("", "Hello", true);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel ID is required");
    }
  });

  it("returns error when template text is empty/whitespace", async () => {
    const result = await saveWelcomeTemplate("ch-1", "   ", true);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Template text is required");
    }
  });

  it("returns error when channel not found", async () => {
    selectResults.push([]); // verifyChannelOwnership → not found
    const result = await saveWelcomeTemplate("ch-1", "Hello", true);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel not found");
    }
  });

  it("inserts new template when none exists", async () => {
    const newTemplate = {
      id: "tpl-new",
      channelId: "ch-1",
      userId: "user-123",
      templateText: "Welcome!",
      isEnabled: true,
    };
    selectResults.push([{ id: "ch-1", userId: "user-123" }]); // ownership
    selectResults.push([]); // existing template → none
    mockReturning.mockResolvedValueOnce([newTemplate]);

    const result = await saveWelcomeTemplate("ch-1", "Welcome!", true);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(newTemplate);
    }
    expect(mockInsert).toHaveBeenCalled();
  });

  it("updates existing template", async () => {
    const existingTemplate = {
      id: "tpl-1",
      channelId: "ch-1",
      userId: "user-123",
      templateText: "Old text",
      isEnabled: false,
    };
    const updatedTemplate = {
      ...existingTemplate,
      templateText: "New text",
      isEnabled: true,
    };
    selectResults.push([{ id: "ch-1", userId: "user-123" }]); // ownership
    selectResults.push([existingTemplate]); // existing template → found
    mockReturning.mockResolvedValueOnce([updatedTemplate]);

    const result = await saveWelcomeTemplate("ch-1", "New text", true);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updatedTemplate);
    }
    expect(mockUpdate).toHaveBeenCalled();
  });
});

// ─── testWelcomeMessage ─────────────────────────────────────────────────────

describe("testWelcomeMessage", () => {
  it("returns error when channelId is empty", async () => {
    const result = await testWelcomeMessage("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel ID is required");
    }
  });

  it("returns error when channel not found", async () => {
    selectResults.push([]); // ownership → not found
    const result = await testWelcomeMessage("ch-1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Channel not found");
    }
  });

  it("returns error when no template exists", async () => {
    selectResults.push([
      {
        id: "ch-1",
        userId: "user-123",
        title: "My Channel",
        telegramChatId: "-100123",
        memberCount: 42,
      },
    ]); // ownership
    selectResults.push([]); // template → none
    const result = await testWelcomeMessage("ch-1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No welcome template found");
    }
  });

  it("renders and sends test message", async () => {
    selectResults.push([
      {
        id: "ch-1",
        userId: "user-123",
        title: "My Channel",
        telegramChatId: "-100123",
        memberCount: 42,
      },
    ]); // ownership
    selectResults.push([
      {
        id: "tpl-1",
        templateText: "Hello {name}, welcome to {channel_name}!",
        isEnabled: true,
      },
    ]); // template
    mockTgSendMessage.mockResolvedValue(undefined);

    const result = await testWelcomeMessage("ch-1");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.preview).toBe("Hello John Doe, welcome to My Channel!");
    }
    expect(mockTgSendMessage).toHaveBeenCalledWith(
      "-100123",
      "Hello John Doe, welcome to My Channel!",
    );
  });
});
