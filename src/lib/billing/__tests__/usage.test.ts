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
  getCurrentMonth,
  getUserTier,
  getCurrentUsage,
  canCrossPost,
  getRemainingQuota,
  incrementUsage,
} from "../usage";
import { enforceQuota, withQuotaCheck, QuotaExceededError } from "../enforce";

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
// getCurrentMonth
// ===========================================================================

describe("getCurrentMonth", () => {
  it("returns current month in YYYY-MM format", () => {
    const result = getCurrentMonth();
    // Should match YYYY-MM pattern
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });

  it("returns UTC-based month", () => {
    const result = getCurrentMonth();
    const now = new Date();
    const expected = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    expect(result).toBe(expected);
  });
});

// ===========================================================================
// getUserTier
// ===========================================================================

describe("getUserTier", () => {
  it("returns 'free' when no subscription row exists", async () => {
    mockSelect.mockReturnValue(buildSelectChain([]));

    const tier = await getUserTier("user_no_sub");
    expect(tier).toBe("free");
  });

  it("returns 'plus' tier from DB", async () => {
    mockSelect.mockReturnValue(buildSelectChain([{ plan: "plus" }]));

    const tier = await getUserTier("user_plus");
    expect(tier).toBe("plus");
  });

  it("returns 'pro' tier from DB", async () => {
    mockSelect.mockReturnValue(buildSelectChain([{ plan: "pro" }]));

    const tier = await getUserTier("user_pro");
    expect(tier).toBe("pro");
  });

  it("returns 'free' when plan field is null", async () => {
    mockSelect.mockReturnValue(buildSelectChain([{ plan: null }]));

    const tier = await getUserTier("user_null_plan");
    expect(tier).toBe("free");
  });
});

// ===========================================================================
// getCurrentUsage
// ===========================================================================

describe("getCurrentUsage", () => {
  it("returns 0 for a new user with no usage row", async () => {
    mockSelect.mockReturnValue(buildSelectChain([]));

    const usage = await getCurrentUsage("new_user");
    expect(usage).toBe(0);
  });

  it("returns the correct cross-post count from existing row", async () => {
    mockSelect.mockReturnValue(buildSelectChain([{ crossPostsCount: 3 }]));

    const usage = await getCurrentUsage("user_with_3");
    expect(usage).toBe(3);
  });

  it("returns 0 when crossPostsCount is null (defensive)", async () => {
    mockSelect.mockReturnValue(buildSelectChain([{ crossPostsCount: null }]));

    const usage = await getCurrentUsage("user_null_count");
    expect(usage).toBe(0);
  });
});

// ===========================================================================
// canCrossPost
// ===========================================================================

describe("canCrossPost", () => {
  it("returns false when Free user is at limit (5/5)", async () => {
    // First select: subscriptions → free tier
    // Second select: usage_tracking → 5 count
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ crossPostsCount: 5 }]);
    });

    const result = await canCrossPost("free_user_at_limit");
    expect(result).toBe(false);
  });

  it("returns true when Free user is under limit (4/5)", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ crossPostsCount: 4 }]);
    });

    const result = await canCrossPost("free_user_under_limit");
    expect(result).toBe(true);
  });

  it("returns false when Plus user is at limit (50/50)", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "plus" }]);
      return buildSelectChain([{ crossPostsCount: 50 }]);
    });

    const result = await canCrossPost("plus_user_at_limit");
    expect(result).toBe(false);
  });

  it("returns true when Plus user is under limit (49/50)", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "plus" }]);
      return buildSelectChain([{ crossPostsCount: 49 }]);
    });

    const result = await canCrossPost("plus_user_under_limit");
    expect(result).toBe(true);
  });

  it("always returns true for Pro users (unlimited)", async () => {
    // Pro only needs the tier lookup — no usage check
    mockSelect.mockReturnValue(buildSelectChain([{ plan: "pro" }]));

    const result = await canCrossPost("pro_user");
    expect(result).toBe(true);
  });

  it("returns true for a Free user with 0 usage", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([]);
    });

    const result = await canCrossPost("free_user_zero");
    expect(result).toBe(true);
  });
});

// ===========================================================================
// getRemainingQuota
// ===========================================================================

describe("getRemainingQuota", () => {
  it("returns correct breakdown for Free user with 2 uses", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ crossPostsCount: 2 }]);
    });

    const quota = await getRemainingQuota("free_user");
    expect(quota.tier).toBe("free");
    expect(quota.used).toBe(2);
    expect(quota.limit).toBe(5);
    expect(quota.remaining).toBe(3);
  });

  it("returns 0 remaining when Free user is at limit", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ crossPostsCount: 5 }]);
    });

    const quota = await getRemainingQuota("free_user_max");
    expect(quota.remaining).toBe(0);
  });

  it("returns Infinity limit and remaining for Pro users", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "pro" }]);
      return buildSelectChain([{ crossPostsCount: 100 }]);
    });

    const quota = await getRemainingQuota("pro_user");
    expect(quota.tier).toBe("pro");
    expect(quota.limit).toBe(Infinity);
    expect(quota.remaining).toBe(Infinity);
  });

  it("returns correct breakdown for Plus user", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "plus" }]);
      return buildSelectChain([{ crossPostsCount: 30 }]);
    });

    const quota = await getRemainingQuota("plus_user");
    expect(quota.tier).toBe("plus");
    expect(quota.used).toBe(30);
    expect(quota.limit).toBe(50);
    expect(quota.remaining).toBe(20);
  });
});

// ===========================================================================
// incrementUsage
// ===========================================================================

describe("incrementUsage", () => {
  it("creates a new row for first usage (no existing record)", async () => {
    // First select (check existence) → no rows
    mockSelect.mockReturnValue(buildSelectChain([]));

    const mockValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockValues });

    await incrementUsage("new_user");

    expect(mockInsert).toHaveBeenCalledWith(mockUsageTrackingTable);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "new_user",
        crossPostsCount: 1,
        aiCallsCount: 0,
      }),
    );
  });

  it("increments count for existing row", async () => {
    // First select → existing row with count 3
    mockSelect.mockReturnValue(buildSelectChain([{ id: "row_1", crossPostsCount: 3 }]));

    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });

    await incrementUsage("existing_user");

    expect(mockUpdate).toHaveBeenCalledWith(mockUsageTrackingTable);
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ crossPostsCount: 4 }));
  });

  it("creates new row with correct month", async () => {
    mockSelect.mockReturnValue(buildSelectChain([]));

    const mockValues = vi.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockValues });

    await incrementUsage("user_month_check");

    const expectedMonth = getCurrentMonth();
    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ month: expectedMonth }));
  });
});

// ===========================================================================
// enforceQuota
// ===========================================================================

describe("enforceQuota", () => {
  it("returns { allowed: true } when user is under limit", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ crossPostsCount: 3 }]);
    });

    const result = await enforceQuota("user_under_limit");
    expect(result.allowed).toBe(true);
  });

  it("returns structured error when user is over limit", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      // canCrossPost → getUserTier
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      // canCrossPost → getCurrentUsage
      if (callCount === 2) return buildSelectChain([{ crossPostsCount: 5 }]);
      // getRemainingQuota → getUserTier
      if (callCount === 3) return buildSelectChain([{ plan: "free" }]);
      // getRemainingQuota → getCurrentUsage
      return buildSelectChain([{ crossPostsCount: 5 }]);
    });

    const result = await enforceQuota("user_over_limit");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("quota_exceeded");
      expect(result.used).toBe(5);
      expect(result.limit).toBe(5);
      expect(result.upgradeUrl).toBe("/dashboard/billing");
    }
  });

  it("returns { allowed: true } for Pro users regardless of usage", async () => {
    mockSelect.mockReturnValue(buildSelectChain([{ plan: "pro" }]));

    const result = await enforceQuota("pro_user_high_usage");
    expect(result.allowed).toBe(true);
  });
});

// ===========================================================================
// withQuotaCheck
// ===========================================================================

describe("withQuotaCheck", () => {
  it("executes action when user is allowed", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ crossPostsCount: 2 }]);
    });

    const action = vi.fn().mockResolvedValue("action_result");

    const result = await withQuotaCheck("user_allowed", action);

    expect(action).toHaveBeenCalledOnce();
    expect(result).toBe("action_result");
  });

  it("throws QuotaExceededError when user is over quota", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      if (callCount === 2) return buildSelectChain([{ crossPostsCount: 5 }]);
      if (callCount === 3) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ crossPostsCount: 5 }]);
    });

    const action = vi.fn().mockResolvedValue("should_not_run");

    await expect(withQuotaCheck("user_over_quota", action)).rejects.toThrow(QuotaExceededError);
    expect(action).not.toHaveBeenCalled();
  });

  it("QuotaExceededError has correct used/limit properties", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "plus" }]);
      if (callCount === 2) return buildSelectChain([{ crossPostsCount: 50 }]);
      if (callCount === 3) return buildSelectChain([{ plan: "plus" }]);
      return buildSelectChain([{ crossPostsCount: 50 }]);
    });

    const action = vi.fn();

    try {
      await withQuotaCheck("plus_user_at_limit", action);
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(QuotaExceededError);
      const quotaErr = err as QuotaExceededError;
      expect(quotaErr.used).toBe(50);
      expect(quotaErr.limit).toBe(50);
      expect(quotaErr.upgradeUrl).toBe("/dashboard/billing");
      expect(quotaErr.name).toBe("QuotaExceededError");
    }
  });

  it("does not execute action when over quota", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      if (callCount === 2) return buildSelectChain([{ crossPostsCount: 5 }]);
      if (callCount === 3) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ crossPostsCount: 5 }]);
    });

    const action = vi.fn().mockResolvedValue("should_not_run");

    await expect(withQuotaCheck("blocked_user", action)).rejects.toThrow();
    expect(action).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Edge cases & scenarios from requirements
// ===========================================================================

describe("edge cases", () => {
  it("no subscription record defaults to Free tier (limit 5)", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([]); // no subscription
      return buildSelectChain([{ crossPostsCount: 5 }]);
    });

    const result = await canCrossPost("user_no_subscription");
    expect(result).toBe(false);
  });

  it("no subscription + no usage = allowed (brand new user)", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([]); // no subscription → free
      return buildSelectChain([]); // no usage → 0
    });

    const result = await canCrossPost("brand_new_user");
    expect(result).toBe(true);
  });

  it("Free user over limit (7/5) is still denied", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ crossPostsCount: 7 }]);
    });

    expect(await canCrossPost("free_over")).toBe(false);
  });

  it("remaining never goes negative (capped at 0)", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([{ crossPostsCount: 8 }]);
    });

    const quota = await getRemainingQuota("free_over_limit");
    expect(quota.remaining).toBe(0);
    expect(quota.used).toBe(8);
    expect(quota.limit).toBe(5);
  });
});

// ===========================================================================
// Month boundary reset
// ===========================================================================

describe("month boundary reset", () => {
  it("new month returns 0 usage (no row for current month)", async () => {
    // Simulate: user had usage last month, but getCurrentUsage queries
    // the current month which has no row → 0
    mockSelect.mockReturnValue(buildSelectChain([]));

    const usage = await getCurrentUsage("user_new_month");
    expect(usage).toBe(0);
  });

  it("new month allows cross-posting even if last month was at limit", async () => {
    // The key: getCurrentMonth() generates current month string.
    // DB query with that month finds no row → 0 usage → under limit.
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([]); // no row for this month = 0 usage
    });

    expect(await canCrossPost("user_fresh_month")).toBe(true);
  });

  it("getRemainingQuota shows full quota on fresh month", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
      return buildSelectChain([]); // no row
    });

    const quota = await getRemainingQuota("user_fresh_month");
    expect(quota).toEqual({
      used: 0,
      limit: 5,
      remaining: 5,
      tier: "free",
    });
  });
});

// ===========================================================================
// Tier upgrade mid-month
// ===========================================================================

describe("tier upgrade mid-month", () => {
  it("upgrading from Free to Plus immediately grants new limit", async () => {
    // User used 4 cross-posts on Free, then upgraded to Plus (limit 50).
    // Subscription table now says 'plus'. Same month usage stays at 4.
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "plus" }]);
      return buildSelectChain([{ crossPostsCount: 4 }]);
    });

    expect(await canCrossPost("upgraded_user")).toBe(true);
  });

  it("upgrading to Plus shows new remaining quota", async () => {
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "plus" }]);
      return buildSelectChain([{ crossPostsCount: 4 }]);
    });

    const quota = await getRemainingQuota("upgraded_user");
    expect(quota).toEqual({
      used: 4,
      limit: 50,
      remaining: 46,
      tier: "plus",
    });
  });

  it("upgrading from Free (at limit) to Plus allows posting again", async () => {
    // Was at 5/5 on Free. Upgraded to Plus (limit 50).
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([{ plan: "plus" }]);
      return buildSelectChain([{ crossPostsCount: 5 }]);
    });

    expect(await canCrossPost("upgraded_from_limit")).toBe(true);
  });

  it("upgrading to Pro always allows posting", async () => {
    mockSelect.mockReturnValue(buildSelectChain([{ plan: "pro" }]));

    expect(await canCrossPost("pro_upgraded_user")).toBe(true);
  });
});

// ===========================================================================
// QuotaExceededError class
// ===========================================================================

describe("QuotaExceededError", () => {
  it("is an instance of Error", () => {
    const err = new QuotaExceededError(5, 5);
    expect(err).toBeInstanceOf(Error);
  });

  it("has name QuotaExceededError", () => {
    const err = new QuotaExceededError(3, 5);
    expect(err.name).toBe("QuotaExceededError");
  });

  it("includes used/limit in message", () => {
    const err = new QuotaExceededError(10, 5);
    expect(err.message).toContain("10/5");
  });

  it("has upgradeUrl pointing to billing page", () => {
    const err = new QuotaExceededError(5, 5);
    expect(err.upgradeUrl).toBe("/dashboard/billing");
  });
});
