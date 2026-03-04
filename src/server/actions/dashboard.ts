"use server";

import { db } from "@/server/db";
import { crossPosts, schedules, postAnalytics, platformConnections } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq, and, desc, gte } from "drizzle-orm";
import { getRemainingQuota } from "@/lib/billing/usage";
import type { ActionResult } from "@/server/actions/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityEventType = "adapted" | "scheduled" | "published" | "failed";

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  platform: string;
  contentSnippet: string | null;
  timestamp: Date;
};

export type UpcomingPost = {
  id: string;
  platform: string;
  contentSnippet: string | null;
  scheduledAt: Date;
};

export type EngagementPoint = {
  date: string;
  total: number;
};

export type QuickStats = {
  crossPostsUsed: number;
  crossPostsLimit: number;
  scheduledCount: number;
  weeklyEngagement: number;
  connectedPlatforms: number;
};

export type DashboardHomeData = {
  userEmail: string | null;
  userName: string | null;
  quickStats: QuickStats;
  recentActivity: ActivityEvent[];
  upcomingPosts: UpcomingPost[];
  engagementSparkline: EngagementPoint[];
};

// ─── Helper ───────────────────────────────────────────────────────────────────

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

async function getCurrentUserInfo(): Promise<{
  id: string;
  email: string | null;
  name: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;

  return { id: user.id, email: user.email ?? null, name };
}

// ─── Server Action ────────────────────────────────────────────────────────────

export async function getDashboardHomeData(): Promise<ActionResult<DashboardHomeData>> {
  try {
    const userInfo = await getCurrentUserInfo();
    const userId = userInfo.id;

    // ── Quota info ────────────────────────────────────────────────────────
    const quota = await getRemainingQuota(userId);

    // ── Connected platforms ───────────────────────────────────────────────
    const connectedPlatformRows = await db
      .select({ platform: platformConnections.platform })
      .from(platformConnections)
      .where(eq(platformConnections.userId, userId));

    const connectedPlatforms = connectedPlatformRows.length;

    // ── Scheduled count (pending schedules) ───────────────────────────────
    const scheduledRows = await db
      .select({ id: schedules.id })
      .from(schedules)
      .where(and(eq(schedules.userId, userId), eq(schedules.status, "pending")));

    const scheduledCount = scheduledRows.length;

    // ── Weekly engagement (last 7 days) ───────────────────────────────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklyEngagementRows = await db
      .select({
        likes: postAnalytics.likes,
        comments: postAnalytics.comments,
        shares: postAnalytics.shares,
        clicks: postAnalytics.clicks,
      })
      .from(postAnalytics)
      .innerJoin(crossPosts, eq(postAnalytics.crossPostId, crossPosts.id))
      .where(and(eq(crossPosts.userId, userId), gte(crossPosts.createdAt, sevenDaysAgo)));

    const weeklyEngagement = weeklyEngagementRows.reduce((acc, row) => {
      return acc + (row.likes ?? 0) + (row.comments ?? 0) + (row.shares ?? 0) + (row.clicks ?? 0);
    }, 0);

    // ── Quick stats ───────────────────────────────────────────────────────
    const quickStats: QuickStats = {
      crossPostsUsed: quota.used,
      crossPostsLimit: isFinite(quota.limit) ? quota.limit : -1, // -1 = unlimited
      scheduledCount,
      weeklyEngagement,
      connectedPlatforms,
    };

    // ── Recent activity (last 10 cross-posts) ─────────────────────────────
    const recentCrossPosts = await db
      .select({
        id: crossPosts.id,
        status: crossPosts.status,
        platform: crossPosts.platform,
        adaptedContent: crossPosts.adaptedContent,
        createdAt: crossPosts.createdAt,
        postedAt: crossPosts.postedAt,
        scheduledFor: crossPosts.scheduledFor,
      })
      .from(crossPosts)
      .where(eq(crossPosts.userId, userId))
      .orderBy(desc(crossPosts.createdAt))
      .limit(10);

    const recentActivity: ActivityEvent[] = recentCrossPosts.map((row) => {
      let type: ActivityEventType = "adapted";
      if (row.status === "posted") type = "published";
      else if (row.status === "failed") type = "failed";
      else if (row.status === "scheduled") type = "scheduled";

      const snippet = row.adaptedContent
        ? row.adaptedContent.slice(0, 80) + (row.adaptedContent.length > 80 ? "…" : "")
        : null;

      return {
        id: row.id,
        type,
        platform: row.platform,
        contentSnippet: snippet,
        timestamp: row.postedAt ?? row.createdAt ?? new Date(),
      };
    });

    // ── Upcoming posts (next 5 scheduled) ────────────────────────────────
    const now = new Date();

    const upcomingSchedules = await db
      .select({
        id: schedules.id,
        scheduledAt: schedules.scheduledAt,
        crossPostId: schedules.crossPostId,
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.userId, userId),
          eq(schedules.status, "pending"),
          gte(schedules.scheduledAt, now),
        ),
      )
      .orderBy(schedules.scheduledAt)
      .limit(5);

    // Fetch cross post content for each upcoming schedule
    const upcomingPosts: UpcomingPost[] = [];
    for (const sched of upcomingSchedules) {
      if (!sched.crossPostId) continue;

      const crossPostRows = await db
        .select({
          platform: crossPosts.platform,
          adaptedContent: crossPosts.adaptedContent,
        })
        .from(crossPosts)
        .where(eq(crossPosts.id, sched.crossPostId))
        .limit(1);

      const cp = crossPostRows[0];
      const snippet = cp?.adaptedContent
        ? cp.adaptedContent.slice(0, 60) + (cp.adaptedContent.length > 60 ? "…" : "")
        : null;

      upcomingPosts.push({
        id: sched.id,
        platform: cp?.platform ?? "linkedin",
        contentSnippet: snippet,
        scheduledAt: sched.scheduledAt,
      });
    }

    // ── Engagement sparkline (last 7 days) ───────────────────────────────
    const sparklineMap = new Map<string, number>();

    // Pre-fill 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0]!;
      sparklineMap.set(key, 0);
    }

    // Re-query with dates for sparkline
    const sparklineRows = await db
      .select({
        postedAt: crossPosts.postedAt,
        createdAt: crossPosts.createdAt,
        likes: postAnalytics.likes,
        comments: postAnalytics.comments,
        shares: postAnalytics.shares,
        clicks: postAnalytics.clicks,
      })
      .from(postAnalytics)
      .innerJoin(crossPosts, eq(postAnalytics.crossPostId, crossPosts.id))
      .where(and(eq(crossPosts.userId, userId), gte(crossPosts.createdAt, sevenDaysAgo)));

    for (const row of sparklineRows) {
      const date = row.postedAt ?? row.createdAt;
      if (!date) continue;
      const key = date.toISOString().split("T")[0]!;
      if (!sparklineMap.has(key)) continue;
      const eng = (row.likes ?? 0) + (row.comments ?? 0) + (row.shares ?? 0) + (row.clicks ?? 0);
      sparklineMap.set(key, (sparklineMap.get(key) ?? 0) + eng);
    }

    const engagementSparkline: EngagementPoint[] = Array.from(sparklineMap.entries()).map(
      ([date, total]) => ({ date, total }),
    );

    return {
      success: true,
      data: {
        userEmail: userInfo.email,
        userName: userInfo.name,
        quickStats,
        recentActivity,
        upcomingPosts,
        engagementSparkline,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard data";
    return { success: false, error: message };
  }
}
