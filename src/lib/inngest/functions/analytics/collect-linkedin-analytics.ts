/**
 * Inngest cron function: collect LinkedIn analytics every 6 hours.
 *
 * Fetches engagement data (likes, comments) for LinkedIn cross-posts
 * that have been posted. Uses sync log dedup to avoid re-fetching.
 *
 * Rate limit: 100 LinkedIn API requests per day.
 */

import { inngest } from "@/lib/inngest/client";

export const collectLinkedInAnalytics = inngest.createFunction(
  {
    id: "analytics/collect-linkedin",
    retries: 2,
  },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    // Step 1: Fetch all users with LinkedIn connections
    const connections = await step.run("fetch-linkedin-connections", async () => {
      const { db } = await import("@/server/db");
      const { platformConnections } = await import("@/server/db/schema");
      const { eq, and, isNotNull } = await import("drizzle-orm");

      // Get all LinkedIn connections with posted cross-posts
      const rows = await db
        .select({
          connectionId: platformConnections.id,
          userId: platformConnections.userId,
          accessTokenEncrypted: platformConnections.accessTokenEncrypted,
          refreshTokenEncrypted: platformConnections.refreshTokenEncrypted,
          platformUserId: platformConnections.platformUserId,
        })
        .from(platformConnections)
        .where(
          and(
            eq(platformConnections.platform, "linkedin"),
            isNotNull(platformConnections.accessTokenEncrypted),
            isNotNull(platformConnections.platformUserId),
          ),
        );

      return rows.map((r) => ({
        connectionId: r.connectionId,
        userId: r.userId,
        accessTokenEncrypted: r.accessTokenEncrypted,
        platformUserId: r.platformUserId,
      }));
    });

    if (connections.length === 0) {
      return { status: "skipped", reason: "No LinkedIn connections found" };
    }

    let totalPostsProcessed = 0;
    const errors: string[] = [];

    // Step 2: For each connection, collect analytics
    for (const conn of connections) {
      if (!conn.accessTokenEncrypted || !conn.platformUserId) continue;

      const result = await step.run(`collect-linkedin-${conn.userId}`, async () => {
        const { db } = await import("@/server/db");
        const { crossPosts, postAnalytics } = await import("@/server/db/schema");
        const { eq, and, isNotNull } = await import("drizzle-orm");
        const { decrypt } = await import("@/lib/platforms/encryption");
        const { createRateLimiter, fetchLinkedInPostAnalytics, hasSyncedWindow, recordSyncWindow } =
          await import("@/lib/analytics/collector");

        // Define sync window: last 6 hours
        const windowEnd = new Date();
        const windowStart = new Date(windowEnd.getTime() - 6 * 60 * 60 * 1000);

        // Check if this window was already synced
        const alreadySynced = await hasSyncedWindow(
          db,
          conn.userId,
          "linkedin",
          windowStart,
          windowEnd,
        );

        if (alreadySynced) {
          return { postsProcessed: 0, error: null };
        }

        // Get posted LinkedIn cross-posts with platformPostId
        const posts = await db
          .select({
            id: crossPosts.id,
            platformPostId: crossPosts.platformPostId,
          })
          .from(crossPosts)
          .where(
            and(
              eq(crossPosts.userId, conn.userId),
              eq(crossPosts.platform, "linkedin"),
              eq(crossPosts.status, "posted"),
              isNotNull(crossPosts.platformPostId),
            ),
          );

        if (posts.length === 0) {
          await recordSyncWindow(db, conn.userId, "linkedin", windowStart, windowEnd);
          return { postsProcessed: 0, error: null };
        }

        // Decrypt token
        const accessToken = decrypt(conn.accessTokenEncrypted!);
        const personUrn = `urn:li:person:${conn.platformUserId}`;

        // Fetch analytics with rate limiting
        const rateLimiter = createRateLimiter("linkedin");
        const postIds = posts
          .map((p) => p.platformPostId)
          .filter((id): id is string => id !== null);

        const analyticsMap = await fetchLinkedInPostAnalytics(
          accessToken,
          personUrn,
          postIds,
          rateLimiter,
        );

        // Store results in post_analytics table
        let processed = 0;
        for (const post of posts) {
          if (!post.platformPostId) continue;
          const engagement = analyticsMap.get(post.platformPostId);
          if (!engagement) continue;

          await db.insert(postAnalytics).values({
            crossPostId: post.id,
            platform: "linkedin",
            impressions: engagement.impressions,
            likes: engagement.likes,
            comments: engagement.comments,
            shares: engagement.shares,
            clicks: engagement.clicks,
            fetchedAt: new Date(),
          });

          processed++;
        }

        // Record sync window
        await recordSyncWindow(db, conn.userId, "linkedin", windowStart, windowEnd);

        return { postsProcessed: processed, error: null };
      });

      totalPostsProcessed += result.postsProcessed;
      if (result.error) {
        errors.push(result.error);
      }
    }

    return {
      status: "completed",
      totalPostsProcessed,
      connectionsProcessed: connections.length,
      errors,
    };
  },
);
