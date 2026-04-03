/**
 * LinkedIn adaptation prompt.
 *
 * Transforms translated content into a professional LinkedIn post
 * with thought-provoking questions, limited hashtags, and appropriate tone.
 */

import type { OpenRouterMessage, ChannelProfile } from "../types";
import {
  PROMPT_INJECTION_GUARDRAILS,
  formatUntrustedPromptSection,
  sanitizeUntrustedPromptInput,
} from "../prompt-security";

interface LinkedInAdaptInput {
  translatedContent: string;
  channelProfile?: ChannelProfile;
}

/**
 * Builds the message array for LinkedIn content adaptation.
 * Enforces: professional tone, insight question, 1-2 hashtags, <3000 chars.
 */
export function buildLinkedInAdaptPrompt(input: LinkedInAdaptInput): OpenRouterMessage[] {
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

Match this channel's voice and expertise area when adapting the content.
`;
  }

  return [
    {
      role: "system",
      content: `You are a professional content strategist specializing in LinkedIn.

Your task is to adapt translated content into an engaging LinkedIn post.

Requirements:
- Use a professional, insightful tone appropriate for LinkedIn's audience
- Open with a compelling hook that grabs attention
- Add a thought-provoking question at the end to encourage engagement
- Include exactly 1-2 hashtags (relevant to the topic)
- Keep the total post under 3,000 characters
- Use line breaks for readability (LinkedIn favors shorter paragraphs)
- Preserve the core message and key insights from the original
- Do NOT use clickbait or overly promotional language
- Do NOT add fake statistics or unsubstantiated claims

${PROMPT_INJECTION_GUARDRAILS}
${channelContext}
Output ONLY the adapted LinkedIn post, nothing else.`,
    },
    {
      role: "user",
      content: `Adapt the following translated content into a LinkedIn post:

${formatUntrustedPromptSection("translated_content", input.translatedContent, 12_000)}`,
    },
  ];
}
