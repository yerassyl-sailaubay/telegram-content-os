import { GoogleGenAI } from "@google/genai";
import type {
  AdaptationRequest,
  AdaptationOptions,
  AdaptedContent,
  ChannelProfileRequest,
  ChannelProfileResult,
  OpenRouterRequest,
  OpenRouterMessage,
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

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_TIMEOUT_MS = 60_000;

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

async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isRetryable = error instanceof AIProviderError && error.retryable;

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
      await sleep(delay);
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Completion result
// ---------------------------------------------------------------------------

export interface CompletionResult {
  content: string;
  model: string;
  tokenUsage: TokenUsage;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface CompleteOptions extends RetryOptions {
  timeoutMs?: number;
}

export class GoogleClient implements AIProvider {
  private client: GoogleGenAI | null = null;
  private cachedApiKey: string | null = null;

  private getApiKey(): string {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new AIProviderError(
        "GEMINI_API_KEY environment variable is not set. Add it to your .env.local file.",
        0,
        false,
      );
    }
    return key;
  }

  private getClient(): GoogleGenAI {
    const key = this.getApiKey();
    if (!this.client || this.cachedApiKey !== key) {
      this.client = new GoogleGenAI({ apiKey: key });
      this.cachedApiKey = key;
    }
    return this.client;
  }

  // ---- Message format mapping --------------------------------------------

  private mapMessages(messages: OpenRouterMessage[]): {
    systemInstruction: string | undefined;
    contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
  } {
    let systemInstruction: string | undefined;
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemInstruction = systemInstruction
          ? `${systemInstruction}\n\n${msg.content}`
          : msg.content;
      } else {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    return { systemInstruction, contents };
  }

  // ---- Low-level completion ---------------------------------------------

  async complete(
    request: OpenRouterRequest,
    options: CompleteOptions = {},
  ): Promise<CompletionResult> {
    const ai = this.getClient();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    return withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const { systemInstruction, contents } = this.mapMessages(request.messages);

        const response = await ai.models.generateContent({
          model: request.model,
          contents,
          config: {
            systemInstruction,
            temperature: request.temperature,
            maxOutputTokens: request.max_tokens,
            abortSignal: controller.signal,
          },
        });

        const text = response.text ?? "";
        const usage = response.usageMetadata;

        return {
          content: text,
          model: request.model,
          tokenUsage: {
            promptTokens: usage?.promptTokenCount ?? 0,
            completionTokens: usage?.candidatesTokenCount ?? 0,
            totalTokens: usage?.totalTokenCount ?? 0,
          },
        };
      } catch (error) {
        if (error instanceof AIProviderError) {
          throw error;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          throw new AIProviderError(`Request timed out after ${timeoutMs}ms`, 408, true);
        }

        // Handle Google SDK ApiError
        const status = (error as { status?: number }).status;
        if (typeof status === "number") {
          const message = error instanceof Error ? error.message : `Google AI API error: ${status}`;
          throw new AIProviderError(message, status, RETRYABLE_STATUS_CODES.has(status));
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

  async completeWithFallback(
    request: OpenRouterRequest,
    options: CompleteOptions = {},
  ): Promise<CompletionResult> {
    try {
      return await this.complete(request, options);
    } catch (error) {
      if (
        error instanceof AIProviderError &&
        (error.statusCode === 503 || error.statusCode === 502)
      ) {
        for (const tier of FALLBACK_ORDER) {
          const fallbackModel = AI_MODELS[tier];
          if (fallbackModel.id === request.model) continue;

          try {
            return await this.complete({ ...request, model: fallbackModel.id }, options);
          } catch {
            continue;
          }
        }
      }

      throw error;
    }
  }

  // ---- AIProvider interface ---------------------------------------------

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
        temperature: 0.3,
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
        temperature: 0.7,
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
          translationResult.tokenUsage.promptTokens + adaptResult.tokenUsage.promptTokens,
        completionTokens:
          translationResult.tokenUsage.completionTokens + adaptResult.tokenUsage.completionTokens,
        totalTokens: translationResult.tokenUsage.totalTokens + adaptResult.tokenUsage.totalTokens,
      },
    };
  }

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

function parseJsonResponse<T>(content: string): T {
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
