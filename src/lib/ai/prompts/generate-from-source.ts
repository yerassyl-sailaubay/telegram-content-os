import type { OpenRouterMessage, ChannelProfile } from "../types";
import type { SourceType } from "@/lib/sources/types";

const MAX_SOURCE_LENGTH = 15_000;

interface GenerateFromSourceInput {
  sourceContent: string;
  sourceType: SourceType;
  channelProfile: ChannelProfile;
  options?: {
    maxLength?: number;
  };
}

export function buildGenerateFromSourcePrompt(input: GenerateFromSourceInput): OpenRouterMessage[] {
  const { channelProfile, sourceType, options } = input;
  const { niche, tone, topTopics, language } = channelProfile;

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
    ? `\nKeep the post under ${options.maxLength} characters.`
    : "";

  return [
    {
      role: "system",
      content: `You are a Telegram channel content creator.

Your task is to extract key insights from a source and rewrite them as an engaging Telegram post in your own voice.

Requirements:
- Extract key insights and rewrite in the channel's voice — do NOT copy or paraphrase directly
- Use Telegram-native formatting: *bold* for emphasis, _italic_ for nuance
- Structure the post for easy reading: short paragraphs, line breaks, emoji where natural
- Open with a hook that grabs attention
- End with a takeaway or thought-provoking question
- Do NOT use HTML tags — Telegram uses Markdown-like formatting
- Do NOT include hashtags unless they are highly relevant
- Preserve the core message but make it original
${channelContext}
Output ONLY the Telegram post, nothing else.`,
    },
    {
      role: "user",
      content: `Source (${sourceType}):

${sourceContent}${maxLengthInstruction}`,
    },
  ];
}
