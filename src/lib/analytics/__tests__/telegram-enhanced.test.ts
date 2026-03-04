import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before vi.mock() factories
// ---------------------------------------------------------------------------

const mockDbSelect = vi.hoisted(() => vi.fn());
const mockDbFrom = vi.hoisted(() => vi.fn());
const mockDbWhere = vi.hoisted(() => vi.fn());
const mockDbOrderBy = vi.hoisted(() => vi.fn());
const mockDbLeftJoin = vi.hoisted(() => vi.fn());
const mockDbLimit = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      mockDbSelect(...args);
      return {
        from: (...fArgs: unknown[]) => {
          mockDbFrom(...fArgs);
          return {
            where: (...wArgs: unknown[]) => {
              mockDbWhere(...wArgs);
              return {
                orderBy: (...oArgs: unknown[]) => {
                  mockDbOrderBy(...oArgs);
                  return mockDbLimit();
                },
                limit: (...lArgs: unknown[]) => {
                  mockDbLimit(...lArgs);
                  return mockDbOrderBy();
                },
              };
            },
            leftJoin: (...jArgs: unknown[]) => {
              mockDbLeftJoin(...jArgs);
              return {
                where: (...wArgs: unknown[]) => {
                  mockDbWhere(...wArgs);
                  return {
                    orderBy: (...oArgs: unknown[]) => {
                      mockDbOrderBy(...oArgs);
                      return mockDbLimit();
                    },
                  };
                },
              };
            },
            orderBy: (...oArgs: unknown[]) => {
              mockDbOrderBy(...oArgs);
              return mockDbLimit();
            },
          };
        },
      };
    },
  },
}));

vi.mock("@/server/db/schema", () => ({
  channelMetrics: {
    channelId: "channel_id",
    platform: "platform",
    date: "date",
    followerCountSnapshot: "follower_count_snapshot",
    totalPosts: "total_posts",
    totalEngagement: "total_engagement",
  },
  telegramPosts: {
    channelId: "channel_id",
    views: "views",
    forwards: "forwards",
    reactions: "reactions",
    postedAt: "posted_at",
    contentRaw: "content_raw",
    id: "id",
  },
  postAnalytics: {
    crossPostId: "cross_post_id",
    impressions: "impressions",
    likes: "likes",
    comments: "comments",
    shares: "shares",
    clicks: "clicks",
  },
  crossPosts: {
    telegramPostId: "telegram_post_id",
    id: "id",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  gte: vi.fn((...args: unknown[]) => ({ type: "gte", args })),
  lte: vi.fn((...args: unknown[]) => ({ type: "lte", args })),
  desc: vi.fn((...args: unknown[]) => ({ type: "desc", args })),
  asc: vi.fn((...args: unknown[]) => ({ type: "asc", args })),
  sql: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import functions under test (after mocks)
// ---------------------------------------------------------------------------

import {
  getChannelGrowthRate,
  getBestPostingTimes,
  getContentPerformance,
} from "../telegram-enhanced";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function resetMocks() {
  mockDbSelect.mockClear();
  mockDbFrom.mockClear();
  mockDbWhere.mockClear();
  mockDbOrderBy.mockClear();
  mockDbLeftJoin.mockClear();
  mockDbLimit.mockClear();
}

// ---------------------------------------------------------------------------
// getChannelGrowthRate tests
// ---------------------------------------------------------------------------

describe("getChannelGrowthRate", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("calculates growth rate from subscriber data points", async () => {
    const mockData = [
      { date: "2026-02-01", followerCountSnapshot: 100 },
      { date: "2026-02-08", followerCountSnapshot: 103 },
      { date: "2026-02-15", followerCountSnapshot: 107 },
      { date: "2026-02-22", followerCountSnapshot: 110 },
    ];

    mockDbLimit.mockResolvedValueOnce(mockData);

    const result = await getChannelGrowthRate("channel-1", {
      start: new Date("2026-02-01"),
      end: new Date("2026-02-28"),
    });

    expect(result.rate).toBe(10); // (110 - 100) / 100 * 100 = 10%
    expect(result.trend).toBe("up");
    expect(result.dataPoints).toHaveLength(4);
    expect(result.dataPoints[0]).toEqual({
      date: "2026-02-01",
      subscribers: 100,
    });
    expect(result.dataPoints[3]).toEqual({
      date: "2026-02-22",
      subscribers: 110,
    });
  });

  it("returns defaults for empty data", async () => {
    mockDbLimit.mockResolvedValueOnce([]);

    const result = await getChannelGrowthRate("channel-1", {
      start: new Date("2026-02-01"),
      end: new Date("2026-02-28"),
    });

    expect(result.rate).toBe(0);
    expect(result.trend).toBe("stable");
    expect(result.dataPoints).toEqual([]);
  });

  it("handles zero starting subscribers (avoids division by zero)", async () => {
    const mockData = [
      { date: "2026-02-01", followerCountSnapshot: 0 },
      { date: "2026-02-15", followerCountSnapshot: 50 },
    ];

    mockDbLimit.mockResolvedValueOnce(mockData);

    const result = await getChannelGrowthRate("channel-1", {
      start: new Date("2026-02-01"),
      end: new Date("2026-02-28"),
    });

    expect(result.rate).toBe(0);
    expect(result.trend).toBe("stable");
    expect(result.dataPoints).toHaveLength(2);
  });

  it("detects downward trend", async () => {
    const mockData = [
      { date: "2026-02-01", followerCountSnapshot: 200 },
      { date: "2026-02-15", followerCountSnapshot: 180 },
    ];

    mockDbLimit.mockResolvedValueOnce(mockData);

    const result = await getChannelGrowthRate("channel-1", {
      start: new Date("2026-02-01"),
      end: new Date("2026-02-28"),
    });

    expect(result.rate).toBe(-10); // (180 - 200) / 200 * 100 = -10%
    expect(result.trend).toBe("down");
  });

  it("detects stable trend for single data point", async () => {
    const mockData = [{ date: "2026-02-01", followerCountSnapshot: 100 }];

    mockDbLimit.mockResolvedValueOnce(mockData);

    const result = await getChannelGrowthRate("channel-1", {
      start: new Date("2026-02-01"),
      end: new Date("2026-02-28"),
    });

    expect(result.rate).toBe(0);
    expect(result.trend).toBe("stable");
    expect(result.dataPoints).toHaveLength(1);
  });

  it("handles null followerCountSnapshot values", async () => {
    const mockData = [
      { date: "2026-02-01", followerCountSnapshot: null },
      { date: "2026-02-15", followerCountSnapshot: 100 },
    ];

    mockDbLimit.mockResolvedValueOnce(mockData);

    const result = await getChannelGrowthRate("channel-1", {
      start: new Date("2026-02-01"),
      end: new Date("2026-02-28"),
    });

    expect(result.trend).toBe("stable");
    expect(result.dataPoints).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getBestPostingTimes tests
// ---------------------------------------------------------------------------

describe("getBestPostingTimes", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("identifies best posting hours and days from data", async () => {
    const mockPosts = [
      { postedAt: new Date("2026-02-03T10:00:00Z"), views: 500 },
      { postedAt: new Date("2026-02-03T10:30:00Z"), views: 600 },
      { postedAt: new Date("2026-02-03T14:00:00Z"), views: 300 },
      { postedAt: new Date("2026-02-05T10:00:00Z"), views: 700 },
      { postedAt: new Date("2026-02-05T18:00:00Z"), views: 200 },
      { postedAt: new Date("2026-02-07T09:00:00Z"), views: 100 },
    ];

    mockDbLimit.mockResolvedValueOnce(mockPosts);

    const result = await getBestPostingTimes("channel-1");

    expect(result.bestHours).toBeDefined();
    expect(Array.isArray(result.bestHours)).toBe(true);
    expect(result.bestHours.length).toBeGreaterThan(0);
    expect(result.bestHours).toContain(10);

    expect(result.bestDays).toBeDefined();
    expect(Array.isArray(result.bestDays)).toBe(true);
    expect(result.bestDays.length).toBeGreaterThan(0);

    expect(result.heatmap).toBeDefined();
    expect(Array.isArray(result.heatmap)).toBe(true);
    expect(result.heatmap.length).toBeGreaterThan(0);

    const entry = result.heatmap[0]!;
    expect(entry).toHaveProperty("hour");
    expect(entry).toHaveProperty("day");
    expect(entry).toHaveProperty("avgViews");
  });

  it("returns empty arrays for no data", async () => {
    mockDbLimit.mockResolvedValueOnce([]);

    const result = await getBestPostingTimes("channel-1");

    expect(result.bestHours).toEqual([]);
    expect(result.bestDays).toEqual([]);
    expect(result.heatmap).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getContentPerformance tests
// ---------------------------------------------------------------------------

describe("getContentPerformance", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("returns post performance data with top post and averages", async () => {
    const mockPosts = [
      {
        id: "post-1",
        contentRaw: "First post content",
        postedAt: new Date("2026-02-10"),
        views: 500,
        forwards: 10,
        reactions: { "👍": 20, "❤️": 5 },
      },
      {
        id: "post-2",
        contentRaw: "Second post content",
        postedAt: new Date("2026-02-12"),
        views: 1000,
        forwards: 25,
        reactions: { "👍": 50, "🔥": 15 },
      },
      {
        id: "post-3",
        contentRaw: "Third post content",
        postedAt: new Date("2026-02-14"),
        views: 300,
        forwards: 5,
        reactions: { "👍": 8 },
      },
    ];

    mockDbLimit.mockResolvedValueOnce(mockPosts);

    const result = await getContentPerformance("channel-1", {
      start: new Date("2026-02-01"),
      end: new Date("2026-02-28"),
    });

    expect(result.posts).toHaveLength(3);
    expect(result.avgViews).toBe(600); // (500 + 1000 + 300) / 3
    expect(result.avgReactions).toBeCloseTo(32.67, 1); // (25 + 65 + 8) / 3

    expect(result.topPost).toBeDefined();
    expect(result.topPost!.id).toBe("post-2");
    expect(result.topPost!.views).toBe(1000);
  });

  it("returns defaults for empty data", async () => {
    mockDbLimit.mockResolvedValueOnce([]);

    const result = await getContentPerformance("channel-1", {
      start: new Date("2026-02-01"),
      end: new Date("2026-02-28"),
    });

    expect(result.posts).toEqual([]);
    expect(result.topPost).toBeNull();
    expect(result.avgViews).toBe(0);
    expect(result.avgReactions).toBe(0);
  });

  it("handles posts with zero views and null reactions", async () => {
    const mockPosts = [
      {
        id: "post-1",
        contentRaw: "Some content",
        postedAt: new Date("2026-02-10"),
        views: 0,
        forwards: 0,
        reactions: null,
      },
    ];

    mockDbLimit.mockResolvedValueOnce(mockPosts);

    const result = await getContentPerformance("channel-1", {
      start: new Date("2026-02-01"),
      end: new Date("2026-02-28"),
    });

    expect(result.posts).toHaveLength(1);
    expect(result.avgViews).toBe(0);
    expect(result.avgReactions).toBe(0);
    expect(result.topPost).toBeDefined();
    expect(result.topPost!.totalReactions).toBe(0);
  });
});
