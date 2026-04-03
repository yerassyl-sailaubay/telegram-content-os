import type { ChannelProfile, OpenRouterMessage } from "../types";
import { buildChannelVoicePreamble } from "./repurpose-telegram";
import { PROMPT_INJECTION_GUARDRAILS, sanitizeUntrustedPromptInput } from "../prompt-security";

export interface CalendarFillPromptInput {
  gapDates: string[];
  existingContent: { date: string; title: string }[];
  channelProfile: ChannelProfile;
  recentTopics?: string[];
}

export function buildCalendarFillPrompt(input: CalendarFillPromptInput): OpenRouterMessage[] {
  const { gapDates, existingContent, channelProfile, recentTopics } = input;
  const voicePreamble = buildChannelVoicePreamble(channelProfile);

  const systemContent = `You are a content calendar strategist for a Telegram channel.
${voicePreamble}

Suggest content for the empty dates below. Each suggestion should be diverse (not repetitive), fit the channel's voice, and complement the existing calendar. Suggest exactly one post per gap date.

${PROMPT_INJECTION_GUARDRAILS}`;

  const userParts: string[] = [`Calendar gaps: ${gapDates.join(", ")}`];

  if (existingContent.length > 0) {
    const bullets = existingContent
      .map((contentItem) => {
        const safeDate = sanitizeUntrustedPromptInput(contentItem.date, 40);
        const safeTitle = sanitizeUntrustedPromptInput(contentItem.title, 220);
        return `- ${safeDate}: ${safeTitle}`;
      })
      .join("\n");
    userParts.push(`Existing scheduled content:\n${bullets}`);
  }

  if (recentTopics && recentTopics.length > 0) {
    userParts.push(
      `Recent topics to avoid repeating: ${recentTopics
        .map((topic) => sanitizeUntrustedPromptInput(topic, 100))
        .join(", ")}`,
    );
  }

  userParts.push(
    `For each gap date, provide: a post title, 1-sentence description, and suggested source type (idea/repurpose/external). Return as JSON array matching: [{date, suggestedContent, sourceType, confidence}]`,
  );

  return [
    { role: "system", content: systemContent },
    { role: "user", content: userParts.join("\n\n") },
  ];
}
