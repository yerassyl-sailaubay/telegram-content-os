/**
 * Inngest function: broadcast/execute
 *
 * Triggered when a user wants to broadcast content to multiple platforms.
 * Runs AI adaptation for each platform in parallel, then posts to each
 * platform independently. Partial failures are handled — if one platform
 * fails, others still succeed.
 *
 * Event data:
 *   - broadcastId: unique broadcast group ID
 *   - postId: UUID of the source telegram_posts record
 *   - userId: UUID of the user
 *   - platforms: array of platforms to post to
 *   - channelId?: optional channel for tone-matching
 *   - crossPostIds: map of platform → cross_post UUID
 */

import { inngest } from "@/lib/inngest/client";

// ---------------------------------------------------------------------------
// Event type
// ---------------------------------------------------------------------------

interface BroadcastExecuteEvent {
  data: {
    broadcastId: string;
    postId: string;
    userId: string;
    platforms: ("linkedin" | "twitter")[];
    channelId?: string;
    crossPostIds: Record<string, string>;
  };
}

// ---------------------------------------------------------------------------
// Function
// ---------------------------------------------------------------------------

export const executeBroadcast = inngest.createFunction(
  {
    id: "broadcast/execute",
    retries: 1,
  },
  { event: "broadcast/execute" },
  async ({ event, step }) => {
    const { broadcastId, postId, userId, platforms, channelId, crossPostIds } = (
      event as BroadcastExecuteEvent
    ).data;

    // Step 1: Fetch the source post
    const post = await step.run("fetch-source-post", async () => {
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
      };
    });

    // Step 2: Parse content
    const parsedContent = await step.run("parse-content", async () => {
      if (post.contentParsed) {
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

      if (!post.contentRaw) {
        throw new Error(`Post ${postId} has no raw or parsed content`);
      }

      const { parseTelegramMessage } = await import("@/lib/telegram/parser");
      return parseTelegramMessage({
        message_id: 0,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 0, type: "channel", title: "" },
        text: post.contentRaw,
      });
    });

    // Step 3: Fetch channel profile for tone-matching
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

    // Step 4: Run AI adaptation for each platform IN PARALLEL
    // Each platform gets its own independent step.run
    const adaptationResults: Record<
      string,
      {
        content: string;
        tweets?: string[];
        modelUsed: string;
        success: boolean;
        error?: string;
      }
    > = {};

    await Promise.all(
      platforms.map(async (platform) => {
        const result = await step.run(`adapt-${platform}`, async () => {
          try {
            const { OpenRouterClient } = await import("@/lib/ai/openrouter");
            const { AdaptationEngine } = await import("@/lib/ai/adaptation-engine");

            const aiProvider = new OpenRouterClient();
            const engine = new AdaptationEngine(aiProvider);

            const adapted = await engine.adapt({
              parsedContent: parsedContent as import("@/lib/telegram/parser.types").ParsedContent,
              platform,
              channelProfile: channelProfile ?? undefined,
            });

            // Store adapted content in cross_post
            const { db } = await import("@/server/db");
            const { crossPosts } = await import("@/server/db/schema");
            const { eq } = await import("drizzle-orm");

            const crossPostId = crossPostIds[platform];
            if (crossPostId) {
              await db
                .update(crossPosts)
                .set({
                  adaptedContent: adapted.content,
                  aiModelUsed: adapted.modelUsed,
                  updatedAt: new Date(),
                })
                .where(eq(crossPosts.id, crossPostId));
            }

            return {
              content: adapted.content,
              tweets: adapted.tweets,
              modelUsed: adapted.modelUsed,
              success: true,
            };
          } catch (error) {
            // Mark this cross_post as failed
            const { db } = await import("@/server/db");
            const { crossPosts } = await import("@/server/db/schema");
            const { eq } = await import("drizzle-orm");

            const crossPostId = crossPostIds[platform];
            if (crossPostId) {
              await db
                .update(crossPosts)
                .set({ status: "failed", updatedAt: new Date() })
                .where(eq(crossPosts.id, crossPostId));
            }

            return {
              content: "",
              modelUsed: "",
              success: false,
              error: error instanceof Error ? error.message : "Adaptation failed",
            };
          }
        });

        adaptationResults[platform] = result;
      }),
    );

    // Step 5: Post to each platform IN PARALLEL (only successfully adapted ones)
    const postResults: Record<
      string,
      {
        success: boolean;
        platformPostId?: string;
        error?: string;
      }
    > = {};

    await Promise.all(
      platforms.map(async (platform) => {
        const adaptation = adaptationResults[platform];
        if (!adaptation?.success) {
          postResults[platform] = {
            success: false,
            error: adaptation?.error ?? "Adaptation failed",
          };
          return;
        }

        const result = await step.run(`post-${platform}`, async () => {
          const crossPostId = crossPostIds[platform]!;

          try {
            if (platform === "linkedin") {
              // Trigger LinkedIn posting event
              const { inngest: inngestClient } = await import("@/lib/inngest/client");
              await inngestClient.send({
                name: "platform/linkedin.post",
                data: {
                  crossPostId,
                  userId,
                  content: adaptation.content,
                },
              });

              return { success: true, platformPostId: undefined };
            } else {
              // Trigger Twitter posting event
              const { db } = await import("@/server/db");
              const { platformConnections } = await import("@/server/db/schema");
              const { eq, and } = await import("drizzle-orm");

              // Get connection ID for twitter
              const [conn] = await db
                .select({ id: platformConnections.id })
                .from(platformConnections)
                .where(
                  and(
                    eq(platformConnections.userId, userId),
                    eq(platformConnections.platform, "twitter"),
                  ),
                )
                .limit(1);

              if (!conn) {
                throw new Error("Twitter connection not found");
              }

              const { inngest: inngestClient } = await import("@/lib/inngest/client");
              await inngestClient.send({
                name: "platform/twitter.post",
                data: {
                  crossPostId,
                  userId,
                  connectionId: conn.id,
                  content: adaptation.content,
                  threadTweets: adaptation.tweets,
                },
              });

              return { success: true, platformPostId: undefined };
            }
          } catch (error) {
            // Mark cross_post as failed
            const { db } = await import("@/server/db");
            const { crossPosts } = await import("@/server/db/schema");
            const { eq } = await import("drizzle-orm");

            await db
              .update(crossPosts)
              .set({ status: "failed", updatedAt: new Date() })
              .where(eq(crossPosts.id, crossPostId));

            return {
              success: false,
              error: error instanceof Error ? error.message : "Posting failed",
            };
          }
        });

        postResults[platform] = result;
      }),
    );

    // Build final result
    const targets = platforms.map((platform) => {
      const adaptation = adaptationResults[platform];
      const posting = postResults[platform];

      return {
        platform,
        crossPostId: crossPostIds[platform],
        adaptedContent: adaptation?.content,
        status: posting?.success ? ("posted" as const) : ("failed" as const),
        error: posting?.error ?? adaptation?.error,
        platformPostId: posting?.platformPostId,
      };
    });

    const allSucceeded = targets.every((t) => t.status === "posted");
    const allFailed = targets.every((t) => t.status === "failed");

    return {
      broadcastId,
      status: allSucceeded ? "completed" : allFailed ? "failed" : "partial",
      targets,
    };
  },
);
