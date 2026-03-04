import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Setup ──────────────────────────────────────────────────────────────

const { mockUser, mockSend, selectResults } = vi.hoisted(() => ({
  mockUser: { id: "user-123", email: "test@example.com" },
  mockSend: vi.fn(),
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
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.then = thenFn;
  return chain;
}

// Mock DB
vi.mock("@/server/db", () => ({
  db: {
    select: () => createSelectChain(),
  },
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, val: unknown) => ({ type: "eq", val })),
    and: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
    gte: vi.fn((_col: unknown, val: unknown) => ({ type: "gte", val })),
    desc: vi.fn((_col: unknown) => ({ type: "desc" })),
  };
});

// ─── Import under test (after mocks) ────────────────────────────────────────

import { requestCalendarSuggestions, getCalendarSuggestions } from "../calendar";

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  selectResults.length = 0;
  mockSend.mockResolvedValue(undefined);
});

describe("requestCalendarSuggestions", () => {
  it("returns success and emits event for valid request", async () => {
    // Channel ownership check — channel belongs to user
    selectResults.push([{ id: "channel-1", userId: "user-123" }]);

    const result = await requestCalendarSuggestions("channel-1", "2026-03-01", "2026-03-05");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBeDefined();
    }
    expect(mockSend).toHaveBeenCalledWith({
      name: "ai/calendar.suggest-fill",
      data: {
        channelId: "channel-1",
        userId: "user-123",
        startDate: "2026-03-01",
        endDate: "2026-03-05",
      },
    });
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

    const result = await requestCalendarSuggestions("channel-1", "2026-03-01", "2026-03-05");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Unauthorized");
    }
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns error when channel does not belong to user", async () => {
    selectResults.push([]);

    const result = await requestCalendarSuggestions("channel-999", "2026-03-01", "2026-03-05");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Channel not found");
    }
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns error when date range is invalid (startDate > endDate)", async () => {
    const result = await requestCalendarSuggestions("channel-1", "2026-03-10", "2026-03-01");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/date|range|invalid/i);
    }
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns error when date range exceeds 14 days", async () => {
    const result = await requestCalendarSuggestions("channel-1", "2026-03-01", "2026-03-20");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/range|14|days/i);
    }
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe("getCalendarSuggestions", () => {
  it("returns suggestions from content_library for channel", async () => {
    selectResults.push([
      {
        id: "item-1",
        title: "AI tools roundup",
        content: "Content about AI tools",
        sourceType: "idea",
        status: "draft",
        channelId: "channel-1",
        createdAt: new Date("2026-03-02T00:00:00Z"),
        sourceMetadata: { date: "2026-03-02", confidence: 0.85, generatedBy: "calendar-fill" },
      },
      {
        id: "item-2",
        title: "Design systems overview",
        content: "Content about design systems",
        sourceType: "idea",
        status: "draft",
        channelId: "channel-1",
        createdAt: new Date("2026-03-04T00:00:00Z"),
        sourceMetadata: { date: "2026-03-04", confidence: 0.78, generatedBy: "calendar-fill" },
      },
    ]);

    const result = await getCalendarSuggestions("channel-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          date: "2026-03-02",
          suggestedContent: expect.any(String),
          sourceType: "idea",
          confidence: 0.85,
        }),
      );
    }
  });

  it("returns empty array when no suggestions exist", async () => {
    selectResults.push([]);

    const result = await getCalendarSuggestions("channel-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
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

    const result = await getCalendarSuggestions("channel-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Unauthorized");
    }
  });
});
