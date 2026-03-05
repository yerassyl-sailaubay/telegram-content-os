import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Setup ──────────────────────────────────────────────────────────────

const { mockUser, mockSend, mockEnforceAiQuota, selectResults } = vi.hoisted(() => ({
  mockUser: { id: "user-123", email: "test@example.com" },
  mockSend: vi.fn(),
  mockEnforceAiQuota: vi.fn(),
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

// Mock ai-quota
vi.mock("@/lib/billing/ai-quota", () => ({
  enforceAiQuota: mockEnforceAiQuota,
}));

// Mock inngest client
vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: mockSend },
}));

// Build a chainable select mock that resolves to queued data
function createSelectChain() {
  const chain: Record<string, unknown> = {};
  const thenFn = (resolve: (val: unknown) => void) => {
    resolve(selectResults.shift() ?? []);
  };
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.then = thenFn;
  return chain;
}

// Mock DB
const mockSelect = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return createSelectChain();
    },
  },
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, val: unknown) => ({ type: "eq", val })),
    and: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
  };
});

// ─── Import under test (after mocks) ────────────────────────────────────────

import { developIdea } from "../develop-idea";

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  selectResults.length = 0;
  mockSend.mockResolvedValue(undefined);
});

describe("developIdea", () => {
  it("returns success and emits Inngest event for a valid idea", async () => {
    // Content item — sourceType is 'idea'
    selectResults.push([
      {
        id: "content-1",
        userId: "user-123",
        title: "My Idea",
        content: "An idea about AI",
        sourceType: "idea",
        status: "draft",
        channelId: "channel-1",
      },
    ]);
    mockEnforceAiQuota.mockResolvedValue({ allowed: true });

    const result = await developIdea("content-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe("Developing idea");
    }
    expect(mockEnforceAiQuota).toHaveBeenCalledWith("user-123");
    expect(mockSend).toHaveBeenCalledWith({
      name: "ai/content.develop-idea",
      data: {
        contentId: "content-1",
        userId: "user-123",
        channelId: "channel-1",
      },
    });
  });

  it("rejects non-idea content with error", async () => {
    // Content item — sourceType is 'telegram_import', not 'idea'
    selectResults.push([
      {
        id: "content-2",
        userId: "user-123",
        title: "A Telegram Post",
        content: "Imported post",
        sourceType: "telegram_import",
        status: "draft",
        channelId: "channel-1",
      },
    ]);

    const result = await developIdea("content-2");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Only ideas can be developed into drafts");
    }
    expect(mockEnforceAiQuota).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns error when user is not authenticated", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    } as never);

    const result = await developIdea("content-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Unauthorized");
    }
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns error when content is not found", async () => {
    // No content returned from DB
    selectResults.push([]);

    const result = await developIdea("nonexistent-id");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Content not found");
    }
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns error when AI quota is exceeded", async () => {
    selectResults.push([
      {
        id: "content-3",
        userId: "user-123",
        title: "My Idea",
        content: "Another idea",
        sourceType: "idea",
        status: "draft",
        channelId: "channel-1",
      },
    ]);
    mockEnforceAiQuota.mockResolvedValue({
      allowed: false,
      reason: "ai_quota_exceeded",
      used: 100,
      limit: 100,
      upgradeUrl: "/dashboard/billing",
    });

    const result = await developIdea("content-3");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("quota");
    }
    expect(mockSend).not.toHaveBeenCalled();
  });
});
