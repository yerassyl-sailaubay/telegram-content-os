/**
 * AI provider type definitions.
 *
 * Covers models, requests, responses, and token usage tracking
 * for the OpenRouter-based content adaptation pipeline.
 */

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------

/** Target platforms for content adaptation. */
export type Platform = "linkedin" | "twitter";

// ---------------------------------------------------------------------------
// AI Models
// ---------------------------------------------------------------------------

/** Configuration for an AI model accessible via OpenRouter. */
export interface AIModel {
  /** OpenRouter model identifier (e.g., "openai/gpt-4.1-mini"). */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Upstream provider (e.g., "openai", "anthropic"). */
  provider: string;
  /** Maximum context window in tokens. */
  maxTokens: number;
  /** Cost per 1,000 input tokens in USD. */
  costPer1kInputTokens: number;
  /** Cost per 1,000 output tokens in USD. */
  costPer1kOutputTokens: number;
}

/** Available model tiers for content adaptation. */
export type ModelTier = "default" | "fast" | "pro";

/** Registry of available models keyed by tier. */
export const AI_MODELS: Record<ModelTier, AIModel> = {
  default: {
    id: "openai/gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "openai",
    maxTokens: 128_000,
    costPer1kInputTokens: 0.0004,
    costPer1kOutputTokens: 0.0016,
  },
  fast: {
    id: "anthropic/claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    maxTokens: 200_000,
    costPer1kInputTokens: 0.0008,
    costPer1kOutputTokens: 0.004,
  },
  pro: {
    id: "openai/gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    maxTokens: 1_000_000,
    costPer1kInputTokens: 0.002,
    costPer1kOutputTokens: 0.008,
  },
} as const;

// ---------------------------------------------------------------------------
// Token usage
// ---------------------------------------------------------------------------

/** Token consumption for a single AI request. */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ---------------------------------------------------------------------------
// Adaptation request / response
// ---------------------------------------------------------------------------

/** Input for the content adaptation pipeline. */
export interface AdaptationRequest {
  /** Original content text (typically in Russian). */
  content: string;
  /** Source language code (default: "ru"). */
  sourceLanguage?: string;
  /** Target language for translation (default: "en"). */
  targetLanguage?: string;
  /** Target platform for adaptation. */
  platform: Platform;
  /** Optional channel profile context for tone matching. */
  channelProfile?: ChannelProfile;
}

/** Options for controlling the adaptation pipeline. */
export interface AdaptationOptions {
  /** Model tier to use. Defaults to "default". */
  modelTier?: ModelTier;
  /** Request timeout in milliseconds. Defaults to 30_000. */
  timeoutMs?: number;
  /** Maximum retry attempts. Defaults to 3. */
  maxRetries?: number;
}

/** Result of the full adaptation pipeline (translate + adapt). */
export interface AdaptedContent {
  /** The adapted content ready for the target platform. */
  content: string;
  /** Literal translation (intermediate step). */
  translatedContent: string;
  /** Platform this was adapted for. */
  platform: Platform;
  /** Model used for the final adaptation. */
  modelUsed: string;
  /** Combined token usage across all pipeline steps. */
  tokenUsage: TokenUsage;
}

// ---------------------------------------------------------------------------
// Channel profile analysis
// ---------------------------------------------------------------------------

/** Channel profile data used for tone-matching. */
export interface ChannelProfile {
  niche: string | null;
  tone: string | null;
  topTopics: string[];
  language: string;
}

/** Input for channel profile analysis. */
export interface ChannelProfileRequest {
  /** Sample posts from the channel (most recent). */
  posts: string[];
  /** Channel name for context. */
  channelName: string;
}

/** Result of channel profile analysis. */
export interface ChannelProfileResult {
  niche: string;
  tone: string;
  topTopics: string[];
  language: string;
  modelUsed: string;
  tokenUsage: TokenUsage;
}

// ---------------------------------------------------------------------------
// OpenRouter API types
// ---------------------------------------------------------------------------

/** OpenRouter chat completion request body. */
export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
}

/** OpenRouter message format. */
export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** OpenRouter chat completion response. */
export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** A single choice in the OpenRouter response. */
export interface OpenRouterChoice {
  index: number;
  message: {
    role: "assistant";
    content: string;
  };
  finish_reason: string;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Error thrown by the AI provider on API failures. */
export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

// ---------------------------------------------------------------------------
// Content Generation pipeline (distinct from Adaptation pipeline)
// ---------------------------------------------------------------------------

export type GenerationType = "source_to_telegram" | "repurpose" | "idea_to_draft" | "calendar_fill";

export type RepurposeMode = "shorter" | "thread" | "poll";

export interface GenerationRequest {
  type: GenerationType;
  sourceContent: string;
  channelProfile?: ChannelProfile;
  options?: GenerationOptions;
}

export interface GenerationOptions {
  modelTier?: ModelTier;
  maxLength?: number;
  numVariations?: number;
  repurposeMode?: RepurposeMode;
}

export interface GenerationResult {
  content: string | string[];
  type: GenerationType;
  modelUsed: string;
  tokenUsage: TokenUsage;
}

export interface CalendarFillSuggestion {
  date: string;
  suggestedContent: string;
  sourceId?: string;
  sourceType: "draft" | "idea" | "repurpose";
  confidence: number;
}
