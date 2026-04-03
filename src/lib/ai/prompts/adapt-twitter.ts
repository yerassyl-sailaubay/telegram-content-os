/**
 * Twitter/X adaptation prompt.
 *
 * Transforms translated content into punchy, concise tweets
 * with hashtags, emoji, and thread support for longer content.
 */

import type { OpenRouterMessage, ChannelProfile } from "../types";
import {
  PROMPT_INJECTION_GUARDRAILS,
  formatUntrustedPromptSection,
  sanitizeUntrustedPromptInput,
} from "../prompt-security";

interface TwitterAdaptInput {
  translatedContent: string;
  channelProfile?: ChannelProfile;
}

/**
 * Builds the message array for Twitter/X content adaptation.
 * Enforces: conversational tone, 2-5 hashtags, emoji, 280 chars/tweet, thread for long content.
 */
export function buildTwitterAdaptPrompt(input: TwitterAdaptInput): OpenRouterMessage[] {
  let channelContext = "";
  if (input.channelProfile) {
    const { niche, tone, topTopics } = input.channelProfile;
    const safeTopics = topTopics
      .map((topic) => sanitizeUntrustedPromptInput(topic, 120))
      .filter((topic) => topic.length > 0);
    channelContext = `
Channel context:
- Niche: ${sanitizeUntrustedPromptInput(niche ?? "general", 200)}
- Tone: ${sanitizeUntrustedPromptInput(tone ?? "neutral", 200)}
- Key topics: ${safeTopics.join(", ") || "various"}

Adapt the voice to match this channel's style while keeping Twitter conventions.
`;
  }

  return [
    {
      role: "system",
      content: `You are a social media expert specializing in Twitter/X content.

Your task is to adapt translated content into engaging tweet(s).

Requirements:
- Use a conversational, punchy tone that feels native to Twitter
- Each tweet must be under 280 characters (this is a hard limit)
- Include 2-5 hashtags (relevant, not generic)
- Use emoji naturally to add personality and visual breaks
- For long content, split into a thread:
  - First tweet hooks the reader
  - Number tweets (1/N, 2/N, etc.)
  - Each tweet in the thread stands on its own but flows together
  - Last tweet includes the hashtags and a call-to-action
- For short content, create a single impactful tweet
- Preserve the key message from the original content
- Do NOT use overly formal language
- Do NOT stuff hashtags — keep them natural

${PROMPT_INJECTION_GUARDRAILS}
${channelContext}
Output format:
- For a single tweet: just the tweet text
- For a thread: separate each tweet with "---" on its own line`,
    },
    {
      role: "user",
      content: `Adapt the following translated content into tweet(s):

${formatUntrustedPromptSection("translated_content", input.translatedContent, 12_000)}`,
    },
  ];
}
