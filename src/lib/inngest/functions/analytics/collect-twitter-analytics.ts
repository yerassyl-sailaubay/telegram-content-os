/**
 * Inngest cron function: collect Twitter post metadata every 6 hours.
 *
 * Since Twitter Free tier is write-only (no analytics endpoints),
 * this function ONLY stores metadata about posted tweets:
 * - Character count
 * - Whether the post has media
 *
 * NO engagement metrics are fetched. This is intentional.
 */

import { inngest } from "@/lib/inngest/client";

export const collectTwitterAnalytics = inngest.createFunction(
  {
    id: "analytics/collect-twitter",
    retries: 2,
  },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    // Step 1: Fetch all Twitter cross-posts that are posted but lack analytics
    const result = await step.run("collect-twitter-metadata", async () => {
      const { db } = await import("@/server/db");
      const { crossPosts, postAnalytics } = await import(
        "@/server/db/schema"
      );
      const { eq, and } = await import("drizzle-orm");
      const { collectTwitterMetadata } = await import(
        "@/lib/analytics/collector"
      );

      // Get posted Twitter cross-posts that don't have analytics yet
      const posts = await db
        .select({
          id: crossPosts.id,
          adaptedContent: crossPosts.adaptedContent,
          engagementData: crossPosts.engagementData,
        })
        .from(crossPosts)
        .where(
          and(
            eq(crossPosts.platform, "twitter"),
            eq(crossPosts.status, "posted"),
          ),
        );

      if (posts.length === 0) {
        return { postsProcessed: 0 };
      }

      // Filter out posts that already have analytics records
      const existingAnalytics = await db
        .select({ crossPostId: postAnalytics.crossPostId })
        .from(postAnalytics)
        .where(eq(postAnalytics.platform, "twitter"));

      const existingIds = new Set(
        existingAnalytics.map((a) => a.crossPostId),
      );
      const newPosts = posts.filter((p) => !existingIds.has(p.id));

      if (newPosts.length === 0) {
        return { postsProcessed: 0 };
      }

      // Collect metadata (pure function — no API calls needed)
      const metadata = collectTwitterMetadata(newPosts);

      // Store in post_analytics table
      for (const item of metadata) {
        await db.insert(postAnalytics).values({
          crossPostId: item.crossPostId,
          platform: "twitter",
          // Twitter Free tier: NO engagement metrics
          impressions: null,
          likes: null,
          comments: null,
          shares: null,
          clicks: null,
          characterCount: item.characterCount,
          hasMedia: item.hasMedia,
          fetchedAt: new Date(),
        });
      }

      return { postsProcessed: metadata.length };
    });

    return {
      status: "completed",
      postsProcessed: result.postsProcessed,
      note: "Twitter Free tier: metadata only, no engagement metrics",
    };
  },
);
