import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — vi.mock factories are hoisted above ALL const declarations,
// so every value used in a factory must come from vi.hoisted().
// ---------------------------------------------------------------------------

const { mockSelect, mockInsert, mockUpdate, mockUsageTrackingTable, mockSubscriptionsTable } =
  vi.hoisted(() => ({
    mockSelect: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
    mockUsageTrackingTable: Symbol("usageTracking"),
    mockSubscriptionsTable: Symbol("subscriptions"),
  }));

vi.mock("@/server/db", () => ({
  db: {
    get select() {
      return mockSelect;
    },
    get insert() {
      return mockInsert;
    },
    get update() {
      return mockUpdate;
    },
  },
}));

vi.mock("@/server/db/schema", () => ({
  usageTracking: mockUsageTrackingTable,
  subscriptions: mockSubscriptionsTable,
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
}));

// ---------------------------------------------------------------------------
// Import modules under test (after mocks are registered)
// ---------------------------------------------------------------------------

import {
  canGenerateAi,
  getCurrentAiUsage,
  getRemainingAiQuota,
  enforceAiQuota,
  incrementAiUsage,
  withAiQuotaCheck,
  AiQuotaExceededError,
} from "../ai-quota";
import { getCurrentMonth } from "../usage";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Test utility — build a chainable DB select mock returning the given rows
// ---------------------------------------------------------------------------

function buildSelectChain(resolvedValue: unknown[]) {
  const limit = vi.fn().mockResolvedValue(resolvedValue);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where, limit });
  return { from, where, limit };
}

// ===========================================================================
// canGenerateAi
// ===========================================================================

describe("canGenerateAi", () => {
  it("returns false when Free user is at limit (10/10)", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ aiCallsCount: 10 }]);
    });

    const result = await canGenerateAi("free_user_at_limit");
    expect(result).toBe(false);
  });

  it("returns true when Free user is under limit (5/10)", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ aiCallsCount: 5 }]);
    });

    const result = await canGenerateAi("free_user_under_limit");
    expect(result).toBe(true);
  });

  it("always returns true for Pro users (unlimited)", async () => {
    mockSelect.mockReturnValue(buildSelectChain([{ plan: "pro" }]));

    const result = await canGenerateAi("pro_user");
    expect(result).toBe(true);
  });

  it("returns false when Plus user is at limit (100/100)", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "plus" }]);
      return buildSelectChain([{ aiCallsCount: 100 }]);
    });

    const result = await canGenerateAi("plus_user_at_limit");
    expect(result).toBe(false);
  });

  it("returns true when Plus user is under limit (50/100)", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "plus" }]);
      return buildSelectChain([{ aiCallsCount: 50 }]);
    });

    const result = await canGenerateAi("plus_user_under_limit");
    expect(result).toBe(true);
  });

  it("returns true for Free user with 0 usage", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([]);
    });

    const result = await canGenerateAi("free_user_zero");
    expect(result).toBe(true);
  });
});

// ===========================================================================
// getCurrentAiUsage
// ===========================================================================

describe("getCurrentAiUsage", () => {
  it("returns 0 for a new user with no usage row", async () => {
    mockSelect.mockReturnValue(buildSelectChain([]));

    const usage = await getCurrentAiUsage("new_user");
    expect(usage).toBe(0);
  });

  it("returns the correct AI calls count from existing row", async () => {
    mockSelect.mockReturnValue(buildSelectChain([{ aiCallsCount: 7 }]));

    const usage = await getCurrentAiUsage("user_with_7");
    expect(usage).toBe(7);
  });

  it("returns 0 when aiCallsCount is null (defensive)", async () => {
    mockSelect.mockReturnValue(buildSelectChain([{ aiCallsCount: null }]));

    const usage = await getCurrentAiUsage("user_null_count");
    expect(usage).toBe(0);
  });
});

// ===========================================================================
// getRemainingAiQuota
// ===========================================================================

describe("getRemainingAiQuota", () => {
  it("returns correct breakdown for Free user with 3 calls", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ aiCallsCount: 3 }]);
    });

    const quota = await getRemainingAiQuota("free_user");
    expect(quota.tier).toBe("free");
    expect(quota.used).toBe(3);
    expect(quota.limit).toBe(10);
    expect(quota.remaining).toBe(7);
  });

  it("returns 0 remaining when Free user is at limit", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ aiCallsCount: 10 }]);
    });

    const quota = await getRemainingAiQuota("free_user_max");
    expect(quota.remaining).toBe(0);
  });

  it("returns Infinity limit and remaining for Pro users", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "pro" }]);
      return buildSelectChain([{ aiCallsCount: 500 }]);
    });

    const quota = await getRemainingAiQuota("pro_user");
    expect(quota.tier).toBe("pro");
    expect(quota.limit).toBe(Infinity);
    expect(quota.remaining).toBe(Infinity);
  });

  it("returns correct breakdown for Plus user", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "plus" }]);
      return buildSelectChain([{ aiCallsCount: 40 }]);
    });

    const quota = await getRemainingAiQuota("plus_user");
    expect(quota.tier).toBe("plus");
    expect(quota.used).toBe(40);
    expect(quota.limit).toBe(100);
    expect(quota.remaining).toBe(60);
  });

  it("remaining never goes negative (capped at 0)", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ aiCallsCount: 15 }]);
    });

    const quota = await getRemainingAiQuota("free_over_limit");
    expect(quota.remaining).toBe(0);
    expect(quota.used).toBe(15);
    expect(quota.limit).toBe(10);
  });
});

// ===========================================================================
// enforceAiQuota
// ===========================================================================

describe("enforceAiQuota", () => {
  it("returns { allowed: true } when user is under limit", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ aiCallsCount: 3 }]);
    });

    const result = await enforceAiQuota("user_under_limit");
    expect(result.allowed).toBe(true);
  });

  it("returns structured error when user is over limit", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      // canGenerateAi → getUserTier
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      // canGenerateAi → getCurrentAiUsage
      if (callCount === 2) return buildSelectChain([{ aiCallsCount: 10 }]);
      // getRemainingAiQuota → getUserTier
      if (callCount === 3) return buildSelectChain([{ plan: "free" }]);
      // getRemainingAiQuota → getCurrentAiUsage
      return buildSelectChain([{ aiCallsCount: 10 }]);
    });

    const result = await enforceAiQuota("user_over_limit");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("ai_quota_exceeded");
      expect(result.used).toBe(10);
      expect(result.limit).toBe(10);
      expect(result.upgradeUrl).toBe("/dashboard/billing");
    }
  });

  it("returns { allowed: true } for Pro users regardless of usage", async () => {
    mockSelect.mockReturnValue(buildSelectChain([{ plan: "pro" }]));

    const result = await enforceAiQuota("pro_user_high_usage");
    expect(result.allowed).toBe(true);
  });

  it("returns structured error for Plus user at limit", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "plus" }]);
      if (callCount === 2) return buildSelectChain([{ aiCallsCount: 100 }]);
      if (callCount === 3) return buildSelectChain([{ plan: "plus" }]);
      return buildSelectChain([{ aiCallsCount: 100 }]);
    });

    const result = await enforceAiQuota("plus_at_limit");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("ai_quota_exceeded");
      expect(result.used).toBe(100);
      expect(result.limit).toBe(100);
    }
  });
});

// ===========================================================================
// incrementAiUsage
// ===========================================================================

describe("incrementAiUsage", () => {
  it("creates a new row for first usage (no existing record)", async () => {
    mockSelect.mockReturnValue(buildSelectChain([]));

    const mockValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockValues });

    await incrementAiUsage("new_user");

    expect(mockInsert).toHaveBeenCalledWith(mockUsageTrackingTable);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "new_user",
        crossPostsCount: 0,
        aiCallsCount: 1,
      }),
    );
  });

  it("increments aiCallsCount for existing row", async () => {
    mockSelect.mockReturnValue(buildSelectChain([{ id: "row_1", aiCallsCount: 5 }]));

    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });

    await incrementAiUsage("existing_user");

    expect(mockUpdate).toHaveBeenCalledWith(mockUsageTrackingTable);
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ aiCallsCount: 6 }));
  });

  it("does NOT affect crossPostsCount when incrementing", async () => {
    mockSelect.mockReturnValue(buildSelectChain([{ id: "row_1", aiCallsCount: 3 }]));

    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });

    await incrementAiUsage("existing_user");

    const setCall = mockSet.mock.calls[0]![0] as Record<string, unknown>;
    expect(setCall).not.toHaveProperty("crossPostsCount");
  });

  it("creates new row with correct month", async () => {
    mockSelect.mockReturnValue(buildSelectChain([]));

    const mockValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockValues });

    await incrementAiUsage("user_month_check");

    const expectedMonth = getCurrentMonth();
    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ month: expectedMonth }));
  });

  it("creates new row with crossPostsCount=0 and aiCallsCount=1", async () => {
    mockSelect.mockReturnValue(buildSelectChain([]));

    const mockValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockValues });

    await incrementAiUsage("new_user_verify_counts");

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        crossPostsCount: 0,
        aiCallsCount: 1,
      }),
    );
  });
});

// ===========================================================================
// withAiQuotaCheck
// ===========================================================================

describe("withAiQuotaCheck", () => {
  it("executes action when user is under limit", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ aiCallsCount: 2 }]);
    });

    const action = vi.fn().mockResolvedValue("ai_result");

    const result = await withAiQuotaCheck("user_allowed", action);

    expect(action).toHaveBeenCalledOnce();
    expect(result).toBe("ai_result");
  });

  it("throws AiQuotaExceededError when user is over quota", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      if (callCount === 2) return buildSelectChain([{ aiCallsCount: 10 }]);
      if (callCount === 3) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ aiCallsCount: 10 }]);
    });

    const action = vi.fn().mockResolvedValue("should_not_run");

    await expect(withAiQuotaCheck("user_over_quota", action)).rejects.toThrow(AiQuotaExceededError);
    expect(action).not.toHaveBeenCalled();
  });

  it("AiQuotaExceededError has correct used/limit properties", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "plus" }]);
      if (callCount === 2) return buildSelectChain([{ aiCallsCount: 100 }]);
      if (callCount === 3) return buildSelectChain([{ plan: "plus" }]);
      return buildSelectChain([{ aiCallsCount: 100 }]);
    });

    const action = vi.fn();

    try {
      await withAiQuotaCheck("plus_user_at_limit", action);
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AiQuotaExceededError);
      const quotaErr = err as AiQuotaExceededError;
      expect(quotaErr.used).toBe(100);
      expect(quotaErr.limit).toBe(100);
      expect(quotaErr.upgradeUrl).toBe("/dashboard/billing");
      expect(quotaErr.name).toBe("AiQuotaExceededError");
    }
  });

  it("does not execute action when over quota", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      if (callCount === 2) return buildSelectChain([{ aiCallsCount: 10 }]);
      if (callCount === 3) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ aiCallsCount: 10 }]);
    });

    const action = vi.fn().mockResolvedValue("should_not_run");

    await expect(withAiQuotaCheck("blocked_user", action)).rejects.toThrow();
    expect(action).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// AiQuotaExceededError class
// ===========================================================================

describe("AiQuotaExceededError", () => {
  it("is an instance of Error", () => {
    const err = new AiQuotaExceededError(10, 10);
    expect(err).toBeInstanceOf(Error);
  });

  it("has name AiQuotaExceededError", () => {
    const err = new AiQuotaExceededError(5, 10);
    expect(err.name).toBe("AiQuotaExceededError");
  });

  it("includes used/limit in message", () => {
    const err = new AiQuotaExceededError(15, 10);
    expect(err.message).toContain("15/10");
  });

  it("has upgradeUrl pointing to billing page", () => {
    const err = new AiQuotaExceededError(10, 10);
    expect(err.upgradeUrl).toBe("/dashboard/billing");
  });

  it("has used and limit properties", () => {
    const err = new AiQuotaExceededError(7, 10);
    expect(err.used).toBe(7);
    expect(err.limit).toBe(10);
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================

describe("edge cases", () => {
  it("no subscription record defaults to Free tier (limit 10)", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([]); // no subscription
      return buildSelectChain([{ aiCallsCount: 10 }]);
    });

    const result = await canGenerateAi("user_no_subscription");
    expect(result).toBe(false);
  });

  it("no subscription + no usage = allowed (brand new user)", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([]); // no subscription → free
      return buildSelectChain([]); // no usage → 0
    });

    const result = await canGenerateAi("brand_new_user");
    expect(result).toBe(true);
  });

  it("Free user over limit (15/10) is still denied", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ aiCallsCount: 15 }]);
    });

    expect(await canGenerateAi("free_over")).toBe(false);
  });

  it("new month returns 0 AI usage (no row for current month)", async () => {
    mockSelect.mockReturnValue(buildSelectChain([]));

    const usage = await getCurrentAiUsage("user_new_month");
    expect(usage).toBe(0);
  });

  it("getRemainingAiQuota shows full quota on fresh month", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([]); // no row
    });

    const quota = await getRemainingAiQuota("user_fresh_month");
    expect(quota).toEqual({
      used: 0,
      limit: 10,
      remaining: 10,
      tier: "free",
    });
  });
});
