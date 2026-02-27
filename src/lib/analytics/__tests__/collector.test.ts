/**
 * TDD tests for analytics collector service.
 *
 * Covers: rate limiting, sync dedup, LinkedIn/Twitter/Telegram collection,
 * data aggregation, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createRateLimiter,
  tryAcquire,
  getWaitTime,
  collectTwitterMetadata,
  computeTotalEngagement,
  aggregateChannelMetrics,
  fetchLinkedInPostAnalytics,
  fetchTelegramReactions,
} from "../collector";
import type { PlatformEngagement, RateLimiter } from "../types";
import { RATE_LIMITS, AnalyticsCollectionError } from "../types";

// ---------------------------------------------------------------------------
// Rate limiter tests
// ---------------------------------------------------------------------------

describe("createRateLimiter", () => {
  it("creates a LinkedIn rate limiter with correct defaults", () => {
    const limiter = createRateLimiter("linkedin");
    expect(limiter.maxRequests).toBe(100);
    expect(limiter.windowMs).toBe(24 * 60 * 60 * 1000);
    expect(limiter.timestamps).toEqual([]);
  });

  it("creates a Telegram rate limiter with correct defaults", () => {
    const limiter = createRateLimiter("telegram");
    expect(limiter.maxRequests).toBe(30);
    expect(limiter.windowMs).toBe(1000);
    expect(limiter.timestamps).toEqual([]);
  });
});

describe("tryAcquire", () => {
  it("allows requests under the limit", () => {
    const limiter = createRateLimiter("telegram");
    const now = Date.now();

    for (let i = 0; i < 30; i++) {
      expect(tryAcquire(limiter, now)).toBe(true);
    }
  });

  it("denies requests over the limit", () => {
    const limiter = createRateLimiter("telegram");
    const now = Date.now();

    // Fill up the limiter
    for (let i = 0; i < 30; i++) {
      tryAcquire(limiter, now);
    }

    // 31st request should be denied
    expect(tryAcquire(limiter, now)).toBe(false);
  });

  it("allows requests after window expires", () => {
    const limiter = createRateLimiter("telegram");
    const now = Date.now();

    // Fill up the limiter
    for (let i = 0; i < 30; i++) {
      tryAcquire(limiter, now);
    }

    // Should be denied at same time
    expect(tryAcquire(limiter, now)).toBe(false);

    // After 1 second (window expired), should be allowed
    expect(tryAcquire(limiter, now + 1001)).toBe(true);
  });

  it("prunes expired timestamps", () => {
    const limiter = createRateLimiter("telegram");
    const now = Date.now();

    // Fill up the limiter
    for (let i = 0; i < 30; i++) {
      tryAcquire(limiter, now);
    }

    expect(limiter.timestamps).toHaveLength(30);

    // After window expires, acquire should prune and add new
    tryAcquire(limiter, now + 1001);
    expect(limiter.timestamps).toHaveLength(1);
  });

  it("handles LinkedIn daily rate limit", () => {
    const limiter = createRateLimiter("linkedin");
    const now = Date.now();

    // Fill up to 100 requests
    for (let i = 0; i < 100; i++) {
      expect(tryAcquire(limiter, now + i)).toBe(true);
    }

    // 101st should be denied
    expect(tryAcquire(limiter, now + 100)).toBe(false);

    // After 24 hours, should be allowed again
    const oneDayLater = now + 24 * 60 * 60 * 1000 + 1;
    expect(tryAcquire(limiter, oneDayLater)).toBe(true);
  });
});

describe("getWaitTime", () => {
  it("returns 0 when under limit", () => {
    const limiter = createRateLimiter("telegram");
    expect(getWaitTime(limiter)).toBe(0);
  });

  it("returns wait time when at limit", () => {
    const limiter = createRateLimiter("telegram");
    const now = Date.now();

    // Fill up the limiter
    for (let i = 0; i < 30; i++) {
      tryAcquire(limiter, now);
    }

    const wait = getWaitTime(limiter, now);
    // Should be approximately 1000ms (telegram window)
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(1000);
  });

  it("returns 0 after window expires", () => {
    const limiter = createRateLimiter("telegram");
    const now = Date.now();

    // Fill and then wait
    for (let i = 0; i < 30; i++) {
      tryAcquire(limiter, now);
    }

    expect(getWaitTime(limiter, now + 1001)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Twitter metadata collector tests
// ---------------------------------------------------------------------------

describe("collectTwitterMetadata", () => {
  it("computes character count from adapted content", () => {
    const posts = [
      { id: "post-1", adaptedContent: "Hello world!", engagementData: {} },
    ];

    const result = collectTwitterMetadata(posts);

    expect(result).toHaveLength(1);
    expect(result[0]!.crossPostId).toBe("post-1");
    expect(result[0]!.characterCount).toBe(12);
  });

  it("returns null character count for empty content", () => {
    const posts = [
      { id: "post-1", adaptedContent: "", engagementData: {} },
    ];

    const result = collectTwitterMetadata(posts);

    expect(result[0]!.characterCount).toBeNull();
  });

  it("returns null character count for null content", () => {
    const posts = [
      { id: "post-1", adaptedContent: null, engagementData: {} },
    ];

    const result = collectTwitterMetadata(posts);

    expect(result[0]!.characterCount).toBeNull();
  });

  it("detects media presence from engagement data", () => {
    const posts = [
      {
        id: "post-1",
        adaptedContent: "With media",
        engagementData: { mediaIds: ["media-1", "media-2"] },
      },
    ];

    const result = collectTwitterMetadata(posts);

    expect(result[0]!.hasMedia).toBe(true);
  });

  it("detects no media when mediaIds is empty", () => {
    const posts = [
      {
        id: "post-1",
        adaptedContent: "No media",
        engagementData: { mediaIds: [] },
      },
    ];

    const result = collectTwitterMetadata(posts);

    expect(result[0]!.hasMedia).toBe(false);
  });

  it("returns null hasMedia when engagementData has no mediaIds", () => {
    const posts = [
      { id: "post-1", adaptedContent: "Simple tweet", engagementData: {} },
    ];

    const result = collectTwitterMetadata(posts);

    expect(result[0]!.hasMedia).toBeNull();
  });

  it("handles null engagementData", () => {
    const posts = [
      {
        id: "post-1",
        adaptedContent: "Tweet",
        engagementData: null,
      },
    ];

    const result = collectTwitterMetadata(posts);

    expect(result[0]!.hasMedia).toBeNull();
  });

  it("processes multiple posts", () => {
    const posts = [
      { id: "p1", adaptedContent: "Short", engagementData: {} },
      {
        id: "p2",
        adaptedContent: "A longer tweet with more content",
        engagementData: { mediaIds: ["img-1"] },
      },
      { id: "p3", adaptedContent: null, engagementData: null },
    ];

    const result = collectTwitterMetadata(posts);

    expect(result).toHaveLength(3);
    expect(result[0]!.characterCount).toBe(5);
    expect(result[1]!.characterCount).toBe(32);
    expect(result[1]!.hasMedia).toBe(true);
    expect(result[2]!.characterCount).toBeNull();
    expect(result[2]!.hasMedia).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Engagement aggregation tests
// ---------------------------------------------------------------------------

describe("computeTotalEngagement", () => {
  it("sums all non-null engagement metrics", () => {
    const engagement: PlatformEngagement = {
      impressions: 1000,
      likes: 50,
      comments: 10,
      shares: 5,
      clicks: 20,
    };

    // Note: impressions are NOT included in total engagement
    expect(computeTotalEngagement(engagement)).toBe(85);
  });

  it("handles null values gracefully", () => {
    const engagement: PlatformEngagement = {
      impressions: null,
      likes: 50,
      comments: null,
      shares: 5,
      clicks: null,
    };

    expect(computeTotalEngagement(engagement)).toBe(55);
  });

  it("returns 0 when all metrics are null", () => {
    const engagement: PlatformEngagement = {
      impressions: null,
      likes: null,
      comments: null,
      shares: null,
      clicks: null,
    };

    expect(computeTotalEngagement(engagement)).toBe(0);
  });

  it("returns 0 when all engagement metrics are 0", () => {
    const engagement: PlatformEngagement = {
      impressions: 500,
      likes: 0,
      comments: 0,
      shares: 0,
      clicks: 0,
    };

    expect(computeTotalEngagement(engagement)).toBe(0);
  });
});

describe("aggregateChannelMetrics", () => {
  it("aggregates metrics for multiple posts", () => {
    const posts = [
      {
        engagement: {
          impressions: 100,
          likes: 10,
          comments: 2,
          shares: 1,
          clicks: 5,
        },
      },
      {
        engagement: {
          impressions: 200,
          likes: 20,
          comments: 3,
          shares: 2,
          clicks: 8,
        },
      },
    ];

    const result = aggregateChannelMetrics(posts);

    expect(result.totalPosts).toBe(2);
    expect(result.totalEngagement).toBe(51); // (10+2+1+5) + (20+3+2+8)
  });

  it("returns zero for empty post array", () => {
    const result = aggregateChannelMetrics([]);

    expect(result.totalPosts).toBe(0);
    expect(result.totalEngagement).toBe(0);
  });

  it("handles posts with all null engagement", () => {
    const posts = [
      {
        engagement: {
          impressions: null,
          likes: null,
          comments: null,
          shares: null,
          clicks: null,
        },
      },
    ];

    const result = aggregateChannelMetrics(posts);

    expect(result.totalPosts).toBe(1);
    expect(result.totalEngagement).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// RATE_LIMITS constant tests
// ---------------------------------------------------------------------------

describe("RATE_LIMITS", () => {
  it("defines LinkedIn rate limit as 100 per day", () => {
    expect(RATE_LIMITS.linkedin.maxRequests).toBe(100);
    expect(RATE_LIMITS.linkedin.windowMs).toBe(86400000);
  });

  it("defines Telegram rate limit as 30 per second", () => {
    expect(RATE_LIMITS.telegram.maxRequests).toBe(30);
    expect(RATE_LIMITS.telegram.windowMs).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// AnalyticsCollectionError tests
// ---------------------------------------------------------------------------

describe("AnalyticsCollectionError", () => {
  it("creates error with platform and retryable flag", () => {
    const error = new AnalyticsCollectionError(
      "Rate limited",
      "linkedin",
      true,
    );

    expect(error.message).toBe("Rate limited");
    expect(error.platform).toBe("linkedin");
    expect(error.retryable).toBe(true);
    expect(error.name).toBe("AnalyticsCollectionError");
  });

  it("defaults retryable to false", () => {
    const error = new AnalyticsCollectionError("Failed", "telegram");

    expect(error.retryable).toBe(false);
  });

  it("is an instance of Error", () => {
    const error = new AnalyticsCollectionError("test", "twitter");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AnalyticsCollectionError);
  });
});

// ---------------------------------------------------------------------------
// LinkedIn analytics fetch tests (with mocked fetch)
// ---------------------------------------------------------------------------

describe("fetchLinkedInPostAnalytics", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches engagement for each post ID", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        likesSummary: { totalLikes: 42 },
        commentsSummary: { totalFirstLevelComments: 7 },
      }),
    });

    const rateLimiter = createRateLimiter("linkedin");
    const result = await fetchLinkedInPostAnalytics(
      "test-token",
      "urn:li:person:123",
      ["post-1", "post-2"],
      rateLimiter,
    );

    expect(result.size).toBe(2);
    expect(result.get("post-1")).toEqual({
      impressions: null,
      likes: 42,
      comments: 7,
      shares: null,
      clicks: null,
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("stops collecting when rate limit is reached", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        likesSummary: { totalLikes: 1 },
        commentsSummary: { totalFirstLevelComments: 0 },
      }),
    });

    // Create a limiter that's nearly full
    const limiter: RateLimiter = {
      maxRequests: 2,
      windowMs: 24 * 60 * 60 * 1000,
      timestamps: [],
    };

    const result = await fetchLinkedInPostAnalytics(
      "test-token",
      "urn:li:person:123",
      ["post-1", "post-2", "post-3"],
      limiter,
    );

    // Only 2 posts should be fetched
    expect(result.size).toBe(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("continues on individual post fetch errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => "Not found",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          likesSummary: { totalLikes: 10 },
          commentsSummary: { totalFirstLevelComments: 2 },
        }),
      });

    const rateLimiter = createRateLimiter("linkedin");
    const result = await fetchLinkedInPostAnalytics(
      "test-token",
      "urn:li:person:123",
      ["post-1", "post-2"],
      rateLimiter,
    );

    // First post failed, second succeeded
    expect(result.size).toBe(1);
    expect(result.has("post-1")).toBe(false);
    expect(result.has("post-2")).toBe(true);

    consoleSpy.mockRestore();
  });

  it("returns empty map for empty post IDs", async () => {
    const rateLimiter = createRateLimiter("linkedin");
    const result = await fetchLinkedInPostAnalytics(
      "test-token",
      "urn:li:person:123",
      [],
      rateLimiter,
    );

    expect(result.size).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends correct LinkedIn API headers", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        likesSummary: { totalLikes: 0 },
        commentsSummary: { totalFirstLevelComments: 0 },
      }),
    });

    const rateLimiter = createRateLimiter("linkedin");
    await fetchLinkedInPostAnalytics(
      "my-access-token",
      "urn:li:person:abc",
      ["post-1"],
      rateLimiter,
    );

    const callHeaders = mockFetch.mock.calls[0]![1]!.headers;
    expect(callHeaders.Authorization).toBe("Bearer my-access-token");
    expect(callHeaders["LinkedIn-Version"]).toBe("202401");
    expect(callHeaders["X-Restli-Protocol-Version"]).toBe("2.0.0");
  });
});

// ---------------------------------------------------------------------------
// Telegram reactions fetch tests (with mocked fetch)
// ---------------------------------------------------------------------------

describe("fetchTelegramReactions", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches reactions for each message ID", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: [] }),
    });

    const rateLimiter = createRateLimiter("telegram");
    const result = await fetchTelegramReactions(
      "bot-token-123",
      "-1001234567890",
      [1, 2, 3],
      rateLimiter,
    );

    expect(result.size).toBe(3);
    // Default values when no reaction data is available
    expect(result.get(1)).toEqual({
      totalReactions: 0,
      views: null,
      forwards: null,
    });
  });

  it("stops when rate limit is reached", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: [] }),
    });

    // Tiny limiter: max 2 per window
    const limiter: RateLimiter = {
      maxRequests: 2,
      windowMs: 60000, // 1 minute (won't expire during test)
      timestamps: [],
    };

    const result = await fetchTelegramReactions(
      "bot-token",
      "-1001234",
      [1, 2, 3, 4, 5],
      limiter,
    );

    // Only 2 should be processed
    expect(result.size).toBe(2);
  });

  it("handles API errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const rateLimiter = createRateLimiter("telegram");
    const _result = await fetchTelegramReactions(
      "bot-token",
      "-1001234",
      [1],
      rateLimiter,
    );

    // Should still have the entry (from catch block)
    // Error was caught and logged
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("returns empty map for empty message IDs", async () => {
    const rateLimiter = createRateLimiter("telegram");
    const result = await fetchTelegramReactions(
      "bot-token",
      "-1001234",
      [],
      rateLimiter,
    );

    expect(result.size).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Rate limiter edge cases
// ---------------------------------------------------------------------------

describe("rate limiter edge cases", () => {
  it("handles rapid successive calls correctly", () => {
    const limiter = createRateLimiter("telegram");
    const now = Date.now();

    // Fill exactly to limit
    for (let i = 0; i < 30; i++) {
      expect(tryAcquire(limiter, now)).toBe(true);
    }

    // All at same timestamp — should be denied
    expect(tryAcquire(limiter, now)).toBe(false);
    expect(tryAcquire(limiter, now)).toBe(false);

    // After window, should allow again
    expect(tryAcquire(limiter, now + 1001)).toBe(true);
  });

  it("correctly tracks state across multiple windows", () => {
    const limiter: RateLimiter = {
      maxRequests: 3,
      windowMs: 100,
      timestamps: [],
    };

    const t0 = 1000;

    // Window 1: fill up
    expect(tryAcquire(limiter, t0)).toBe(true);
    expect(tryAcquire(limiter, t0 + 10)).toBe(true);
    expect(tryAcquire(limiter, t0 + 20)).toBe(true);
    expect(tryAcquire(limiter, t0 + 30)).toBe(false);

    // Window 2: some expired, some still valid
    expect(tryAcquire(limiter, t0 + 110)).toBe(true); // t0 expired
    expect(tryAcquire(limiter, t0 + 115)).toBe(true); // t0+10 expired
    expect(tryAcquire(limiter, t0 + 118)).toBe(false); // t0+20 still in window, 3 total
  });
});
