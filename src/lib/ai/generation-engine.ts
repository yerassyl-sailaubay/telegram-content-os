import type {
  GenerationType,
  GenerationRequest,
  GenerationResult,
  ModelTier,
  OpenRouterMessage,
} from "./types";
import { AI_MODELS } from "./types";
import type { GoogleClient } from "./google";
import { buildGenerateFromSourcePrompt, POSTS_PER_SOURCE } from "./prompts/generate-from-source";
import { buildRepurposePrompt } from "./prompts/repurpose-telegram";
import { buildIdeaToDraftPrompt } from "./prompts/idea-to-draft";
import { buildCalendarFillPrompt } from "./prompts/calendar-fill";

const POST_SEPARATOR = "---POST_SEPARATOR---";

export function parseMultiPostResponse(raw: string): string[] {
  const posts = raw
    .split(POST_SEPARATOR)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (posts.length === 0) {
    return [raw.trim()];
  }

  return posts;
}

export function getModelTierForType(type: GenerationType): ModelTier {
  switch (type) {
    case "idea_to_draft":
      return "fast";
    case "source_to_telegram":
    case "repurpose":
      return "default";
    case "calendar_fill":
      return "pro";
  }
}

function getTemperatureForType(type: GenerationType): number {
  switch (type) {
    case "source_to_telegram":
      return 0.5;
    case "idea_to_draft":
      return 0.7;
    case "repurpose":
      return 0.6;
    case "calendar_fill":
      return 0.7;
  }
}

export class GenerationEngine {
  constructor(private readonly client: GoogleClient) {}

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const messages = this.buildPrompt(request);
    const tier = request.options?.modelTier ?? getModelTierForType(request.type);
    const model = AI_MODELS[tier];
    const temperature = getTemperatureForType(request.type);

    const result = await this.client.completeWithFallback(
      {
        model: model.id,
        messages,
        temperature,
        max_tokens: 4000,
      },
      undefined,
    );

    const content =
      request.type === "source_to_telegram"
        ? parseMultiPostResponse(result.content)
        : result.content;

    return {
      content,
      type: request.type,
      modelUsed: result.model,
      tokenUsage: result.tokenUsage,
    };
  }

  private buildPrompt(request: GenerationRequest): OpenRouterMessage[] {
    switch (request.type) {
      case "source_to_telegram":
        return buildGenerateFromSourcePrompt({
          sourceContent: request.sourceContent,
          sourceType: request.options?.sourceType ?? "article",
          sourceMetadata: request.options?.sourceMetadata,
          channelProfile: request.channelProfile ?? {
            niche: null,
            tone: null,
            topTopics: [],
            language: "ru",
          },
          options: {
            maxLength: request.options?.maxLength,
            numPosts: request.options?.numVariations ?? POSTS_PER_SOURCE,
          },
        });

      case "repurpose":
        return buildRepurposePrompt({
          originalContent: request.sourceContent,
          mode: request.options?.repurposeMode ?? "shorter",
          channelProfile: request.channelProfile ?? {
            niche: null,
            tone: null,
            topTopics: [],
            language: "ru",
          },
          numVariations: request.options?.numVariations,
        });

      case "idea_to_draft":
        return buildIdeaToDraftPrompt({
          idea: request.sourceContent,
          channelProfile: request.channelProfile ?? {
            niche: null,
            tone: null,
            topTopics: [],
            language: "ru",
          },
        });

      case "calendar_fill": {
        const parsed = JSON.parse(request.sourceContent) as {
          gapDates: string[];
          existingContent: { date: string; title: string }[];
          recentTopics?: string[];
        };
        return buildCalendarFillPrompt({
          gapDates: parsed.gapDates,
          existingContent: parsed.existingContent,
          channelProfile: request.channelProfile ?? {
            niche: null,
            tone: null,
            topTopics: [],
            language: "ru",
          },
          recentTopics: parsed.recentTopics,
        });
      }
    }
  }
}
