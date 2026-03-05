import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockUser,
  mockSelect,
  mockTxInsert,
  mockOnConflictDoUpdate,
  mockRevalidatePath,
  selectResults,
} = vi.hoisted(() => ({
  mockUser: { id: "admin-user", email: "admin@example.com" as string | null },
  mockSelect: vi.fn(),
  mockTxInsert: vi.fn(),
  mockOnConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  mockRevalidatePath: vi.fn(),
  selectResults: [] as unknown[][],
}));

const ORIGINAL_ENV = { ...process.env };

function createSelectChain() {
  const chain: Record<string, unknown> = {};
  const thenFn = (resolve: (val: unknown) => void) => {
    resolve(selectResults.shift() ?? []);
  };
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.then = thenFn;
  return chain;
}

function createTxInsertChain() {
  const chain: Record<string, unknown> = {};
  chain.values = vi.fn().mockReturnValue(chain);
  chain.onConflictDoUpdate = (...args: unknown[]) => {
    mockOnConflictDoUpdate(...args);
    return Promise.resolve();
  };
  return chain;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockImplementation(async () => ({
        data: {
          user: mockUser.email ? { id: mockUser.id, email: mockUser.email } : null,
        },
      })),
    },
  }),
}));

vi.mock("@/server/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return createSelectChain();
    },
    transaction: async (callback: (tx: { insert: (...args: unknown[]) => unknown }) => unknown) =>
      callback({
        insert: (...args: unknown[]) => {
          mockTxInsert(...args);
          return createTxInsertChain();
        },
      }),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, value: unknown) => ({ type: "eq", value })),
    ne: vi.fn((_col: unknown, value: unknown) => ({ type: "ne", value })),
    gte: vi.fn((_col: unknown, value: unknown) => ({ type: "gte", value })),
    and: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
    or: vi.fn((...conditions: unknown[]) => ({ type: "or", conditions })),
    desc: vi.fn((col: unknown) => ({ type: "desc", col })),
    sql: vi.fn(() => ({ type: "sql" })),
  };
});

import { getAdminConsoleData, updateAdminBillingRecord } from "../admin";

beforeEach(() => {
  vi.clearAllMocks();
  selectResults.length = 0;

  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    ADMIN_EMAILS: "admin@example.com",
  };

  mockUser.id = "admin-user";
  mockUser.email = "admin@example.com";
});

describe("getAdminConsoleData", () => {
  it("returns aggregated admin dashboard data", async () => {
    selectResults.push([{ count: 12 }]); // total users
    selectResults.push([{ count: 4 }]); // paid users
    selectResults.push([{ count: 1 }]); // past due users
    selectResults.push([{ count: 9 }]); // cross-posts 24h
    selectResults.push([{ count: 2 }]); // failed cross-posts 24h
    selectResults.push([{ count: 5 }]); // pending schedules
    selectResults.push([{ count: 1 }]); // failed schedules 24h
    selectResults.push([{ totalCrossPosts: 44, totalAiCalls: 88 }]); // month totals
    selectResults.push([
      {
        userId: "user-1",
        email: "creator@example.com",
        name: "Creator",
        plan: "plus",
        status: "active",
        cancelAtPeriodEnd: false,
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        currentPeriodEnd: new Date("2026-03-31T00:00:00.000Z"),
        subscriptionUpdatedAt: new Date("2026-03-01T00:00:00.000Z"),
        crossPostsUsed: 7,
        aiCallsUsed: 11,
      },
    ]);
    selectResults.push([
      {
        id: "cp-1",
        userEmail: "creator@example.com",
        platform: "linkedin",
        status: "failed",
        adaptedContent: "Failure example content",
        createdAt: new Date("2026-03-04T10:00:00.000Z"),
        updatedAt: new Date("2026-03-04T11:00:00.000Z"),
      },
    ]);
    selectResults.push([
      {
        id: "sched-1",
        userEmail: "creator@example.com",
        targetType: "cross_post",
        platform: "linkedin",
        scheduledAt: new Date("2026-03-04T12:00:00.000Z"),
        updatedAt: new Date("2026-03-04T12:30:00.000Z"),
      },
    ]);
    selectResults.push([
      {
        id: "source-1",
        userEmail: "creator@example.com",
        sourceType: "youtube",
        sourceUrl: "https://youtube.com/watch?v=test",
        errorMessage: "transcript unavailable",
        updatedAt: new Date("2026-03-04T09:00:00.000Z"),
      },
    ]);
    selectResults.push([
      {
        id: "sync-1",
        userEmail: "creator@example.com",
        platform: "linkedin",
        lastSyncedAt: new Date("2026-03-04T08:00:00.000Z"),
        syncWindowStart: new Date("2026-03-03T08:00:00.000Z"),
        syncWindowEnd: new Date("2026-03-04T08:00:00.000Z"),
      },
    ]);

    const result = await getAdminConsoleData();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.overview.totalUsers).toBe(12);
      expect(result.data.overview.totalAiCallsThisMonth).toBe(88);
      expect(result.data.billingUsers).toHaveLength(1);
      expect(result.data.billingUsers[0]?.email).toBe("creator@example.com");
      expect(result.data.crossPostEvents[0]?.status).toBe("failed");
      expect(result.data.scheduleFailures[0]?.platform).toBe("linkedin");
      expect(result.data.sourceFailures[0]?.sourceType).toBe("youtube");
      expect(result.data.analyticsSyncEvents[0]?.platform).toBe("linkedin");
      expect(result.data.access.mode).toBe("restricted");
      expect(result.data.access.configuredAdmins).toContain("admin@example.com");
    }
  });

  it("rejects non-admin users", async () => {
    mockUser.email = "non-admin@example.com";

    const result = await getAdminConsoleData();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Forbidden");
    }
  });
});

describe("updateAdminBillingRecord", () => {
  it("updates subscription and usage for a user", async () => {
    selectResults.push([{ id: "user-1" }]); // user existence check

    const result = await updateAdminBillingRecord({
      userId: "user-1",
      plan: "pro",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2026-03-31",
      usageMonth: "2026-03",
      crossPostsUsed: 55,
      aiCallsUsed: 200,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe("user-1");
    }
    expect(mockTxInsert).toHaveBeenCalledTimes(2);
    expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(2);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/admin");
  });

  it("validates usage month format", async () => {
    const result = await updateAdminBillingRecord({
      userId: "user-1",
      plan: "plus",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      usageMonth: "03-2026",
      crossPostsUsed: 1,
      aiCallsUsed: 2,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("YYYY-MM");
    }
    expect(mockTxInsert).not.toHaveBeenCalled();
  });
});
