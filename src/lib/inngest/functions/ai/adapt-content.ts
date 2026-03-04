/**
 * Inngest function: ai/adapt-content
 *
 * Triggered to adapt a Telegram post for a target platform (LinkedIn/Twitter).
 * Pipeline: fetch post → parse content → fetch channel profile → AI adapt → store result.
 *
 * Event data:
 *   - postId: UUID of the telegram_posts record
 *   - userId: UUID of the user requesting adaptation
 *   - platform: target platform ("linkedin" | "twitter")
 *   - channelId?: optional UUID to fetch channel_profile for tone matching
 *   - modelTier?: optional model tier ("default" | "fast" | "pro")
 */

import { inngest } from "@/lib/inngest/client";

// ---------------------------------------------------------------------------
// Event type
// ---------------------------------------------------------------------------

interface AdaptContentEvent {
  data: {
    postId: string;
    userId: string;
    platform: "linkedin" | "twitter";
    channelId?: string;
    modelTier?: "default" | "fast" | "pro";
  };
}

// ---------------------------------------------------------------------------
// Function
// ---------------------------------------------------------------------------

export const adaptContent = inngest.createFunction(
  {
    id: "ai/adapt-content",
    retries: 2,
  },
  { event: "ai/content.adapt" },
  async ({ event, step }) => {
    const { postId, userId, platform, channelId, modelTier } = (event as AdaptContentEvent).data;

    // Step 1: Fetch the telegram post
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
        throw new Error(`Telegram post ${postId} not found`);
      }

      const row = rows[0]!;
      return {
        id: row.id,
        channelId: row.channelId,
        contentRaw: row.contentRaw,
        contentParsed: row.contentParsed,
        mediaUrls: row.mediaUrls,
      };
    });

    // Step 2: Parse content (use cached contentParsed or parse from raw)
    const parsedContent = await step.run("parse-content", async () => {
      // If already parsed, use it
      if (post.contentParsed) {
        // contentParsed is stored as jsonb, cast to ParsedContent shape
        return post.contentParsed as {
          blocks: Array<{
            type: string;
            text: string;
            url?: string;
            language?: string;
            mediaType?: string;
            mediaUrl?: string;
          }>;
          metadata: {
            hasMedia: boolean;
            hasLinks: boolean;
            hasFormatting: boolean;
            hasMentions: boolean;
            hasHashtags: boolean;
            language: string;
            charCount: number;
            wordCount: number;
          };
        };
      }

      // Otherwise parse from raw content
      if (!post.contentRaw) {
        throw new Error(`Post ${postId} has no raw content or parsed content`);
      }

      const { parseTelegramMessage } = await import("@/lib/telegram/parser");

      // Parse as a simple text message
      return parseTelegramMessage({
        message_id: 0,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 0, type: "channel", title: "" },
        text: post.contentRaw,
      });
    });

    // Step 3: Fetch channel profile if channelId is available
    const resolvedChannelId = channelId ?? post.channelId;
    const channelProfile = await step.run("fetch-channel-profile", async () => {
      if (!resolvedChannelId) return null;

      const { db } = await import("@/server/db");
      const { channelProfiles } = await import("@/server/db/schema");
      const { eq } = await import("drizzle-orm");

      const rows = await db
        .select()
        .from(channelProfiles)
        .where(eq(channelProfiles.channelId, resolvedChannelId))
        .limit(1);

      if (rows.length === 0) return null;

      const row = rows[0]!;
      return {
        niche: row.niche,
        tone: row.tone,
        topTopics: (row.topTopics ?? []) as string[],
        language: row.language ?? "ru",
      };
    });

    // Step 4: Run adaptation engine
    const result = await step.run("adapt-content", async () => {
      const { GoogleClient } = await import("@/lib/ai/google");
      const { AdaptationEngine } = await import("@/lib/ai/adaptation-engine");

      const aiProvider = new GoogleClient();
      const engine = new AdaptationEngine(aiProvider);

      return engine.adapt(
        {
          parsedContent: parsedContent as import("@/lib/telegram/parser.types").ParsedContent,
          platform,
          channelProfile: channelProfile ?? undefined,
        },
        modelTier ? { modelTier } : undefined,
      );
    });

    // Step 5: Store result in cross_posts
    const crossPostId = await step.run("store-result", async () => {
      const { db } = await import("@/server/db");
      const { crossPosts } = await import("@/server/db/schema");

      const inserted = await db
        .insert(crossPosts)
        .values({
          userId,
          sourcePostId: postId,
          platform,
          adaptedContent: result.content,
          aiModelUsed: result.modelUsed,
          status: "draft",
        })
        .returning({ id: crossPosts.id });

      return inserted[0]!.id;
    });

    // Step 6: Notify — real-time notification via websocket/SSE (future V2 enhancement)
    // Skipped: no notification channel implemented yet

    return {
      status: "completed",
      crossPostId,
      platform,
      modelUsed: result.modelUsed,
      tokenUsage: result.tokenUsage,
      qualityChecks: result.qualityChecks,
      hasTweets: !!result.tweets,
      tweetCount: result.tweets?.length ?? 0,
    };
  },
);
