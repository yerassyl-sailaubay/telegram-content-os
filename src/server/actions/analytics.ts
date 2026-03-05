"use server";

import { db } from "@/server/db";
import {
  postAnalytics,
  crossPosts,
  channelMetrics,
  telegramChannels,
} from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq, and, desc, gte, sql, count } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type DateRange = "7d" | "30d" | "90d";

export type OverviewMetrics = {
  totalCrossPosts: number;
  totalEngagement: number;
  avgEngagementRate: number;
  activePlatforms: number;
};

export type EngagementDataPoint = {
  date: string;
  linkedin: number;
  twitter: number;
  total: number;
};

export type PlatformComparisonData = {
  platform: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  totalEngagement: number;
};

export type HeatmapCell = {
  day: number; // 0=Mon, 6=Sun
  hour: number; // 0-23
  value: number;
};

export type RecentPostRow = {
  id: string;
  platform: string;
  adaptedContent: string | null;
  status: string | null;
  postedAt: Date | null;
  createdAt: Date | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
  totalEngagement: number;
};

export type ChannelOption = {
  id: string;
  title: string;
  username: string | null;
};

export type AnalyticsDashboardData = {
  overview: OverviewMetrics;
  engagementOverTime: EngagementDataPoint[];
  platformComparison: PlatformComparisonData[];
  heatmap: HeatmapCell[];
  recentPosts: RecentPostRow[];
  channels: ChannelOption[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user.id;
}

function getDateRangeStart(range: DateRange): Date {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

// ─── Server Actions ──────────────────────────────────────────────────────────

export async function getAnalyticsDashboard(
  range: DateRange = "30d",
  channelId?: string,
): Promise<ActionResult<AnalyticsDashboardData>> {
  try {
    const userId = await getCurrentUserId();
    const rangeStart = getDateRangeStart(range);

    // Get all user's channels for the dropdown
    const userChannels = await db
      .select({
        id: telegramChannels.id,
        title: telegramChannels.title,
        username: telegramChannels.username,
      })
      .from(telegramChannels)
      .where(eq(telegramChannels.userId, userId))
      .orderBy(telegramChannels.title);

    // Fetch cross-posts with analytics in range
    const crossPostsWithAnalytics = await db
      .select({
        id: crossPosts.id,
        platform: crossPosts.platform,
        adaptedContent: crossPosts.adaptedContent,
        status: crossPosts.status,
        postedAt: crossPosts.postedAt,
        createdAt: crossPosts.createdAt,
        impressions: postAnalytics.impressions,
        likes: postAnalytics.likes,
        comments: postAnalytics.comments,
        shares: postAnalytics.shares,
        clicks: postAnalytics.clicks,
      })
      .from(crossPosts)
      .leftJoin(postAnalytics, eq(postAnalytics.crossPostId, crossPosts.id))
      .where(
        and(
          eq(crossPosts.userId, userId),
          gte(crossPosts.createdAt, rangeStart),
        ),
      )
      .orderBy(desc(crossPosts.createdAt))
      .limit(200);

    // ── Overview metrics ──────────────────────────────────────────────────
    const totalCrossPosts = crossPostsWithAnalytics.length;

    let totalEngagement = 0;
    let totalImpressions = 0;
    const platformsUsed = new Set<string>();

    for (const row of crossPostsWithAnalytics) {
      const eng =
        (row.likes ?? 0) +
        (row.comments ?? 0) +
        (row.shares ?? 0) +
        (row.clicks ?? 0);
      totalEngagement += eng;
      totalImpressions += row.impressions ?? 0;
      platformsUsed.add(row.platform);
    }

    const avgEngagementRate =
      totalImpressions > 0
        ? Math.round((totalEngagement / totalImpressions) * 10000) / 100
        : 0;

    const overview: OverviewMetrics = {
      totalCrossPosts,
      totalEngagement,
      avgEngagementRate,
      activePlatforms: platformsUsed.size,
    };

    // ── Engagement over time ──────────────────────────────────────────────
    const engagementMap = new Map<string, { linkedin: number; twitter: number }>();

    // Pre-fill all dates in range
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      engagementMap.set(key, { linkedin: 0, twitter: 0 });
    }

    for (const row of crossPostsWithAnalytics) {
      const dateKey = (row.postedAt ?? row.createdAt)
        ?.toISOString()
        .split("T")[0];
      if (!dateKey) continue;
      const entry = engagementMap.get(dateKey);
      if (!entry) continue;
      const eng =
        (row.likes ?? 0) +
        (row.comments ?? 0) +
        (row.shares ?? 0) +
        (row.clicks ?? 0);
      if (row.platform === "linkedin") entry.linkedin += eng;
      else if (row.platform === "twitter") entry.twitter += eng;
    }

    const engagementOverTime: EngagementDataPoint[] = Array.from(
      engagementMap.entries(),
    ).map(([date, v]) => ({
      date,
      linkedin: v.linkedin,
      twitter: v.twitter,
      total: v.linkedin + v.twitter,
    }));

    // ── Platform comparison ───────────────────────────────────────────────
    const platformStats = new Map<
      string,
      {
        impressions: number;
        likes: number;
        comments: number;
        shares: number;
        clicks: number;
      }
    >();

    for (const row of crossPostsWithAnalytics) {
      const existing = platformStats.get(row.platform) ?? {
        impressions: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        clicks: 0,
      };
      existing.impressions += row.impressions ?? 0;
      existing.likes += row.likes ?? 0;
      existing.comments += row.comments ?? 0;
      existing.shares += row.shares ?? 0;
      existing.clicks += row.clicks ?? 0;
      platformStats.set(row.platform, existing);
    }

    const platformComparison: PlatformComparisonData[] = Array.from(
      platformStats.entries(),
    ).map(([platform, stats]) => ({
      platform,
      ...stats,
      totalEngagement:
        stats.likes + stats.comments + stats.shares + stats.clicks,
    }));

    // ── Heatmap (best posting times) ──────────────────────────────────────
    // Indexed by [day][hour] where day=0 Mon, hour=0-23
    const heatGrid: number[][] = Array.from({ length: 7 }, () =>
      Array(24).fill(0),
    );

    for (const row of crossPostsWithAnalytics) {
      const date = row.postedAt ?? row.createdAt;
      if (!date) continue;
      const dayOfWeek = (date.getDay() + 6) % 7; // convert Sun=0 to Mon=0
      const hour = date.getHours();
      const eng =
        (row.likes ?? 0) +
        (row.comments ?? 0) +
        (row.shares ?? 0) +
        (row.clicks ?? 0);
      heatGrid[dayOfWeek][hour] += eng;
    }

    const heatmap: HeatmapCell[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        heatmap.push({ day, hour, value: heatGrid[day][hour] });
      }
    }

    // ── Recent posts ──────────────────────────────────────────────────────
    const recentPosts: RecentPostRow[] = crossPostsWithAnalytics
      .slice(0, 20)
      .map((row) => ({
        id: row.id,
        platform: row.platform,
        adaptedContent: row.adaptedContent,
        status: row.status,
        postedAt: row.postedAt,
        createdAt: row.createdAt,
        impressions: row.impressions,
        likes: row.likes,
        comments: row.comments,
        shares: row.shares,
        clicks: row.clicks,
        totalEngagement:
          (row.likes ?? 0) +
          (row.comments ?? 0) +
          (row.shares ?? 0) +
          (row.clicks ?? 0),
      }));

    const channels: ChannelOption[] = userChannels.map((c) => ({
      id: c.id,
      title: c.title ?? "Untitled",
      username: c.username,
    }));

    return {
      success: true,
      data: {
        overview,
        engagementOverTime,
        platformComparison,
        heatmap,
        recentPosts,
        channels,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load analytics data";
    return { success: false, error: message };
  }
}

export async function getOverviewMetrics(
  range: DateRange = "30d",
): Promise<ActionResult<OverviewMetrics>> {
  const result = await getAnalyticsDashboard(range);
  if (!result.success) return result;
  return { success: true, data: result.data.overview };
}
