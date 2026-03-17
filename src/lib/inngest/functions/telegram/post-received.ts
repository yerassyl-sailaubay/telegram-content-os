/**
 * Inngest function: telegram/post.received
 *
 * Triggered when a new Telegram channel post is stored in the DB.
 * This is the entry point for downstream processing (content analysis,
 * cross-posting, notifications, etc.).
 */

import { inngest } from "@/lib/inngest/client";

const MIN_TEXT_POSTS_FOR_INITIAL_PROFILE = 8;
const MIN_NEW_TEXT_POSTS_FOR_REFRESH = 5;
const PROFILE_REFRESH_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export const telegramPostReceived = inngest.createFunction(
  {
    id: "telegram/post-received",
    retries: 3,
  },
  { event: "telegram/post.received" },
  async ({ event, step }) => {
    const { postId, channelId, telegramChatId, mediaGroupId, messageId } = event.data as {
      postId: string;
      channelId: string;
      telegramChatId: string;
      mediaGroupId: string | null;
      messageId: number;
    };

    // Step 1: Fetch the stored post to confirm it exists
    const post = await step.run("fetch-post", async () => {
      const { db } = await import("@/server/db");
      const { telegramPosts } = await import("@/server/db/schema");
      const { eq } = await import("drizzle-orm");

      const rows = await db
        .select()
        .from(telegramPosts)
        .where(eq(telegramPosts.id, postId))
        .limit(1);

      if (rows.length === 0) {
        throw new Error(`Post ${postId} not found in database`);
      }

      return {
        id: rows[0]!.id,
        channelId: rows[0]!.channelId,
        contentRaw: rows[0]!.contentRaw,
        mediaUrls: rows[0]!.mediaUrls,
        postedAt: rows[0]!.postedAt?.toISOString() ?? null,
      };
    });

    // Step 2: Log for observability
    await step.run("log-received", async () => {
      console.log(
        `[telegram/post.received] Post ${post.id} from channel ${channelId}` +
          ` (chat: ${telegramChatId}, msg: ${messageId}` +
          `${mediaGroupId ? `, album: ${mediaGroupId}` : ""})`,
      );
    });

    const profileRefreshDecision = await step.run("decide-profile-refresh", async () => {
      const { db } = await import("@/server/db");
      const { telegramChannels, channelProfiles, telegramPosts } =
        await import("@/server/db/schema");
      const { and, desc, eq, gt } = await import("drizzle-orm");

      const channelRows = await db
        .select({
          id: telegramChannels.id,
          userId: telegramChannels.userId,
        })
        .from(telegramChannels)
        .where(eq(telegramChannels.id, channelId))
        .limit(1);

      if (channelRows.length === 0) {
        return {
          shouldQueue: false,
          reason: "channel_not_found",
        } as const;
      }

      const channel = channelRows[0]!;

      const profileRows = await db
        .select({
          generatedAt: channelProfiles.generatedAt,
        })
        .from(channelProfiles)
        .where(eq(channelProfiles.channelId, channelId))
        .limit(1);

      if (profileRows.length === 0) {
        const rows = await db
          .select({ contentRaw: telegramPosts.contentRaw })
          .from(telegramPosts)
          .where(eq(telegramPosts.channelId, channelId))
          .orderBy(desc(telegramPosts.postedAt))
          .limit(MIN_TEXT_POSTS_FOR_INITIAL_PROFILE);

        const textPostCount = rows.filter(
          (row) => typeof row.contentRaw === "string" && row.contentRaw.trim().length > 0,
        ).length;

        if (textPostCount >= MIN_TEXT_POSTS_FOR_INITIAL_PROFILE) {
          return {
            shouldQueue: true,
            reason: "initial_profile",
            userId: channel.userId,
          } as const;
        }

        return {
          shouldQueue: false,
          reason: `initial_profile_waiting_${textPostCount}_of_${MIN_TEXT_POSTS_FOR_INITIAL_PROFILE}`,
        } as const;
      }

      const profile = profileRows[0]!;
      if (!profile.generatedAt) {
        return {
          shouldQueue: true,
          reason: "missing_generated_at",
          userId: channel.userId,
        } as const;
      }

      if (Date.now() - profile.generatedAt.getTime() < PROFILE_REFRESH_COOLDOWN_MS) {
        return {
          shouldQueue: false,
          reason: "cooldown_active",
        } as const;
      }

      const newRows = await db
        .select({ contentRaw: telegramPosts.contentRaw })
        .from(telegramPosts)
        .where(
          and(
            eq(telegramPosts.channelId, channelId),
            gt(telegramPosts.postedAt, profile.generatedAt),
          ),
        )
        .orderBy(desc(telegramPosts.postedAt))
        .limit(MIN_NEW_TEXT_POSTS_FOR_REFRESH);

      const newTextCount = newRows.filter(
        (row) => typeof row.contentRaw === "string" && row.contentRaw.trim().length > 0,
      ).length;

      if (newTextCount >= MIN_NEW_TEXT_POSTS_FOR_REFRESH) {
        return {
          shouldQueue: true,
          reason: "new_posts_threshold_met",
          userId: channel.userId,
          newTextCount,
        } as const;
      }

      return {
        shouldQueue: false,
        reason: `not_enough_new_posts_${newTextCount}_of_${MIN_NEW_TEXT_POSTS_FOR_REFRESH}`,
      } as const;
    });

    if (profileRefreshDecision.shouldQueue && profileRefreshDecision.userId) {
      await step.run("queue-profile-refresh", async () => {
        const { inngest } = await import("@/lib/inngest/client");
        await inngest.send({
          name: "ai/profile-channel",
          data: {
            channelId,
            userId: profileRefreshDecision.userId,
            mode: "auto",
          },
        });
      });
    }

    return {
      postId: post.id,
      channelId,
      processed: true,
      profileRefreshQueued: profileRefreshDecision.shouldQueue,
      profileRefreshReason: profileRefreshDecision.reason,
    };
  },
);
