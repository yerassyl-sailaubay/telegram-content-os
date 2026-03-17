/**
 * AI provider — public API barrel export.
 *
 * Usage:
 *   import { GoogleClient, AI_MODELS } from "@/lib/ai";
 *   const ai = new GoogleClient();
 *   const result = await ai.adaptContent({ content: "...", platform: "linkedin" });
 */

// Types
export type {
  AIModel,
  ModelTier,
  Platform,
  TokenUsage,
  AdaptationRequest,
  AdaptationOptions,
  AdaptedContent,
  ChannelProfile,
  ChannelProfileRequest,
  ChannelProfileResult,
  OpenRouterRequest,
  OpenRouterMessage,
  OpenRouterResponse,
  OpenRouterChoice,
} from "./types";
export { AI_MODELS, AIProviderError } from "./types";

// Provider interface
export type { AIProvider } from "./provider";

// Google Gemini client
export { GoogleClient } from "./google";
export type { CompletionResult, CompleteOptions } from "./google";

// Prompt builders
export { buildTranslatePrompt } from "./prompts/translate";
export { buildLinkedInAdaptPrompt } from "./prompts/adapt-linkedin";
export { buildTwitterAdaptPrompt } from "./prompts/adapt-twitter";
export { buildChannelProfilePrompt } from "./prompts/channel-profile";
export { summarizeSourceForGeneration } from "./source-summarizer";
export { estimateAiCost, recordAiTelemetry } from "./telemetry";
export { createPromptCacheKey, readPromptCache, writePromptCache } from "./prompt-cache";

// Channel profiler
export { ChannelProfiler } from "./channel-profiler";

// Adaptation engine
export {
  AdaptationEngine,
  extractPlainText,
  isEnglish,
  fitsLengthLimit,
  hasHashtags,
  runQualityChecks,
  splitIntoThread,
} from "./adaptation-engine";
export type { AdaptationInput, AdaptationResult, QualityCheckResult } from "./adaptation-engine";
