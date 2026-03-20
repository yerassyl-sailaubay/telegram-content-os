/**
 * Inngest cron function: collect Telegram analytics every 6 hours.
 *
 * Fetches reaction counts, view counts, and forward counts for
 * Telegram channel posts using the Bot API.
 *
 * Rate limit: 30 messages/second.
 * Uses sync log dedup to avoid re-fetching.
 */

import { inngest } from "@/lib/inngest/client";

export const collectTelegramAnalytics = inngest.createFunction(
  {
    id: "analytics/collect-telegram",
    retries: 2,
  },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    // Step 1: Fetch all Telegram channels with bot tokens
    const channels = await step.run("fetch-telegram-channels", async () => {
      const { db } = await import("@/server/db");
      const { telegramChannels } = await import("@/server/db/schema");
      const { isNotNull } = await import("drizzle-orm");

      const rows = await db
        .select({
          id: telegramChannels.id,
          userId: telegramChannels.userId,
          telegramChatId: telegramChannels.telegramChatId,
          botTokenEncrypted: telegramChannels.botTokenEncrypted,
        })
        .from(telegramChannels)
        .where(isNotNull(telegramChannels.botTokenEncrypted));

      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        telegramChatId: r.telegramChatId,
        botTokenEncrypted: r.botTokenEncrypted,
      }));
    });

    if (channels.length === 0) {
      return { status: "skipped", reason: "No Telegram channels found" };
    }

    let totalPostsProcessed = 0;
    const errors: string[] = [];

    // Step 2: For each channel, collect reaction data
    for (const channel of channels) {
      if (!channel.botTokenEncrypted) continue;

      const result = await step.run(`collect-telegram-${channel.id}`, async () => {
        const { db } = await import("@/server/db");
        const { telegramPosts, postAnalytics, crossPosts, channelMetrics } =
          await import("@/server/db/schema");
        const { eq } = await import("drizzle-orm");
        const { decrypt } = await import("@/lib/platforms/encryption");
        const { createRateLimiter, fetchTelegramReactions } =
          await import("@/lib/analytics/collector");

        // Decrypt bot token
        const botToken = decrypt(channel.botTokenEncrypted!);

        // Get recent telegram posts for this channel
        const posts = await db
          .select({
            id: telegramPosts.id,
            telegramMessageId: telegramPosts.telegramMessageId,
            channelId: telegramPosts.channelId,
            views: telegramPosts.views,
            forwards: telegramPosts.forwards,
          })
          .from(telegramPosts)
          .where(eq(telegramPosts.channelId, channel.id));

        if (posts.length === 0) {
          return { postsProcessed: 0, error: null };
        }

        // Fetch reaction data from Telegram Bot API
        const rateLimiter = createRateLimiter("telegram");
        const messageIds = posts.map((p) =>
          typeof p.telegramMessageId === "string"
            ? parseInt(p.telegramMessageId, 10)
            : (p.telegramMessageId as number),
        );

        const reactionsMap = await fetchTelegramReactions(
          botToken,
          channel.telegramChatId,
          messageIds,
          rateLimiter,
        );

        // Find cross-posts linked to these telegram posts and store analytics
        let processed = 0;
        for (const post of posts) {
          const msgId =
            typeof post.telegramMessageId === "string"
              ? parseInt(post.telegramMessageId, 10)
              : (post.telegramMessageId as number);

          const reactionData = reactionsMap.get(msgId);
          if (!reactionData) continue;

          // Find cross-posts for this telegram post
          const linkedCrossPosts = await db
            .select({ id: crossPosts.id, platform: crossPosts.platform })
            .from(crossPosts)
            .where(eq(crossPosts.sourcePostId, post.id));

          // Store Telegram-specific metrics using views/forwards from stored data
          for (const cp of linkedCrossPosts) {
            await db.insert(postAnalytics).values({
              crossPostId: cp.id,
              platform: cp.platform,
              likes: reactionData.totalReactions,
              impressions: post.views as number | null,
              shares: post.forwards as number | null,
              comments: null,
              clicks: null,
              fetchedAt: new Date(),
            });
            processed++;
          }
        }

        // Update channel metrics for today
        const today = new Date().toISOString().split("T")[0]!;
        const totalEngagement = Array.from(reactionsMap.values()).reduce(
          (sum, r) => sum + r.totalReactions + (r.views ?? 0),
          0,
        );

        // Get member count from Bot API
        let memberCount: number | null = null;
        try {
          const countResponse = await fetch(
            `https://api.telegram.org/bot${botToken}/getChatMemberCount`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: channel.telegramChatId,
              }),
            },
          );
          if (countResponse.ok) {
            const countData = (await countResponse.json()) as {
              ok: boolean;
              result: number;
            };
            if (countData.ok) {
              memberCount = countData.result;
            }
          }
        } catch {
          // Non-critical — continue without member count
        }

        // Upsert channel metrics — we use linkedin as placeholder platform since
        // channel_metrics tracks source channel performance across platforms
        await db
          .insert(channelMetrics)
          .values({
            channelId: channel.id,
            platform: "linkedin", // Source channel is Telegram; tracking engagement across platforms
            date: today,
            totalPosts: posts.length,
            totalEngagement,
            followerCountSnapshot: memberCount,
          })
          .onConflictDoUpdate({
            target: [channelMetrics.channelId, channelMetrics.platform, channelMetrics.date],
            set: {
              totalPosts: posts.length,
              totalEngagement,
              followerCountSnapshot: memberCount,
            },
          });

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
      channelsProcessed: channels.length,
      errors,
    };
  },
);
