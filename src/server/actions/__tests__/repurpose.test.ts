import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Setup ──────────────────────────────────────────────────────────────

const { mockUser, mockSendEvent, mockEnforceAiQuota, selectResults } = vi.hoisted(() => ({
  mockUser: { id: "user-123", email: "test@example.com" },
  mockSendEvent: vi.fn(),
  mockEnforceAiQuota: vi.fn(),
  selectResults: [] as unknown[][],
}));

// Mock Supabase auth
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockUser },
      }),
    },
  }),
}));

// Mock Inngest client
vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    send: mockSendEvent,
  },
}));

// Mock AI quota
vi.mock("@/lib/billing/ai-quota", () => ({
  enforceAiQuota: mockEnforceAiQuota,
}));

// Build chainable select mock
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

vi.mock("@/server/db", () => ({
  db: {
    select: () => createSelectChain(),
  },
}));

vi.mock("@/server/db/schema", () => ({
  contentLibrary: {
    id: "id",
    userId: "user_id",
    content: "content",
    channelId: "channel_id",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
}));

import { repurposePost } from "../repurpose";

beforeEach(() => {
  vi.clearAllMocks();
  selectResults.length = 0;
});

describe("repurposePost", () => {
  it("succeeds with 'shorter' mode and emits Inngest event", async () => {
    const contentItem = {
      id: "content-uuid-1",
      userId: "user-123",
      content: "Some original Telegram post about tech.",
      channelId: "channel-uuid-1",
    };

    selectResults.push([contentItem]);
    mockEnforceAiQuota.mockResolvedValue({ allowed: true });
    mockSendEvent.mockResolvedValue(undefined);

    const result = await repurposePost("content-uuid-1", "shorter");

    expect(result).toEqual({ success: true, data: { message: "Repurposing started" } });
    expect(mockEnforceAiQuota).toHaveBeenCalledWith("user-123");
    expect(mockSendEvent).toHaveBeenCalledWith({
      name: "ai/content.repurpose",
      data: {
        contentId: "content-uuid-1",
        mode: "shorter",
        numVariations: 1,
        userId: "user-123",
        channelId: "channel-uuid-1",
      },
    });
  });

  it("succeeds with 'poll' mode and custom numVariations", async () => {
    const contentItem = {
      id: "content-uuid-2",
      userId: "user-123",
      content: "Another post for poll creation.",
      channelId: "channel-uuid-2",
    };

    selectResults.push([contentItem]);
    mockEnforceAiQuota.mockResolvedValue({ allowed: true });
    mockSendEvent.mockResolvedValue(undefined);

    const result = await repurposePost("content-uuid-2", "poll", { numVariations: 3 });

    expect(result).toEqual({ success: true, data: { message: "Repurposing started" } });
    expect(mockSendEvent).toHaveBeenCalledWith({
      name: "ai/content.repurpose",
      data: {
        contentId: "content-uuid-2",
        mode: "poll",
        numVariations: 3,
        userId: "user-123",
        channelId: "channel-uuid-2",
      },
    });
  });

  it("returns error when AI quota is exceeded", async () => {
    const contentItem = {
      id: "content-uuid-3",
      userId: "user-123",
      content: "Some content.",
      channelId: "channel-uuid-3",
    };

    selectResults.push([contentItem]);
    mockEnforceAiQuota.mockResolvedValue({
      allowed: false,
      reason: "ai_quota_exceeded",
      used: 100,
      limit: 100,
      upgradeUrl: "/dashboard/billing",
    });

    const result = await repurposePost("content-uuid-3", "shorter");

    expect(result).toEqual({ success: false, error: expect.stringMatching(/quota/i) });
    expect(mockSendEvent).not.toHaveBeenCalled();
  });

  it("returns error when user is unauthenticated", async () => {
    // Override createClient to return null user
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as never);

    const result = await repurposePost("content-uuid-4", "thread");

    expect(result).toEqual({ success: false, error: expect.stringMatching(/unauthorized/i) });
    expect(mockEnforceAiQuota).not.toHaveBeenCalled();
    expect(mockSendEvent).not.toHaveBeenCalled();
  });

  it("returns error when content is not found", async () => {
    selectResults.push([]); // Empty result — content doesn't exist

    const result = await repurposePost("nonexistent-id", "shorter");

    expect(result).toEqual({ success: false, error: expect.stringMatching(/not found/i) });
    expect(mockEnforceAiQuota).not.toHaveBeenCalled();
    expect(mockSendEvent).not.toHaveBeenCalled();
  });
});
