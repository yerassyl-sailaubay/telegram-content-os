import type { OpenRouterMessage, ChannelProfile } from "../types";

interface IdeaToDraftInput {
  idea: string;
  channelProfile: ChannelProfile;
  category?: string;
  tags?: string[];
  existingDrafts?: string[];
}

export function buildIdeaToDraftPrompt(input: IdeaToDraftInput): OpenRouterMessage[] {
  const { niche, tone, language } = input.channelProfile;

  const channelContext = `
Channel context:
- Niche: ${niche ?? "general"}
- Tone: ${tone ?? "neutral"}
- Language: ${language}
- Key topics: ${input.channelProfile.topTopics?.join(", ") ?? "various"}`;

  const userParts: string[] = [`Idea: ${input.idea}`];

  if (input.category) {
    userParts.push(`Category: ${input.category}`);
  }

  if (input.tags && input.tags.length > 0) {
    userParts.push(`Tags: ${input.tags.join(", ")}`);
  }

  if (input.existingDrafts && input.existingDrafts.length > 0) {
    userParts.push(`Avoid overlap with:\n${input.existingDrafts.map((d) => `- ${d}`).join("\n")}`);
  }

  return [
    {
      role: "system",
      content: `You are a Telegram channel content creator.
${channelContext}

Develop the following idea into a complete Telegram post.
Maintain the channel's voice.
Include formatting (bold/italic) and emoji where appropriate.`,
    },
    {
      role: "user",
      content: userParts.join("\n\n"),
    },
  ];
}
