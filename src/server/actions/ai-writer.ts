"use server";

import { db } from "@/server/db";
import { telegramChannels, telegramPosts, channelProfiles } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { GoogleClient } from "@/lib/ai/google";
import { AI_MODELS } from "@/lib/ai/types";
import { ChannelProfiler } from "@/lib/ai/channel-profiler";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

export interface GeneratePostInput {
  channelId: string;
  topic: string;
  tone?: string;
  maxLength?: number;
}

export interface GeneratedPostResult {
  content: string;
  suggestedHashtags: string[];
}

async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user.id;
}

/**
 * Analyze a channel and generate a profile using AI
 */
export async function analyzeChannelVoice(
  channelId: string,
): Promise<ActionResult<{ niche: string; tone: string; topTopics: string[] }>> {
  try {
    const userId = await getCurrentUserId();

    // Verify channel ownership
    const [channel] = await db
      .select()
      .from(telegramChannels)
      .where(and(eq(telegramChannels.id, channelId), eq(telegramChannels.userId, userId)))
      .limit(1);

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    // Get recent posts from this channel
    const posts = await db
      .select({ content: telegramPosts.contentRaw })
      .from(telegramPosts)
      .where(eq(telegramPosts.channelId, channelId))
      .orderBy(desc(telegramPosts.postedAt))
      .limit(50);

    const postContents = posts
      .map((p) => p.content)
      .filter((c): c is string => c != null && c.trim().length > 0);

    if (postContents.length === 0) {
      return {
        success: false,
        error: "Not enough posts to analyze. Need at least 1 post.",
      };
    }

    // Use AI to analyze channel
    const aiProvider = new GoogleClient();
    const profiler = new ChannelProfiler(aiProvider);

    const profile = await profiler.generateProfile(
      channel.title || channel.username || "Channel",
      postContents,
    );

    // Store the profile
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

    revalidatePath(`/dashboard/channels/${channelId}`);

    return {
      success: true,
      data: {
        niche: profile.niche,
        tone: profile.tone,
        topTopics: profile.topTopics,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze channel";
    return { success: false, error: message };
  }
}

/**
 * Generate a post in the channel's voice using AI
 */
export async function generatePostWithAI(
  input: GeneratePostInput,
): Promise<ActionResult<GeneratedPostResult>> {
  try {
    const userId = await getCurrentUserId();

    // Verify channel ownership
    const [channel] = await db
      .select()
      .from(telegramChannels)
      .where(and(eq(telegramChannels.id, input.channelId), eq(telegramChannels.userId, userId)))
      .limit(1);

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    // Get channel profile if exists
    const [profile] = await db
      .select()
      .from(channelProfiles)
      .where(eq(channelProfiles.channelId, input.channelId))
      .limit(1);

    // Get recent posts for examples
    const recentPosts = await db
      .select({ content: telegramPosts.contentRaw })
      .from(telegramPosts)
      .where(eq(telegramPosts.channelId, input.channelId))
      .orderBy(desc(telegramPosts.postedAt))
      .limit(10);

    const postExamples = recentPosts
      .map((p) => p.content)
      .filter((c) => c && c.trim().length > 0)
      .slice(0, 5);

    // Use AI to generate post
    const aiProvider = new GoogleClient();

    const systemPrompt = `You are an expert content creator who can perfectly mimic the writing style of any channel.

${
  profile
    ? `CHANNEL PROFILE:
- Niche: ${profile.niche}
- Tone: ${profile.tone}
- Top Topics: ${Array.isArray(profile.topTopics) ? profile.topTopics.join(", ") : "N/A"}
- Language: ${profile.language || "ru"}`
    : "No channel profile exists yet. Analyze the example posts below to understand the voice."
}

${
  postExamples.length > 0
    ? `\nEXAMPLE POSTS FROM THIS CHANNEL:\n${postExamples
        .map((p, i) => `${i + 1}. ${p}`)
        .join("\n")}`
    : ""
}

INSTRUCTIONS:
1. Write in the EXACT same style, tone, and voice as the example posts
2. Match the formatting patterns (emojis, paragraph breaks, etc.)
3. Use similar vocabulary and sentence structure
4. Keep the content relevant to the channel's niche
5. ${input.tone ? `Use a ${input.tone} tone` : "Match the channel's usual tone"}
6. Maximum ${input.maxLength || 1000} characters
7. Include 3-5 relevant hashtags at the end
8. Write in ${profile?.language || "the same language as the examples"}

OUTPUT FORMAT:
Return ONLY a JSON object with this exact structure:
{
  "content": "The generated post text without hashtags",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}`;

    const response = await aiProvider.complete({
      model: AI_MODELS.default.id,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a post about: ${input.topic}` },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    let result: GeneratedPostResult;
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(response.content);
      result = {
        content: parsed.content,
        suggestedHashtags: parsed.hashtags || [],
      };
    } catch {
      // Fallback: treat entire response as content
      result = {
        content: response.content,
        suggestedHashtags: [],
      };
    }

    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate post";
    return { success: false, error: message };
  }
}

/**
 * Get channel profile if it exists
 */
export async function getChannelProfile(channelId: string): Promise<
  ActionResult<{
    niche: string;
    tone: string;
    topTopics: string[];
    generatedAt: Date;
  } | null>
> {
  try {
    const userId = await getCurrentUserId();

    // Verify channel ownership
    const [channel] = await db
      .select()
      .from(telegramChannels)
      .where(and(eq(telegramChannels.id, channelId), eq(telegramChannels.userId, userId)))
      .limit(1);

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    const [profile] = await db
      .select()
      .from(channelProfiles)
      .where(eq(channelProfiles.channelId, channelId))
      .limit(1);

    if (!profile) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        niche: profile.niche || "",
        tone: profile.tone || "",
        topTopics: (profile.topTopics as string[]) || [],
        generatedAt: profile.generatedAt || new Date(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get channel profile";
    return { success: false, error: message };
  }
}
