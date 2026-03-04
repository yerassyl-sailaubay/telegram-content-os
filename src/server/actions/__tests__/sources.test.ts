import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Setup ──────────────────────────────────────────────────────────────

const { mockUser, mockSend, mockEnforceAiQuota, mockParseUrl, selectResults } = vi.hoisted(() => ({
  mockUser: { id: "user-123", email: "test@example.com" },
  mockSend: vi.fn(),
  mockEnforceAiQuota: vi.fn(),
  mockParseUrl: vi.fn(),
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

// Mock url-parser
vi.mock("@/lib/sources/url-parser", () => ({
  parseUrl: mockParseUrl,
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

import { createFromUrl } from "../sources";

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  selectResults.length = 0;
  mockSend.mockResolvedValue(undefined);
});

// ─── createFromUrl ───────────────────────────────────────────────────────────

describe("createFromUrl", () => {
  it("returns success for a valid YouTube URL", async () => {
    mockParseUrl.mockReturnValue({
      type: "youtube",
      url: "https://www.youtube.com/watch?v=abc123",
      videoId: "abc123",
    });
    mockEnforceAiQuota.mockResolvedValue({ allowed: true });
    // Channel ownership check — channel belongs to user
    selectResults.push([{ id: "channel-1", userId: "user-123" }]);

    const result = await createFromUrl("https://www.youtube.com/watch?v=abc123", "channel-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe("Processing started");
    }
    expect(mockParseUrl).toHaveBeenCalledWith("https://www.youtube.com/watch?v=abc123");
    expect(mockEnforceAiQuota).toHaveBeenCalledWith("user-123");
    expect(mockSend).toHaveBeenCalledWith({
      name: "sources/url.submitted",
      data: {
        url: "https://www.youtube.com/watch?v=abc123",
        userId: "user-123",
        channelId: "channel-1",
      },
    });
  });

  it("returns success for a valid article URL", async () => {
    mockParseUrl.mockReturnValue({
      type: "article",
      url: "https://example.com/article",
    });
    mockEnforceAiQuota.mockResolvedValue({ allowed: true });
    selectResults.push([{ id: "channel-2", userId: "user-123" }]);

    const result = await createFromUrl("https://example.com/article", "channel-2");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe("Processing started");
    }
    expect(mockSend).toHaveBeenCalledWith({
      name: "sources/url.submitted",
      data: {
        url: "https://example.com/article",
        userId: "user-123",
        channelId: "channel-2",
      },
    });
  });

  it("returns error for invalid/unknown URL type", async () => {
    mockParseUrl.mockReturnValue({
      type: "unknown",
      url: "https://unknown.example.com/page",
    });

    const result = await createFromUrl("https://unknown.example.com/page", "channel-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Unsupported URL");
    }
    // Should NOT emit event or check quota
    expect(mockEnforceAiQuota).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns error when URL parsing throws (invalid URL)", async () => {
    mockParseUrl.mockImplementation(() => {
      throw new Error("Invalid URL: not-a-url");
    });

    const result = await createFromUrl("not-a-url", "channel-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid URL");
    }
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns error when AI quota is exceeded", async () => {
    mockParseUrl.mockReturnValue({
      type: "youtube",
      url: "https://www.youtube.com/watch?v=abc123",
      videoId: "abc123",
    });
    mockEnforceAiQuota.mockResolvedValue({
      allowed: false,
      reason: "ai_quota_exceeded",
      used: 100,
      limit: 100,
      upgradeUrl: "/dashboard/billing",
    });

    const result = await createFromUrl("https://www.youtube.com/watch?v=abc123", "channel-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("quota");
    }
    // Should NOT emit event
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns error when user is not authenticated", async () => {
    // Override the mock for this test — no user
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    } as never);

    const result = await createFromUrl("https://www.youtube.com/watch?v=abc123", "channel-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Unauthorized");
    }
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns error when channel does not belong to user", async () => {
    mockParseUrl.mockReturnValue({
      type: "article",
      url: "https://example.com/article",
    });
    mockEnforceAiQuota.mockResolvedValue({ allowed: true });
    // Channel ownership check — no matching channel
    selectResults.push([]);

    const result = await createFromUrl("https://example.com/article", "channel-999");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Channel not found");
    }
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns error when URL is empty", async () => {
    const result = await createFromUrl("", "channel-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
    expect(mockSend).not.toHaveBeenCalled();
  });
});
