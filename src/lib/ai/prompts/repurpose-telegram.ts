import type { ChannelProfile, OpenRouterMessage, RepurposeMode } from "../types";

export interface RepurposeInput {
  originalContent: string;
  mode: RepurposeMode;
  channelProfile: ChannelProfile;
  numVariations?: number;
}

const MODE_INSTRUCTIONS: Record<RepurposeMode, string> = {
  shorter:
    "Condense this Telegram post into a shorter version that keeps the core message. Same voice, fewer words.",
  thread:
    "Split this content into a thread of 2-5 connected Telegram posts. Each post should stand alone but flow together.",
  poll: "Convert this content into an engaging poll. Generate a question and 2-4 answer options that spark discussion.",
};

export function buildChannelVoicePreamble(profile: ChannelProfile): string {
  const { niche, tone, topTopics, language } = profile;
  return `
Channel voice:
- Niche: ${niche ?? "general"}
- Tone: ${tone ?? "neutral"}
- Key topics: ${topTopics.length > 0 ? topTopics.join(", ") : "various"}
- Language: ${language}

Preserve the channel's voice and style in the output.`;
}

function buildVariationsInstruction(numVariations: number | undefined): string {
  if (!numVariations || numVariations <= 1) return "";
  return `\n\nGenerate ${numVariations} different variations. Separate each variation with "---" on its own line.`;
}

export function buildRepurposePrompt(input: RepurposeInput): OpenRouterMessage[] {
  const modeInstruction = MODE_INSTRUCTIONS[input.mode];
  const voicePreamble = buildChannelVoicePreamble(input.channelProfile);
  const variationsInstruction = buildVariationsInstruction(input.numVariations);

  return [
    {
      role: "system",
      content: `You are an expert Telegram content creator.

${modeInstruction}
${voicePreamble}${variationsInstruction}`,
    },
    {
      role: "user",
      content: `Repurpose the following Telegram post:

${input.originalContent}`,
    },
  ];
}
