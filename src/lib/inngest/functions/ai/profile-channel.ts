/**
 * Inngest function: ai/profile-channel
 *
 * Triggered manually to analyze a channel's posts and generate
 * an AI-powered profile (niche, tone, top topics, language).
 * Upserts the result into the channel_profiles table.
 */

import { inngest } from "@/lib/inngest/client";

const FULL_SCAN_POST_LIMIT = 50;
const INCREMENTAL_POST_LIMIT = 20;
const MIN_NEW_POSTS_FOR_INCREMENTAL_UPDATE = 3;

type StoredChannelProfile = {
  niche: string;
  tone: string;
  topTopics: string[];
  language: string;
};

export const profileChannel = inngest.createFunction(
  {
    id: "ai/profile-channel",
    retries: 2,
  },
  { event: "ai/profile-channel" },
  async ({ event, step }) => {
    const { channelId, userId, mode } = event.data as {
      channelId: string;
      userId: string;
      mode?: "auto" | "full";
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

    const existingProfile = await step.run("fetch-existing-profile", async () => {
      const { db } = await import("@/server/db");
      const { channelProfiles } = await import("@/server/db/schema");
      const { eq } = await import("drizzle-orm");

      const rows = await db
        .select()
        .from(channelProfiles)
        .where(eq(channelProfiles.channelId, channelId))
        .limit(1);

      if (rows.length === 0) return null;

      const row = rows[0]!;
      return {
        niche: row.niche,
        tone: row.tone,
        topTopics: (row.topTopics ?? []) as string[],
        language: row.language ?? "ru",
        generatedAt: row.generatedAt ? row.generatedAt.toISOString() : null,
      };
    });

    const shouldRunIncremental = mode !== "full" && Boolean(existingProfile?.generatedAt);

    // Step 2: Fetch recent posts
    const posts = await step.run("fetch-posts", async () => {
      const { db } = await import("@/server/db");
      const { telegramPosts } = await import("@/server/db/schema");
      const { eq, desc, gt, and } = await import("drizzle-orm");

      if (shouldRunIncremental && existingProfile?.generatedAt) {
        const generatedAt = new Date(existingProfile.generatedAt);

        const rows = await db
          .select({
            contentRaw: telegramPosts.contentRaw,
          })
          .from(telegramPosts)
          .where(
            and(eq(telegramPosts.channelId, channelId), gt(telegramPosts.postedAt, generatedAt)),
          )
          .orderBy(desc(telegramPosts.postedAt))
          .limit(INCREMENTAL_POST_LIMIT);

        return rows
          .map((r) => r.contentRaw)
          .filter((text): text is string => typeof text === "string" && text.trim().length > 0);
      }

      const rows = await db
        .select({
          contentRaw: telegramPosts.contentRaw,
        })
        .from(telegramPosts)
        .where(eq(telegramPosts.channelId, channelId))
        .orderBy(desc(telegramPosts.postedAt))
        .limit(FULL_SCAN_POST_LIMIT);

      return rows
        .map((r) => r.contentRaw)
        .filter((text): text is string => typeof text === "string" && text.trim().length > 0);
    });

    if (posts.length === 0) {
      return {
        channelId,
        status: "skipped",
        reason: shouldRunIncremental
          ? "No new text posts since the last profile generation"
          : "No posts with text content found",
      };
    }

    if (shouldRunIncremental && posts.length < MIN_NEW_POSTS_FOR_INCREMENTAL_UPDATE) {
      return {
        channelId,
        status: "skipped",
        reason: `Only ${posts.length} new post(s); waiting for ${MIN_NEW_POSTS_FOR_INCREMENTAL_UPDATE}`,
      };
    }

    const profileCacheKey = await step.run("build-cache-key", async () => {
      if (!shouldRunIncremental || !existingProfile?.generatedAt) {
        return null;
      }

      const { createPromptCacheKey } = await import("@/lib/ai/prompt-cache");
      return createPromptCacheKey({
        channelId,
        baselineGeneratedAt: existingProfile.generatedAt,
        posts,
      });
    });

    const cachedProfile = await step.run("load-cache", async () => {
      if (!shouldRunIncremental || !profileCacheKey) {
        return null;
      }

      const { readPromptCache } = await import("@/lib/ai/prompt-cache");
      return readPromptCache<StoredChannelProfile>({
        userId,
        feature: "channel_profile_incremental",
        cacheKey: profileCacheKey,
      });
    });

    // Step 3: Generate profile via AI
    const generation = await step.run("generate-profile", async () => {
      if (cachedProfile) {
        return {
          profile: cachedProfile,
          cacheHit: true,
          modelUsed: null,
          tokenUsage: null,
        };
      }

      const { ChannelProfiler } = await import("@/lib/ai/channel-profiler");
      const { GoogleClient } = await import("@/lib/ai/google");
      const { writePromptCache } = await import("@/lib/ai/prompt-cache");

      const aiProvider = new GoogleClient();
      const profiler = new ChannelProfiler(aiProvider);

      const channelName = channel.title ?? channel.username ?? channelId;

      if (shouldRunIncremental && existingProfile) {
        const profile = await profiler.updateProfile(
          channelName,
          {
            niche: existingProfile.niche,
            tone: existingProfile.tone,
            topTopics: existingProfile.topTopics,
            language: existingProfile.language,
          },
          posts,
          { maxPosts: INCREMENTAL_POST_LIMIT },
        );

        if (profileCacheKey) {
          await writePromptCache({
            userId,
            feature: "channel_profile_incremental",
            cacheKey: profileCacheKey,
            modelId: profile.modelUsed,
            response: {
              niche: profile.niche,
              tone: profile.tone,
              topTopics: profile.topTopics,
              language: profile.language,
            },
            ttlSeconds: 24 * 60 * 60,
          });
        }

        return {
          profile,
          cacheHit: false,
          modelUsed: profile.modelUsed,
          tokenUsage: profile.tokenUsage,
        };
      }

      const profile = await profiler.generateProfile(channelName, posts);
      return {
        profile,
        cacheHit: false,
        modelUsed: profile.modelUsed,
        tokenUsage: profile.tokenUsage,
      };
    });

    // Step 4: Upsert profile into DB
    await step.run("store-profile", async () => {
      const { db } = await import("@/server/db");
      const { channelProfiles } = await import("@/server/db/schema");

      await db
        .insert(channelProfiles)
        .values({
          channelId,
          niche: generation.profile.niche,
          tone: generation.profile.tone,
          topTopics: generation.profile.topTopics,
          language: generation.profile.language,
          generatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: channelProfiles.channelId,
          set: {
            niche: generation.profile.niche,
            tone: generation.profile.tone,
            topTopics: generation.profile.topTopics,
            language: generation.profile.language,
            generatedAt: new Date(),
            updatedAt: new Date(),
          },
        });
    });

    await step.run("track-telemetry", async () => {
      if (generation.cacheHit || !generation.modelUsed || !generation.tokenUsage) {
        return;
      }

      const { recordAiTelemetry } = await import("@/lib/ai/telemetry");
      await recordAiTelemetry({
        userId,
        channelId,
        feature: shouldRunIncremental ? "channel_profile_incremental" : "channel_profile_full",
        modelId: generation.modelUsed,
        tokenUsage: generation.tokenUsage,
        metadata: {
          postsCount: posts.length,
          mode: shouldRunIncremental ? "incremental" : "full",
        },
      });
    });

    return {
      channelId,
      status: "completed",
      mode: shouldRunIncremental ? "incremental" : "full",
      cacheHit: generation.cacheHit,
      niche: generation.profile.niche,
      tone: generation.profile.tone,
      topTopics: generation.profile.topTopics,
      language: generation.profile.language,
    };
  },
);
