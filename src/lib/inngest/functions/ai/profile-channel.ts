/**
 * Inngest function: ai/profile-channel
 *
 * Triggered manually to analyze a channel's posts and generate
 * an AI-powered profile (niche, tone, top topics, language).
 * Upserts the result into the channel_profiles table.
 */

import { inngest } from "@/lib/inngest/client";

export const profileChannel = inngest.createFunction(
  {
    id: "ai/profile-channel",
    retries: 2,
  },
  { event: "ai/profile-channel" },
  async ({ event, step }) => {
    const { channelId, userId } = event.data as {
      channelId: string;
      userId: string;
    };

    // Step 1: Fetch channel and verify ownership
    const channel = await step.run("fetch-channel", async () => {
      const { db } = await import("@/server/db");
      const { telegramChannels } = await import("@/server/db/schema");
      const { eq, and } = await import("drizzle-orm");

      const rows = await db
        .select()
        .from(telegramChannels)
        .where(and(eq(telegramChannels.id, channelId), eq(telegramChannels.userId, userId)))
        .limit(1);

      if (rows.length === 0) {
        throw new Error(`Channel ${channelId} not found or not owned by user ${userId}`);
      }

      return {
        id: rows[0]!.id,
        title: rows[0]!.title,
        username: rows[0]!.username,
      };
    });

    // Step 2: Fetch recent posts
    const posts = await step.run("fetch-posts", async () => {
      const { db } = await import("@/server/db");
      const { telegramPosts } = await import("@/server/db/schema");
      const { eq, desc } = await import("drizzle-orm");

      const rows = await db
        .select({
          contentRaw: telegramPosts.contentRaw,
        })
        .from(telegramPosts)
        .where(eq(telegramPosts.channelId, channelId))
        .orderBy(desc(telegramPosts.postedAt))
        .limit(50);

      return rows
        .map((r) => r.contentRaw)
        .filter((text): text is string => typeof text === "string" && text.trim().length > 0);
    });

    if (posts.length === 0) {
      return {
        channelId,
        status: "skipped",
        reason: "No posts with text content found",
      };
    }

    // Step 3: Generate profile via AI
    const profile = await step.run("generate-profile", async () => {
      const { ChannelProfiler } = await import("@/lib/ai/channel-profiler");
      const { GoogleClient } = await import("@/lib/ai/google");

      const aiProvider = new GoogleClient();
      const profiler = new ChannelProfiler(aiProvider);

      const channelName = channel.title ?? channel.username ?? channelId;

      return profiler.generateProfile(channelName, posts);
    });

    // Step 4: Upsert profile into DB
    await step.run("store-profile", async () => {
      const { db } = await import("@/server/db");
      const { channelProfiles } = await import("@/server/db/schema");

      await db
        .insert(channelProfiles)
        .values({
          channelId,
          niche: profile.niche,
          tone: profile.tone,
          topTopics: profile.topTopics,
          language: profile.language,
          generatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: channelProfiles.channelId,
          set: {
            niche: profile.niche,
            tone: profile.tone,
            topTopics: profile.topTopics,
            language: profile.language,
            generatedAt: new Date(),
            updatedAt: new Date(),
          },
        });
    });

    return {
      channelId,
      status: "completed",
      niche: profile.niche,
      tone: profile.tone,
      topTopics: profile.topTopics,
      language: profile.language,
    };
  },
);
