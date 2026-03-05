/**
 * LinkedIn adaptation prompt.
 *
 * Transforms translated content into a professional LinkedIn post
 * with thought-provoking questions, limited hashtags, and appropriate tone.
 */

import type { OpenRouterMessage, ChannelProfile } from "../types";

interface LinkedInAdaptInput {
  translatedContent: string;
  channelProfile?: ChannelProfile;
}

/**
 * Builds the message array for LinkedIn content adaptation.
 * Enforces: professional tone, insight question, 1-2 hashtags, <3000 chars.
 */
export function buildLinkedInAdaptPrompt(
  input: LinkedInAdaptInput,
): OpenRouterMessage[] {
  let channelContext = "";
  if (input.channelProfile) {
    const { niche, tone, topTopics } = input.channelProfile;
    channelContext = `
Channel context:
- Niche: ${niche ?? "general"}
- Tone: ${tone ?? "neutral"}
- Key topics: ${topTopics?.join(", ") ?? "various"}

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
${channelContext}
Output ONLY the adapted LinkedIn post, nothing else.`,
    },
    {
      role: "user",
      content: `Adapt the following translated content into a LinkedIn post:

${input.translatedContent}`,
    },
  ];
}
