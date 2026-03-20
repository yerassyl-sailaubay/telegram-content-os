"use server";

import { db } from "@/server/db";
import {
  contentLibrary,
  crossPosts,
  schedules,
  postAnalytics,
  platformConnections,
  telegramPosts,
  telegramChannels,
} from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq, and, desc, gte } from "drizzle-orm";
import { getRemainingQuota } from "@/lib/billing/usage";
import type { ActionResult } from "@/server/actions/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityEventType = "created" | "scheduled" | "published" | "failed";

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
      .where(
        and(
          eq(schedules.userId, userId),
          eq(schedules.status, "pending"),
          eq(schedules.targetType, "telegram_publish"),
        ),
      );

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

    // ── Recent activity (content + telegram posts + failed schedules) ─────
    const recentContent = await db
      .select({
        id: contentLibrary.id,
        status: contentLibrary.status,
        title: contentLibrary.title,
        content: contentLibrary.content,
        createdAt: contentLibrary.createdAt,
        updatedAt: contentLibrary.updatedAt,
      })
      .from(contentLibrary)
      .where(eq(contentLibrary.userId, userId))
      .orderBy(desc(contentLibrary.updatedAt), desc(contentLibrary.createdAt))
      .limit(25);

    const contentActivity: ActivityEvent[] = recentContent
      .filter((row) => row.status !== "archived")
      .map((row) => {
        let type: ActivityEventType = "created";
        if (row.status === "published") type = "published";
        else if (row.status === "scheduled") type = "scheduled";

        const snippetSource = row.content?.trim() || row.title?.trim() || null;
        const snippet = snippetSource
          ? snippetSource.slice(0, 80) + (snippetSource.length > 80 ? "…" : "")
          : null;

        return {
          id: `content-${row.id}`,
          type,
          platform: "telegram",
          contentSnippet: snippet,
          timestamp: row.updatedAt ?? row.createdAt ?? new Date(),
        };
      });

    const recentTelegramPosts = await db
      .select({
        id: telegramPosts.id,
        contentRaw: telegramPosts.contentRaw,
        postedAt: telegramPosts.postedAt,
        createdAt: telegramPosts.createdAt,
      })
      .from(telegramPosts)
      .innerJoin(telegramChannels, eq(telegramChannels.id, telegramPosts.channelId))
      .where(eq(telegramChannels.userId, userId))
      .orderBy(desc(telegramPosts.postedAt), desc(telegramPosts.createdAt))
      .limit(25);

    const telegramActivity: ActivityEvent[] = recentTelegramPosts.map((row) => {
      const snippet = row.contentRaw
        ? row.contentRaw.slice(0, 80) + (row.contentRaw.length > 80 ? "…" : "")
        : null;
      return {
        id: `telegram-${row.id}`,
        type: "published",
        platform: "telegram",
        contentSnippet: snippet,
        timestamp: row.postedAt ?? row.createdAt ?? new Date(),
      };
    });

    const failedSchedules = await db
      .select({
        id: schedules.id,
        scheduledAt: schedules.scheduledAt,
        processedAt: schedules.processedAt,
        updatedAt: schedules.updatedAt,
        content: contentLibrary.content,
        title: contentLibrary.title,
      })
      .from(schedules)
      .leftJoin(contentLibrary, eq(contentLibrary.id, schedules.contentLibraryId))
      .where(
        and(
          eq(schedules.userId, userId),
          eq(schedules.targetType, "telegram_publish"),
          eq(schedules.status, "failed"),
        ),
      )
      .orderBy(desc(schedules.updatedAt))
      .limit(25);

    const failedScheduleActivity: ActivityEvent[] = failedSchedules.map((row) => {
      const snippetSource = row.content?.trim() || row.title?.trim() || null;
      const snippet = snippetSource
        ? snippetSource.slice(0, 80) + (snippetSource.length > 80 ? "…" : "")
        : null;
      return {
        id: `schedule-${row.id}`,
        type: "failed",
        platform: "telegram",
        contentSnippet: snippet,
        timestamp: row.updatedAt ?? row.processedAt ?? row.scheduledAt ?? new Date(),
      };
    });

    const recentActivity: ActivityEvent[] = [
      ...contentActivity,
      ...telegramActivity,
      ...failedScheduleActivity,
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    // ── Upcoming posts (next 5 scheduled) ────────────────────────────────
    const now = new Date();

    const upcomingSchedules = await db
      .select({
        id: schedules.id,
        scheduledAt: schedules.scheduledAt,
        content: contentLibrary.content,
        title: contentLibrary.title,
      })
      .from(schedules)
      .leftJoin(contentLibrary, eq(contentLibrary.id, schedules.contentLibraryId))
      .where(
        and(
          eq(schedules.userId, userId),
          eq(schedules.status, "pending"),
          eq(schedules.targetType, "telegram_publish"),
          gte(schedules.scheduledAt, now),
        ),
      )
      .orderBy(schedules.scheduledAt)
      .limit(5);

    const upcomingPosts: UpcomingPost[] = upcomingSchedules.map((sched) => {
      const snippetSource = sched.content?.trim() || sched.title?.trim() || null;
      const snippet = snippetSource
        ? snippetSource.slice(0, 60) + (snippetSource.length > 60 ? "…" : "")
        : null;

      return {
        id: sched.id,
        platform: "telegram",
        contentSnippet: snippet,
        scheduledAt: sched.scheduledAt,
      };
    });

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
