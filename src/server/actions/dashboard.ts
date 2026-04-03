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
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { getRemainingQuota } from "@/lib/billing/usage";
import type { ActionResult } from "@/server/actions/analytics";
import { getCurrentUser } from "@/lib/supabase/current-user";
import {
  elapsedMs,
  logHotRoutePerf,
  measurePerfStep,
  type PerfTimings,
} from "@/lib/perf/hot-routes";

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
  contentSummary: {
    draftsCount: number;
    ideasCount: number;
    publishedThisWeek: number;
  };
  recentActivity: ActivityEvent[];
  upcomingPosts: UpcomingPost[];
  engagementSparkline: EngagementPoint[];
};

// ─── Helper ───────────────────────────────────────────────────────────────────

// ─── Server Action ────────────────────────────────────────────────────────────

export async function getDashboardHomeData(): Promise<ActionResult<DashboardHomeData>> {
  const startedAt = performance.now();
  const timings: PerfTimings = {};

  try {
    const userInfo = await measurePerfStep(timings, "authMs", () => getCurrentUser());
    const userId = userInfo.id;
    const now = new Date();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      quota,
      connectedPlatformRows,
      scheduledRows,
      recentContent,
      recentTelegramPosts,
      failedSchedules,
      upcomingSchedules,
      sparklineRows,
      contentSummaryRow,
    ] = await Promise.all([
      measurePerfStep(timings, "quotaMs", () => getRemainingQuota(userId)),
      measurePerfStep(timings, "connectedPlatformsMs", () =>
        db
          .select({ platform: platformConnections.platform })
          .from(platformConnections)
          .where(eq(platformConnections.userId, userId)),
      ),
      measurePerfStep(timings, "scheduledRowsMs", () =>
        db
          .select({ id: schedules.id })
          .from(schedules)
          .where(
            and(
              eq(schedules.userId, userId),
              eq(schedules.status, "pending"),
              eq(schedules.targetType, "telegram_publish"),
            ),
          ),
      ),
      measurePerfStep(timings, "recentContentMs", () =>
        db
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
          .limit(25),
      ),
      measurePerfStep(timings, "recentTelegramPostsMs", () =>
        db
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
          .limit(25),
      ),
      measurePerfStep(timings, "failedSchedulesMs", () =>
        db
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
          .limit(25),
      ),
      measurePerfStep(timings, "upcomingSchedulesMs", () =>
        db
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
          .limit(5),
      ),
      measurePerfStep(timings, "engagementRowsMs", () =>
        db
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
          .where(and(eq(crossPosts.userId, userId), gte(crossPosts.createdAt, sevenDaysAgo))),
      ),
      measurePerfStep(timings, "contentSummaryMs", async () => {
        const [draftRows, ideaRows, publishedRows] = await Promise.all([
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(contentLibrary)
            .where(and(eq(contentLibrary.userId, userId), eq(contentLibrary.status, "draft")))
            .limit(1),
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(contentLibrary)
            .where(and(eq(contentLibrary.userId, userId), eq(contentLibrary.sourceType, "idea")))
            .limit(1),
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(contentLibrary)
            .where(
              and(
                eq(contentLibrary.userId, userId),
                eq(contentLibrary.status, "published"),
                gte(contentLibrary.createdAt, sevenDaysAgo),
              ),
            )
            .limit(1),
        ]);

        return {
          draftsCount: draftRows[0]?.count ?? 0,
          ideasCount: ideaRows[0]?.count ?? 0,
          publishedThisWeek: publishedRows[0]?.count ?? 0,
        };
      }),
    ]);

    const connectedPlatforms = connectedPlatformRows.length;
    const scheduledCount = scheduledRows.length;
    const weeklyEngagement = sparklineRows.reduce((acc, row) => {
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

    logHotRoutePerf("dashboard-data", {
      totalMs: elapsedMs(startedAt),
      timings,
      rows: {
        recentContent: recentContent.length,
        recentTelegramPosts: recentTelegramPosts.length,
        failedSchedules: failedSchedules.length,
        upcomingSchedules: upcomingSchedules.length,
        engagementRows: sparklineRows.length,
      },
    });

    return {
      success: true,
      data: {
        userEmail: userInfo.email,
        userName: userInfo.name,
        quickStats,
        contentSummary: {
          draftsCount: contentSummaryRow.draftsCount ?? 0,
          ideasCount: contentSummaryRow.ideasCount ?? 0,
          publishedThisWeek: contentSummaryRow.publishedThisWeek ?? 0,
        },
        recentActivity,
        upcomingPosts,
        engagementSparkline,
      },
    };
  } catch (error) {
    logHotRoutePerf("dashboard-data", {
      totalMs: elapsedMs(startedAt),
      timings,
      error: error instanceof Error ? error.message : "unknown",
    });

    const message = error instanceof Error ? error.message : "Failed to load dashboard data";
    return { success: false, error: message };
  }
}
