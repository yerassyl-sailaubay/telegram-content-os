import type { OpenRouterMessage, ChannelProfile } from "../types";
import {
  PROMPT_INJECTION_GUARDRAILS,
  formatUntrustedPromptSection,
  sanitizeUntrustedPromptInput,
} from "../prompt-security";

interface IdeaToDraftInput {
  idea: string;
  channelProfile: ChannelProfile;
  category?: string;
  tags?: string[];
  existingDrafts?: string[];
}

export function buildIdeaToDraftPrompt(input: IdeaToDraftInput): OpenRouterMessage[] {
  const { niche, tone, language } = input.channelProfile;
  const safeTopics = input.channelProfile.topTopics
    ?.map((topic) => sanitizeUntrustedPromptInput(topic, 120))
    .filter((topic) => topic.length > 0);

  const channelContext = `
Channel context:
- Niche: ${sanitizeUntrustedPromptInput(niche ?? "general", 200)}
- Tone: ${sanitizeUntrustedPromptInput(tone ?? "neutral", 200)}
- Language: ${sanitizeUntrustedPromptInput(language || "ru", 40)}
- Key topics: ${safeTopics?.join(", ") ?? "various"}`;

  const userParts: string[] = [
    `Idea:\n${formatUntrustedPromptSection("idea", input.idea, 8_000)}`,
  ];

  if (input.category) {
    userParts.push(`Category: ${sanitizeUntrustedPromptInput(input.category, 160)}`);
  }

  if (input.tags && input.tags.length > 0) {
    userParts.push(
      `Tags: ${input.tags.map((tag) => sanitizeUntrustedPromptInput(tag, 60)).join(", ")}`,
    );
  }

  if (input.existingDrafts && input.existingDrafts.length > 0) {
    userParts.push(
      `Avoid overlap with:\n${input.existingDrafts
        .map((draft) => `- ${sanitizeUntrustedPromptInput(draft, 300)}`)
        .join("\n")}`,
    );
  }

  return [
    {
      role: "system",
      content: `You are a Telegram channel content creator.
${channelContext}

Develop the following idea into a complete Telegram post.
Maintain the channel's voice.
Include formatting (bold/italic) and emoji where appropriate.

${PROMPT_INJECTION_GUARDRAILS}`,
    },
    {
      role: "user",
      content: userParts.join("\n\n"),
    },
  ];
}
