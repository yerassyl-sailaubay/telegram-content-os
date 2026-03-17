import { db } from "@/server/db";
import { aiUsageEvents } from "@/server/db/schema";
import { AI_MODELS, type TokenUsage } from "./types";

export type AiTelemetryFeature =
  | "source_to_telegram"
  | "source_summarization"
  | "idea_to_draft"
  | "repurpose"
  | "calendar_fill"
  | "channel_profile_full"
  | "channel_profile_incremental"
  | "cross_platform_adaptation"
  | "ai_writer";

export interface AiCostEstimate {
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
}

export interface RecordAiTelemetryInput {
  userId: string;
  feature: AiTelemetryFeature;
  modelId: string;
  tokenUsage: TokenUsage;
  channelId?: string | null;
  contentId?: string | null;
  metadata?: Record<string, unknown>;
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function getPricingForModel(modelId: string): { input: number; output: number } {
  for (const model of Object.values(AI_MODELS)) {
    if (model.id === modelId) {
      return {
        input: model.costPer1kInputTokens,
        output: model.costPer1kOutputTokens,
      };
    }
  }

  return {
    input: AI_MODELS.default.costPer1kInputTokens,
    output: AI_MODELS.default.costPer1kOutputTokens,
  };
}

export function estimateAiCost(modelId: string, tokenUsage: TokenUsage): AiCostEstimate {
  const pricing = getPricingForModel(modelId);
  const inputCostUsd = (tokenUsage.promptTokens / 1000) * pricing.input;
  const outputCostUsd = (tokenUsage.completionTokens / 1000) * pricing.output;
  return {
    inputCostUsd: roundUsd(inputCostUsd),
    outputCostUsd: roundUsd(outputCostUsd),
    totalCostUsd: roundUsd(inputCostUsd + outputCostUsd),
  };
}

export async function recordAiTelemetry(input: RecordAiTelemetryInput): Promise<void> {
  const costs = estimateAiCost(input.modelId, input.tokenUsage);

  try {
    await db.insert(aiUsageEvents).values({
      userId: input.userId,
      channelId: input.channelId ?? null,
      contentId: input.contentId ?? null,
      feature: input.feature,
      modelId: input.modelId,
      promptTokens: input.tokenUsage.promptTokens,
      completionTokens: input.tokenUsage.completionTokens,
      totalTokens: input.tokenUsage.totalTokens,
      inputCostUsd: costs.inputCostUsd,
      outputCostUsd: costs.outputCostUsd,
      totalCostUsd: costs.totalCostUsd,
      metadata: input.metadata ?? {},
      createdAt: new Date(),
    });
  } catch (error) {
    console.warn("Failed to record AI telemetry", error);
  }
}
