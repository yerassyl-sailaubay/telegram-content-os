/**
 * Inngest function: telegram/post.received
 *
 * Triggered when a new Telegram channel post is stored in the DB.
 * This is the entry point for downstream processing (content analysis,
 * cross-posting, notifications, etc.).
 */

import { inngest } from "@/lib/inngest/client";

export const telegramPostReceived = inngest.createFunction(
  {
    id: "telegram/post-received",
    retries: 3,
  },
  { event: "telegram/post.received" },
  async ({ event, step }) => {
    const { postId, channelId, telegramChatId, mediaGroupId, messageId } =
      event.data as {
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

    // Step 2: Log for observability (placeholder for future processing)
    await step.run("log-received", async () => {
      console.log(
        `[telegram/post.received] Post ${post.id} from channel ${channelId}` +
          ` (chat: ${telegramChatId}, msg: ${messageId}` +
          `${mediaGroupId ? `, album: ${mediaGroupId}` : ""})`,
      );
    });

    return {
      postId: post.id,
      channelId,
      processed: true,
    };
  },
);
