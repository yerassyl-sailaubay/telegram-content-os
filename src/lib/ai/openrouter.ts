/**
 * OpenRouter AI client.
 *
 * Implements the AIProvider interface using the OpenRouter API.
 * Features:
 * - Lazy API key validation (fails at call time, not import time)
 * - Exponential backoff retry for 429/5xx errors
 * - Model fallback when primary model is unavailable
 * - Token usage tracking per request
 * - Configurable timeout via AbortSignal
 */

import type {
  AdaptationRequest,
  AdaptationOptions,
  AdaptedContent,
  ChannelProfileRequest,
  ChannelProfileResult,
  OpenRouterRequest,
  OpenRouterResponse,
  TokenUsage,
  ModelTier,
} from "./types";
import { AI_MODELS, AIProviderError } from "./types";
import type { AIProvider } from "./provider";
import { buildTranslatePrompt } from "./prompts/translate";
import { buildLinkedInAdaptPrompt } from "./prompts/adapt-linkedin";
import { buildTwitterAdaptPrompt } from "./prompts/adapt-twitter";
import { buildChannelProfilePrompt } from "./prompts/channel-profile";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/** HTTP status codes that warrant a retry. */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/** Default configuration. */
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_TIMEOUT_MS = 30_000;

/** Fallback order: pro → default → fast */
const FALLBACK_ORDER: ModelTier[] = ["default", "fast"];

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isRetryable =
        error instanceof AIProviderError && error.retryable;

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
      await sleep(delay);
    }
  }

  // Unreachable but satisfies TS
  throw lastError;
}

// ---------------------------------------------------------------------------
// Completion result
// ---------------------------------------------------------------------------

/** Parsed result from a single OpenRouter completion call. */
export interface CompletionResult {
  content: string;
  model: string;
  tokenUsage: TokenUsage;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/** Options for a single completion call. */
export interface CompleteOptions extends RetryOptions {
  timeoutMs?: number;
}

/**
 * OpenRouter client implementing the AIProvider interface.
 *
 * API key is validated lazily — construction never throws.
 * This follows the project's lazy-init pattern (same as DB client).
 */
export class OpenRouterClient implements AIProvider {
  /**
   * Returns the API key from environment, throwing if missing.
   * Called at request time, NOT at construction time.
   */
  private getApiKey(): string {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      throw new AIProviderError(
        "OPENROUTER_API_KEY environment variable is not set. " +
          "Add it to your .env.local file.",
        0,
        false,
      );
    }
    return key;
  }

  // ---- Low-level completion ---------------------------------------------

  /**
   * Makes a single chat completion request to OpenRouter.
   * Retries on transient errors with exponential backoff.
   */
  async complete(
    request: OpenRouterRequest,
    options: CompleteOptions = {},
  ): Promise<CompletionResult> {
    const apiKey = this.getApiKey();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    return withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
            "X-Title": "Telegram Content OS",
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({
            error: { message: `HTTP ${response.status}` },
          }));

          const message =
            (errorBody as { error?: { message?: string } })?.error?.message ??
            `OpenRouter API error: ${response.status}`;

          throw new AIProviderError(
            message,
            response.status,
            RETRYABLE_STATUS_CODES.has(response.status),
          );
        }

        const data = (await response.json()) as OpenRouterResponse;

        const content = data.choices[0]?.message?.content ?? "";

        return {
          content,
          model: data.model,
          tokenUsage: {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          },
        };
      } catch (error) {
        if (error instanceof AIProviderError) {
          throw error;
        }

        // Handle AbortError (timeout)
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new AIProviderError(
            `Request timed out after ${timeoutMs}ms`,
            408,
            true,
          );
        }

        // Network errors are retryable
        throw new AIProviderError(
          `Network error: ${error instanceof Error ? error.message : String(error)}`,
          0,
          true,
        );
      } finally {
        clearTimeout(timeoutId);
      }
    }, options);
  }

  /**
   * Attempts completion with model fallback.
   * If the primary model fails after all retries (503 = unavailable),
   * falls back through cheaper models in order.
   */
  async completeWithFallback(
    request: OpenRouterRequest,
    options: CompleteOptions = {},
  ): Promise<CompletionResult> {
    try {
      return await this.complete(request, options);
    } catch (error) {
      // Only fallback on model-unavailable errors (503)
      if (
        error instanceof AIProviderError &&
        (error.statusCode === 503 || error.statusCode === 502)
      ) {
        for (const tier of FALLBACK_ORDER) {
          const fallbackModel = AI_MODELS[tier];
          // Skip if it's the same model that just failed
          if (fallbackModel.id === request.model) continue;

          try {
            return await this.complete(
              { ...request, model: fallbackModel.id },
              options,
            );
          } catch {
            // Try next fallback
            continue;
          }
        }
      }

      throw error;
    }
  }

  // ---- AIProvider interface ---------------------------------------------

  /**
   * 2-step pipeline: translate (RU → EN literal) → adapt (platform-specific EN).
   */
  async adaptContent(
    request: AdaptationRequest,
    options: AdaptationOptions = {},
  ): Promise<AdaptedContent> {
    const modelTier = options.modelTier ?? "default";
    const model = AI_MODELS[modelTier];
    const completeOptions: CompleteOptions = {
      maxRetries: options.maxRetries,
      timeoutMs: options.timeoutMs,
    };

    // Step 1: Literal translation
    const translateMessages = buildTranslatePrompt({
      content: request.content,
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
    });

    const translationResult = await this.completeWithFallback(
      {
        model: model.id,
        messages: translateMessages,
        temperature: 0.3, // Low temperature for faithful translation
      },
      completeOptions,
    );

    // Step 2: Platform-specific adaptation
    const adaptMessages =
      request.platform === "linkedin"
        ? buildLinkedInAdaptPrompt({
            translatedContent: translationResult.content,
            channelProfile: request.channelProfile,
          })
        : buildTwitterAdaptPrompt({
            translatedContent: translationResult.content,
            channelProfile: request.channelProfile,
          });

    const adaptResult = await this.completeWithFallback(
      {
        model: model.id,
        messages: adaptMessages,
        temperature: 0.7, // Higher temperature for creative adaptation
      },
      completeOptions,
    );

    return {
      content: adaptResult.content,
      translatedContent: translationResult.content,
      platform: request.platform,
      modelUsed: adaptResult.model,
      tokenUsage: {
        promptTokens:
          translationResult.tokenUsage.promptTokens +
          adaptResult.tokenUsage.promptTokens,
        completionTokens:
          translationResult.tokenUsage.completionTokens +
          adaptResult.tokenUsage.completionTokens,
        totalTokens:
          translationResult.tokenUsage.totalTokens +
          adaptResult.tokenUsage.totalTokens,
      },
    };
  }

  /**
   * Analyzes channel posts to extract profile (niche, tone, topics, language).
   */
  async analyzeChannelProfile(
    request: ChannelProfileRequest,
    options: AdaptationOptions = {},
  ): Promise<ChannelProfileResult> {
    const modelTier = options.modelTier ?? "default";
    const model = AI_MODELS[modelTier];
    const completeOptions: CompleteOptions = {
      maxRetries: options.maxRetries,
      timeoutMs: options.timeoutMs,
    };

    const messages = buildChannelProfilePrompt(request);

    const result = await this.completeWithFallback(
      {
        model: model.id,
        messages,
        temperature: 0.3,
      },
      completeOptions,
    );

    // Parse JSON response (may be wrapped in markdown code fences)
    const parsed = parseJsonResponse<{
      niche: string;
      tone: string;
      topTopics: string[];
      language: string;
    }>(result.content);

    return {
      niche: parsed.niche,
      tone: parsed.tone,
      topTopics: parsed.topTopics,
      language: parsed.language,
      modelUsed: result.model,
      tokenUsage: result.tokenUsage,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses a JSON response that may be wrapped in markdown code fences.
 */
function parseJsonResponse<T>(content: string): T {
  // Strip markdown code fences if present
  let cleaned = content.trim();
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new AIProviderError(
      `Failed to parse AI response as JSON: ${cleaned.substring(0, 200)}`,
      0,
      false,
    );
  }
}
