"use server";

import { db } from "@/server/db";
import { telegramChannels, telegramPosts, channelProfiles } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { GoogleClient } from "@/lib/ai/google";
import { AI_MODELS } from "@/lib/ai/types";
import { ChannelProfiler } from "@/lib/ai/channel-profiler";
import { recordAiTelemetry } from "@/lib/ai/telemetry";
import {
  PROMPT_INJECTION_GUARDRAILS,
  formatUntrustedPromptSection,
  sanitizeUntrustedPromptInput,
} from "@/lib/ai/prompt-security";
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

const MAX_AI_WRITER_EXAMPLES = 3;
const MAX_AI_WRITER_EXAMPLE_CHARS = 700;

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

    await recordAiTelemetry({
      userId,
      channelId,
      feature: "channel_profile_full",
      modelId: profile.modelUsed,
      tokenUsage: profile.tokenUsage,
      metadata: {
        postsAnalyzed: postContents.length,
        triggeredBy: "manual_action",
      },
    });

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
      .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
      .slice(0, MAX_AI_WRITER_EXAMPLES)
      .map((post) => {
        const text = post.trim();
        if (text.length <= MAX_AI_WRITER_EXAMPLE_CHARS) return text;
        return `${text.slice(0, MAX_AI_WRITER_EXAMPLE_CHARS).trimEnd()}...`;
      });

    // Use AI to generate post
    const aiProvider = new GoogleClient();

    const profileContext = profile
      ? `Niche: ${sanitizeUntrustedPromptInput(profile.niche ?? "general", 200)}
Tone: ${sanitizeUntrustedPromptInput(profile.tone ?? "neutral", 200)}
Top topics: ${
          Array.isArray(profile.topTopics)
            ? profile.topTopics.map((topic) => sanitizeUntrustedPromptInput(topic, 120)).join(", ")
            : "N/A"
        }
Language: ${sanitizeUntrustedPromptInput(profile.language || "ru", 40)}`
      : "No saved channel profile. Infer voice from examples.";

    const examplesContext =
      postExamples.length > 0
        ? postExamples
            .map(
              (post, index) =>
                `Example ${index + 1}:\n${formatUntrustedPromptSection(`example_${index + 1}`, post, 1_500)}`,
            )
            .join("\n\n")
        : "No examples available.";

    const response = await aiProvider.complete({
      model: AI_MODELS.default.id,
      messages: [
        {
          role: "system",
          content: `You write Telegram posts that match an existing channel voice.
Return JSON only with fields: "content" (string) and "hashtags" (string array).

Requirements:
- Match channel style, formatting patterns, and vocabulary
- Keep content relevant to channel niche
- ${
            input.tone
              ? `Use ${sanitizeUntrustedPromptInput(input.tone, 120)} tone`
              : "Match the channel's usual tone"
          }
- Keep "content" within ${input.maxLength || 1000} characters
- Return 3-5 hashtags in "hashtags"
- Write in ${profile?.language || "the channel language from examples"}

${PROMPT_INJECTION_GUARDRAILS}`,
        },
        {
          role: "user",
          content: `Topic:
${formatUntrustedPromptSection("topic", input.topic, 400)}

Channel profile:
${profileContext}

Examples:
${examplesContext}`,
        },
      ],
      temperature: 0.65,
      max_tokens: 1000,
      response_mime_type: "application/json",
      response_json_schema: {
        type: "object",
        additionalProperties: false,
        required: ["content", "hashtags"],
        properties: {
          content: { type: "string" },
          hashtags: {
            type: "array",
            items: { type: "string" },
            minItems: 0,
            maxItems: 10,
          },
        },
      },
    });

    let result: GeneratedPostResult;
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(response.content) as {
        content?: unknown;
        hashtags?: unknown;
      };
      result = {
        content: typeof parsed.content === "string" ? parsed.content : "",
        suggestedHashtags: Array.isArray(parsed.hashtags)
          ? parsed.hashtags.filter((tag): tag is string => typeof tag === "string")
          : [],
      };
    } catch {
      // Fallback: treat entire response as content
      result = {
        content: response.content,
        suggestedHashtags: [],
      };
    }

    await recordAiTelemetry({
      userId,
      channelId: input.channelId,
      feature: "ai_writer",
      modelId: response.model,
      tokenUsage: response.tokenUsage,
      metadata: {
        topic: input.topic,
        hasProfile: Boolean(profile),
        examplesUsed: postExamples.length,
      },
    });

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
