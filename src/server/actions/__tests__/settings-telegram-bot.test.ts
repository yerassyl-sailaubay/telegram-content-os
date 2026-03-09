import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUser, mockSelect, selectResults } = vi.hoisted(() => ({
  mockUser: { id: "user-123", email: "test@example.com" },
  mockSelect: vi.fn(),
  selectResults: [] as unknown[][],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockUser },
      }),
    },
  }),
}));

function createSelectChain() {
  const chain: Record<string, unknown> = {};
  const thenFn = (resolve: (value: unknown) => void) => {
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
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return createSelectChain();
    },
  },
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, val: unknown) => ({ type: "eq", val })),
    and: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
  };
});

import { getSettings } from "../settings";

describe("getSettings telegram bot status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults.length = 0;
  });

  it("returns an unlinked Telegram bot state by default", async () => {
    selectResults.push([
      {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        telegramUserId: null,
        telegramLinkedAt: null,
      },
    ]);
    selectResults.push([]);
    selectResults.push([]);
    selectResults.push([]);

    const result = await getSettings();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.telegramBot).toEqual({
        linked: false,
        telegramUserId: null,
        linkedAt: null,
      });
    }
  });

  it("returns a linked Telegram bot state when the user is linked", async () => {
    selectResults.push([
      {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        telegramUserId: "777",
        telegramLinkedAt: new Date("2026-03-09T12:00:00.000Z"),
      },
    ]);
    selectResults.push([]);
    selectResults.push([]);
    selectResults.push([]);

    const result = await getSettings();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.telegramBot).toEqual({
        linked: true,
        telegramUserId: "777",
        linkedAt: "2026-03-09T12:00:00.000Z",
      });
    }
  });
});
