import type { GoogleClient } from "./google";
import { AI_MODELS, type TokenUsage } from "./types";

interface SummarizeSourceInput {
  sourceContent: string;
  sourceType: "youtube" | "article" | "unknown";
  sourceMetadata?: {
    title?: string;
    author?: string;
    duration?: number;
  };
  language?: string;
  maxChars?: number;
}

export interface SummarizeSourceResult {
  summary: string;
  modelUsed: string;
  tokenUsage: TokenUsage;
}

const DEFAULT_MAX_SUMMARY_CHARS = 7000;

export async function summarizeSourceForGeneration(
  client: GoogleClient,
  input: SummarizeSourceInput,
): Promise<SummarizeSourceResult> {
  const maxChars = input.maxChars ?? DEFAULT_MAX_SUMMARY_CHARS;
  const sourceInfo = input.sourceMetadata
    ? `Source metadata:
- Title: ${input.sourceMetadata.title ?? "Unknown"}
- Author: ${input.sourceMetadata.author ?? "Unknown"}${
        input.sourceMetadata.duration
          ? `\n- Duration: ${Math.round(input.sourceMetadata.duration / 60)} minutes`
          : ""
      }`
    : "No source metadata provided.";

  const response = await client.completeWithFallback({
    model: AI_MODELS.fast.id,
    temperature: 0.2,
    max_tokens: 1800,
    messages: [
      {
        role: "system",
        content: `You are preparing source material for Telegram post generation.

Compress the source into a dense, faithful briefing that preserves the main ideas, structure, and key details.

Rules:
- Keep concrete facts, names, numbers, and actionable insights
- Remove filler, repetition, ads, and off-topic tangents
- Keep language as ${input.language ?? "the original language"}
- Return plain text only`,
      },
      {
        role: "user",
        content: `Source type: ${input.sourceType}
${sourceInfo}

Source content:
${input.sourceContent}`,
      },
    ],
  });

  const normalized = response.content.replace(/\n{3,}/g, "\n\n").trim();
  const summary =
    normalized.length > maxChars ? `${normalized.slice(0, maxChars).trimEnd()}...` : normalized;

  return {
    summary,
    modelUsed: response.model,
    tokenUsage: response.tokenUsage,
  };
}
