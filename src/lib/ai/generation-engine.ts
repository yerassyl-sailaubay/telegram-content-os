import type {
  GenerationType,
  GenerationRequest,
  GenerationResult,
  ModelTier,
  OpenRouterMessage,
} from "./types";
import { AI_MODELS } from "./types";
import type { OpenRouterClient } from "./openrouter";
import { buildGenerateFromSourcePrompt } from "./prompts/generate-from-source";
import { buildRepurposePrompt } from "./prompts/repurpose-telegram";
import { buildIdeaToDraftPrompt } from "./prompts/idea-to-draft";
import { buildCalendarFillPrompt } from "./prompts/calendar-fill";

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

export class GenerationEngine {
  constructor(private readonly client: OpenRouterClient) {}

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const messages = this.buildPrompt(request);
    const tier = request.options?.modelTier ?? getModelTierForType(request.type);
    const model = AI_MODELS[tier];

    const result = await this.client.completeWithFallback(
      {
        model: model.id,
        messages,
        temperature: 0.7,
      },
      undefined,
    );

    return {
      content: result.content,
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
          sourceType: "article",
          channelProfile: request.channelProfile ?? {
            niche: null,
            tone: null,
            topTopics: [],
            language: "ru",
          },
          options: request.options ? { maxLength: request.options.maxLength } : undefined,
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
