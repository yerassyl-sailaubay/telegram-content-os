import type { OpenRouterMessage, ChannelProfile } from "../types";
import type { SourceType } from "@/lib/sources/types";

const MAX_SOURCE_LENGTH = 15_000;

export const POSTS_PER_SOURCE = 3;

interface GenerateFromSourceInput {
  sourceContent: string;
  sourceType: SourceType;
  channelProfile: ChannelProfile;
  sourceMetadata?: {
    title?: string;
    author?: string;
    duration?: number;
  };
  options?: {
    maxLength?: number;
    numPosts?: number;
  };
}

export function buildGenerateFromSourcePrompt(input: GenerateFromSourceInput): OpenRouterMessage[] {
  const { channelProfile, sourceType, sourceMetadata, options } = input;
  const { niche, tone, topTopics, language } = channelProfile;
  const numPosts = options?.numPosts ?? POSTS_PER_SOURCE;

  const channelContext = `
Channel context:
- Niche: ${niche ?? "general"}
- Tone: ${tone ?? "neutral"}
- Key topics: ${topTopics?.join(", ") ?? "various"}
- Language: ${language}

Write in the channel's voice and style, matching the tone described above.
`;

  const sourceContent =
    input.sourceContent.length > MAX_SOURCE_LENGTH
      ? input.sourceContent.slice(0, MAX_SOURCE_LENGTH) + "... [truncated]"
      : input.sourceContent;

  const maxLengthInstruction = options?.maxLength
    ? `\nKeep each post under ${options.maxLength} characters.`
    : "";

  const metadataContext = sourceMetadata
    ? `
Source Information:
- Title: ${sourceMetadata.title ?? "Unknown"}
- Author: ${sourceMetadata.author ?? "Unknown"}${sourceMetadata.duration ? `\n- Duration: ${Math.round(sourceMetadata.duration / 60)} minutes` : ""}

This is a ${sourceType} source. ${sourceType === "youtube" ? "The content is a cleaned transcript from a video. Focus on the key insights and main points discussed." : ""}
`
    : "";

  return [
    {
      role: "system",
      content: `You are a Telegram channel content creator.

Your task is to extract key insights from a source and create ${numPosts} DIFFERENT engaging Telegram post ideas, each with a unique angle or focus.

Requirements for EACH post:
- Extract key insights and rewrite in the channel's voice — do NOT copy or paraphrase directly
- Use Telegram-native formatting: *bold* for emphasis, _italic_ for nuance
- Structure the post for easy reading: short paragraphs, line breaks, emoji where natural
- Open with a hook that grabs attention
- End with a takeaway or thought-provoking question
- Do NOT use HTML tags — Telegram uses Markdown-like formatting
- Do NOT include hashtags unless they are highly relevant
- Preserve the core message but make it original

Requirements for VARIETY:
- Each post must take a DIFFERENT angle on the source material
- Vary the style: one could be analytical, another conversational, another provocative
- Different hooks and different takeaways for each post
- Do NOT repeat the same points across posts

${channelContext}
${metadataContext}
Output EXACTLY ${numPosts} posts separated by the delimiter "---POST_SEPARATOR---" on its own line.
Do NOT include any numbering, labels, or explanations — ONLY the post content separated by the delimiter.`,
    },
    {
      role: "user",
      content: `Source Content:

${sourceContent}${maxLengthInstruction}`,
    },
  ];
}
