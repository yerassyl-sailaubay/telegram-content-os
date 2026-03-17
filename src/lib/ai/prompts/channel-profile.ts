/**
 * Channel profile analysis prompt.
 *
 * Analyzes a sample of recent posts from a Telegram channel
 * to extract niche, tone, key topics, and primary language.
 */

import type { OpenRouterMessage, ChannelProfileRequest } from "../types";

/**
 * Builds the message array for channel profile analysis.
 * Expects JSON output with niche, tone, topTopics, and language fields.
 */
export function buildChannelProfilePrompt(input: ChannelProfileRequest): OpenRouterMessage[] {
  const postsText = input.posts.map((post, i) => `--- Post ${i + 1} ---\n${post}`).join("\n\n");

  if (input.existingProfile) {
    const existingProfile = JSON.stringify({
      niche: input.existingProfile.niche ?? "unknown",
      tone: input.existingProfile.tone ?? "unknown",
      topTopics: input.existingProfile.topTopics ?? [],
      language: input.existingProfile.language ?? "ru",
    });

    return [
      {
        role: "system",
        content: `You are a content analyst specializing in Telegram channel profiling.

Your task is to UPDATE an existing channel profile using only newly written posts.

Rules:
- Start from the existing profile as baseline
- Change fields only when the new posts provide clear evidence
- Keep the same language unless new posts clearly indicate a shift
- Keep topTopics focused and deduplicated (3-7 topics)

Return a JSON object with these exact fields:
- "niche": concise channel niche
- "tone": dominant writing tone/style
- "topTopics": array of 3-7 concrete recurring topics
- "language": primary language code (e.g. "ru", "en", "uk")

Output ONLY valid JSON, no markdown, no explanation.`,
      },
      {
        role: "user",
        content: `Channel: "${input.channelName}"

Existing profile:
${existingProfile}

New posts to evaluate:
${postsText}`,
      },
    ];
  }

  return [
    {
      role: "system",
      content: `You are a content analyst specializing in Telegram channel profiling.

Your task is to analyze a sample of recent posts from a channel and extract a profile.

Analyze the posts and return a JSON object with these exact fields:
- "niche": A concise description of the channel's niche or topic area (e.g., "AI/ML and tech startups", "personal finance and investing")
- "tone": The predominant tone of the channel (e.g., "analytical and educational", "casual and humorous", "formal and authoritative")
- "topTopics": An array of 3-5 most frequently discussed topics (e.g., ["machine learning", "startup culture", "product management"])
- "language": The primary language code of the content (e.g., "ru", "en", "uk")

Guidelines:
- Base your analysis ONLY on the provided posts
- Be specific and nuanced in your descriptions
- For "tone", capture the personality and writing style
- For "topTopics", list concrete subject areas, not generic categories
- If posts are in multiple languages, identify the dominant one

Output ONLY valid JSON, no markdown formatting, no explanation.`,
    },
    {
      role: "user",
      content: `Analyze the following posts from the channel "${input.channelName}" and provide a profile:

${postsText}`,
    },
  ];
}
