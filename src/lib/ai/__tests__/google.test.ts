import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AI_MODELS, AIProviderError, type AdaptationRequest } from "../types";
import { buildTranslatePrompt } from "../prompts/translate";
import { buildLinkedInAdaptPrompt } from "../prompts/adapt-linkedin";
import { buildTwitterAdaptPrompt } from "../prompts/adapt-twitter";
import { buildChannelProfilePrompt } from "../prompts/channel-profile";

// ---------------------------------------------------------------------------
// Mock @google/genai
// ---------------------------------------------------------------------------

const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return {
      models: {
        generateContent: mockGenerateContent,
      },
    };
  }),
}));

import { GoogleClient } from "../google";

// ---------------------------------------------------------------------------
// Helper: mock Gemini response
// ---------------------------------------------------------------------------

function mockGeminiResponse(
  text: string,
  usage?: Partial<{
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  }>,
) {
  return {
    text,
    usageMetadata: {
      promptTokenCount: usage?.promptTokenCount ?? 100,
      candidatesTokenCount: usage?.candidatesTokenCount ?? 50,
      totalTokenCount: usage?.totalTokenCount ?? 150,
    },
  };
}

function mockGeminiError(status: number, message: string): Error {
  const error = new Error(message);
  (error as Error & { status: number }).status = status;
  return error;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockGenerateContent.mockReset();
  process.env.GEMINI_API_KEY = "test-gemini-key-12345";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GEMINI_API_KEY;
});

// ---------------------------------------------------------------------------
// Prompt template tests (shared with old test — these test pure functions)
// ---------------------------------------------------------------------------

describe("Prompt Templates", () => {
  describe("buildTranslatePrompt", () => {
    it("returns system and user messages for RU->EN translation", () => {
      const messages = buildTranslatePrompt({
        content: "Привет мир, это тестовый пост",
        sourceLanguage: "ru",
        targetLanguage: "en",
      });

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("system");
      expect(messages[1].role).toBe("user");
      expect(messages[1].content).toContain("Привет мир, это тестовый пост");
    });

    it("emphasizes literal translation in system prompt", () => {
      const messages = buildTranslatePrompt({
        content: "test",
        sourceLanguage: "ru",
        targetLanguage: "en",
      });

      const systemPrompt = messages[0].content.toLowerCase();
      expect(systemPrompt).toContain("literal");
    });

    it("uses default languages when not provided", () => {
      const messages = buildTranslatePrompt({ content: "test" });

      const userContent = messages[1].content;
      expect(userContent).toContain("Russian");
      expect(userContent).toContain("English");
    });
  });

  describe("buildLinkedInAdaptPrompt", () => {
    it("returns system and user messages for LinkedIn adaptation", () => {
      const messages = buildLinkedInAdaptPrompt({
        translatedContent: "Hello world, this is a test post about AI",
      });

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("system");
      expect(messages[1].role).toBe("user");
    });

    it("specifies professional tone in system prompt", () => {
      const messages = buildLinkedInAdaptPrompt({
        translatedContent: "test content",
      });

      const systemPrompt = messages[0].content.toLowerCase();
      expect(systemPrompt).toContain("professional");
    });

    it("requests thought-provoking question", () => {
      const messages = buildLinkedInAdaptPrompt({
        translatedContent: "test content",
      });

      const systemPrompt = messages[0].content.toLowerCase();
      expect(systemPrompt).toContain("question");
    });

    it("specifies 1-2 hashtags constraint", () => {
      const messages = buildLinkedInAdaptPrompt({
        translatedContent: "test content",
      });

      const systemPrompt = messages[0].content;
      expect(systemPrompt).toMatch(/1[-–]2\s*hashtag/i);
    });

    it("specifies character limit under 3000", () => {
      const messages = buildLinkedInAdaptPrompt({
        translatedContent: "test content",
      });

      const systemPrompt = messages[0].content;
      expect(systemPrompt).toMatch(/3[,.]?000/);
    });

    it("includes channel profile context when provided", () => {
      const messages = buildLinkedInAdaptPrompt({
        translatedContent: "test content",
        channelProfile: {
          niche: "AI/ML",
          tone: "analytical",
          topTopics: ["machine learning", "startups"],
          language: "ru",
        },
      });

      const systemPrompt = messages[0].content;
      expect(systemPrompt).toContain("AI/ML");
      expect(systemPrompt).toContain("analytical");
    });
  });

  describe("buildTwitterAdaptPrompt", () => {
    it("returns system and user messages for Twitter adaptation", () => {
      const messages = buildTwitterAdaptPrompt({
        translatedContent: "Hello world, this is a test post about AI",
      });

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("system");
      expect(messages[1].role).toBe("user");
    });

    it("specifies conversational/punchy tone", () => {
      const messages = buildTwitterAdaptPrompt({
        translatedContent: "test content",
      });

      const systemPrompt = messages[0].content.toLowerCase();
      expect(systemPrompt.includes("conversational") || systemPrompt.includes("punchy")).toBe(true);
    });

    it("specifies 2-5 hashtags constraint", () => {
      const messages = buildTwitterAdaptPrompt({
        translatedContent: "test content",
      });

      const systemPrompt = messages[0].content;
      expect(systemPrompt).toMatch(/2[-–]5\s*hashtag/i);
    });

    it("specifies 280 character limit per tweet", () => {
      const messages = buildTwitterAdaptPrompt({
        translatedContent: "test content",
      });

      const systemPrompt = messages[0].content;
      expect(systemPrompt).toContain("280");
    });

    it("mentions emoji usage", () => {
      const messages = buildTwitterAdaptPrompt({
        translatedContent: "test content",
      });

      const systemPrompt = messages[0].content.toLowerCase();
      expect(systemPrompt).toContain("emoji");
    });

    it("mentions thread splitting for long content", () => {
      const messages = buildTwitterAdaptPrompt({
        translatedContent: "test content",
      });

      const systemPrompt = messages[0].content.toLowerCase();
      expect(systemPrompt).toContain("thread");
    });

    it("includes channel profile context when provided", () => {
      const messages = buildTwitterAdaptPrompt({
        translatedContent: "test content",
        channelProfile: {
          niche: "Web Dev",
          tone: "casual",
          topTopics: ["React", "TypeScript"],
          language: "ru",
        },
      });

      const systemPrompt = messages[0].content;
      expect(systemPrompt).toContain("Web Dev");
    });
  });

  describe("buildChannelProfilePrompt", () => {
    it("returns system and user messages", () => {
      const messages = buildChannelProfilePrompt({
        posts: ["Post 1", "Post 2"],
        channelName: "Test Channel",
      });

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("system");
      expect(messages[1].role).toBe("user");
    });

    it("includes channel name in user prompt", () => {
      const messages = buildChannelProfilePrompt({
        posts: ["Post 1"],
        channelName: "My Channel",
      });

      expect(messages[1].content).toContain("My Channel");
    });

    it("includes all sample posts in user prompt", () => {
      const posts = ["First post content", "Second post content", "Third post"];
      const messages = buildChannelProfilePrompt({
        posts,
        channelName: "Test",
      });

      for (const post of posts) {
        expect(messages[1].content).toContain(post);
      }
    });

    it("requests JSON output with niche, tone, topics, language fields", () => {
      const messages = buildChannelProfilePrompt({
        posts: ["Post 1"],
        channelName: "Test",
      });

      const systemPrompt = messages[0].content.toLowerCase();
      expect(systemPrompt).toContain("json");
      expect(systemPrompt).toContain("niche");
      expect(systemPrompt).toContain("tone");
      expect(systemPrompt).toContain("topic");
      expect(systemPrompt).toContain("language");
    });

    it("supports incremental profile updates when existing profile is provided", () => {
      const messages = buildChannelProfilePrompt({
        posts: ["A new post"],
        channelName: "Test",
        existingProfile: {
          niche: "Tech",
          tone: "Casual",
          topTopics: ["AI"],
          language: "en",
        },
      });

      expect(messages[1].content).toContain("Existing profile");
      expect(messages[1].content).toContain('"niche":"Tech"');
    });
  });
});

// ---------------------------------------------------------------------------
// AI_MODELS config tests
// ---------------------------------------------------------------------------

describe("AI_MODELS", () => {
  it("has default, fast, and pro tiers", () => {
    expect(AI_MODELS).toHaveProperty("default");
    expect(AI_MODELS).toHaveProperty("fast");
    expect(AI_MODELS).toHaveProperty("pro");
  });

  it("each model has required fields", () => {
    for (const [, model] of Object.entries(AI_MODELS)) {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(model.provider).toBeTruthy();
      expect(model.maxTokens).toBeGreaterThan(0);
      expect(model.costPer1kInputTokens).toBeGreaterThan(0);
      expect(model.costPer1kOutputTokens).toBeGreaterThan(0);
    }
  });

  it("default tier is Gemini 3 Flash", () => {
    expect(AI_MODELS.default.id).toBe("gemini-3-flash-preview");
  });

  it("fast tier is Gemini 3 Flash", () => {
    expect(AI_MODELS.fast.id).toBe("gemini-3-flash-preview");
  });

  it("pro tier is Gemini 3 Pro", () => {
    expect(AI_MODELS.pro.id).toBe("gemini-3-pro-preview");
  });

  it("all models use Google provider", () => {
    for (const [, model] of Object.entries(AI_MODELS)) {
      expect(model.provider).toBe("google");
    }
  });
});

// ---------------------------------------------------------------------------
// GoogleClient tests
// ---------------------------------------------------------------------------

describe("GoogleClient", () => {
  describe("constructor / lazy init", () => {
    it("does NOT throw if GEMINI_API_KEY is missing at construction time", () => {
      delete process.env.GEMINI_API_KEY;
      expect(() => new GoogleClient()).not.toThrow();
    });

    it("throws AIProviderError when making a request without API key", async () => {
      delete process.env.GEMINI_API_KEY;
      const client = new GoogleClient();

      await expect(
        client.complete({
          model: "gemini-3-flash-preview",
          messages: [{ role: "user", content: "hello" }],
        }),
      ).rejects.toThrow(AIProviderError);
    });

    it("error message mentions GEMINI_API_KEY when key is missing", async () => {
      delete process.env.GEMINI_API_KEY;
      const client = new GoogleClient();

      await expect(
        client.complete({
          model: "gemini-3-flash-preview",
          messages: [{ role: "user", content: "hello" }],
        }),
      ).rejects.toThrow(/GEMINI_API_KEY/);
    });

    it("lazily creates the GoogleGenAI client on first request", async () => {
      const { GoogleGenAI } = await import("@google/genai");

      mockGenerateContent.mockResolvedValueOnce(mockGeminiResponse("hello"));

      const client = new GoogleClient();
      // Not yet called at construction
      expect(GoogleGenAI).not.toHaveBeenCalled();

      await client.complete({
        model: "gemini-3-flash-preview",
        messages: [{ role: "user", content: "hello" }],
      });

      // Now called
      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: "test-gemini-key-12345" });
    });
  });

  describe("complete", () => {
    it("returns content and token usage from response", async () => {
      mockGenerateContent.mockResolvedValueOnce(
        mockGeminiResponse("Translated text", {
          promptTokenCount: 200,
          candidatesTokenCount: 100,
          totalTokenCount: 300,
        }),
      );

      const client = new GoogleClient();
      const result = await client.complete({
        model: "gemini-3-flash-preview",
        messages: [{ role: "user", content: "translate this" }],
      });

      expect(result.content).toBe("Translated text");
      expect(result.tokenUsage.promptTokens).toBe(200);
      expect(result.tokenUsage.completionTokens).toBe(100);
      expect(result.tokenUsage.totalTokens).toBe(300);
      expect(result.model).toBe("gemini-3-flash-preview");
    });

    it("passes model, contents, and config to generateContent", async () => {
      mockGenerateContent.mockResolvedValueOnce(mockGeminiResponse("response"));

      const client = new GoogleClient();
      await client.complete({
        model: "gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are helpful." },
          { role: "user", content: "hello" },
        ],
        temperature: 0.5,
        max_tokens: 1000,
      });

      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: "hello" }] }],
        config: {
          systemInstruction: "You are helpful.",
          temperature: 0.5,
          maxOutputTokens: 1000,
          abortSignal: expect.any(AbortSignal),
        },
      });
    });

    it("maps system messages into systemInstruction (concatenated)", async () => {
      mockGenerateContent.mockResolvedValueOnce(mockGeminiResponse("response"));

      const client = new GoogleClient();
      await client.complete({
        model: "gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Rule 1" },
          { role: "system", content: "Rule 2" },
          { role: "user", content: "hello" },
        ],
      });

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            systemInstruction: "Rule 1\n\nRule 2",
          }),
        }),
      );
    });

    it("maps assistant messages to model role", async () => {
      mockGenerateContent.mockResolvedValueOnce(mockGeminiResponse("response"));

      const client = new GoogleClient();
      await client.complete({
        model: "gemini-3-flash-preview",
        messages: [
          { role: "user", content: "hello" },
          { role: "assistant", content: "hi there" },
          { role: "user", content: "how are you?" },
        ],
      });

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: [
            { role: "user", parts: [{ text: "hello" }] },
            { role: "model", parts: [{ text: "hi there" }] },
            { role: "user", parts: [{ text: "how are you?" }] },
          ],
        }),
      );
    });

    it("handles missing usageMetadata gracefully (defaults to 0)", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: "response without usage",
        usageMetadata: undefined,
      });

      const client = new GoogleClient();
      const result = await client.complete({
        model: "gemini-3-flash-preview",
        messages: [{ role: "user", content: "hello" }],
      });

      expect(result.tokenUsage.promptTokens).toBe(0);
      expect(result.tokenUsage.completionTokens).toBe(0);
      expect(result.tokenUsage.totalTokens).toBe(0);
    });

    it("handles undefined text in response (defaults to empty string)", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: undefined,
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 0,
          totalTokenCount: 10,
        },
      });

      const client = new GoogleClient();
      const result = await client.complete({
        model: "gemini-3-flash-preview",
        messages: [{ role: "user", content: "hello" }],
      });

      expect(result.content).toBe("");
    });
  });

  describe("error handling", () => {
    it("throws AIProviderError on 400 (non-retryable)", async () => {
      mockGenerateContent.mockRejectedValueOnce(mockGeminiError(400, "Bad request"));

      const client = new GoogleClient();

      try {
        await client.complete(
          {
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: "hello" }],
          },
          { maxRetries: 0 },
        );
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AIProviderError);
        const aiError = error as AIProviderError;
        expect(aiError.statusCode).toBe(400);
        expect(aiError.retryable).toBe(false);
      }
    });

    it("throws AIProviderError on 401 (non-retryable)", async () => {
      mockGenerateContent.mockRejectedValueOnce(mockGeminiError(401, "Unauthorized"));

      const client = new GoogleClient();

      try {
        await client.complete(
          {
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: "hello" }],
          },
          { maxRetries: 0 },
        );
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AIProviderError);
        const aiError = error as AIProviderError;
        expect(aiError.statusCode).toBe(401);
        expect(aiError.retryable).toBe(false);
      }
    });

    it("throws retryable AIProviderError on 429 (rate limit)", async () => {
      mockGenerateContent.mockRejectedValueOnce(mockGeminiError(429, "Rate limit exceeded"));

      const client = new GoogleClient();

      try {
        await client.complete(
          {
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: "hello" }],
          },
          { maxRetries: 0 },
        );
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AIProviderError);
        const aiError = error as AIProviderError;
        expect(aiError.statusCode).toBe(429);
        expect(aiError.retryable).toBe(true);
      }
    });

    it("throws retryable AIProviderError on 500 (server error)", async () => {
      mockGenerateContent.mockRejectedValueOnce(mockGeminiError(500, "Internal server error"));

      const client = new GoogleClient();

      try {
        await client.complete(
          {
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: "hello" }],
          },
          { maxRetries: 0 },
        );
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AIProviderError);
        const aiError = error as AIProviderError;
        expect(aiError.statusCode).toBe(500);
        expect(aiError.retryable).toBe(true);
      }
    });

    it("throws retryable AIProviderError on 502 (bad gateway)", async () => {
      mockGenerateContent.mockRejectedValueOnce(mockGeminiError(502, "Bad gateway"));

      const client = new GoogleClient();

      try {
        await client.complete(
          {
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: "hello" }],
          },
          { maxRetries: 0 },
        );
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AIProviderError);
        const aiError = error as AIProviderError;
        expect(aiError.statusCode).toBe(502);
        expect(aiError.retryable).toBe(true);
      }
    });

    it("throws retryable AIProviderError on 503 (service unavailable)", async () => {
      mockGenerateContent.mockRejectedValueOnce(mockGeminiError(503, "Service unavailable"));

      const client = new GoogleClient();

      try {
        await client.complete(
          {
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: "hello" }],
          },
          { maxRetries: 0 },
        );
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AIProviderError);
        const aiError = error as AIProviderError;
        expect(aiError.statusCode).toBe(503);
        expect(aiError.retryable).toBe(true);
      }
    });

    it("throws retryable AIProviderError on 504 (gateway timeout)", async () => {
      mockGenerateContent.mockRejectedValueOnce(mockGeminiError(504, "Gateway timeout"));

      const client = new GoogleClient();

      try {
        await client.complete(
          {
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: "hello" }],
          },
          { maxRetries: 0 },
        );
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AIProviderError);
        const aiError = error as AIProviderError;
        expect(aiError.statusCode).toBe(504);
        expect(aiError.retryable).toBe(true);
      }
    });

    it("throws retryable AIProviderError on network errors", async () => {
      mockGenerateContent.mockRejectedValueOnce(new TypeError("fetch failed"));

      const client = new GoogleClient();

      try {
        await client.complete(
          {
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: "hello" }],
          },
          { maxRetries: 0 },
        );
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AIProviderError);
        const aiError = error as AIProviderError;
        expect(aiError.statusCode).toBe(0);
        expect(aiError.retryable).toBe(true);
        expect(aiError.message).toContain("Network error");
      }
    });

    it("throws AIProviderError with 408 on timeout (AbortError)", async () => {
      const abortError = new DOMException("The operation was aborted", "AbortError");
      mockGenerateContent.mockRejectedValueOnce(abortError);

      const client = new GoogleClient();

      try {
        await client.complete(
          {
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: "hello" }],
          },
          { maxRetries: 0, timeoutMs: 5000 },
        );
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AIProviderError);
        const aiError = error as AIProviderError;
        expect(aiError.statusCode).toBe(408);
        expect(aiError.retryable).toBe(true);
        expect(aiError.message).toContain("timed out");
      }
    });
  });

  describe("retry with backoff", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("retries on 429 and succeeds on second attempt", async () => {
      mockGenerateContent
        .mockRejectedValueOnce(mockGeminiError(429, "Rate limited"))
        .mockResolvedValueOnce(mockGeminiResponse("Success"));

      const client = new GoogleClient();
      const promise = client.complete(
        {
          model: "gemini-3-flash-preview",
          messages: [{ role: "user", content: "hello" }],
        },
        { maxRetries: 3, baseDelayMs: 10 },
      );

      await vi.advanceTimersByTimeAsync(5000);

      const result = await promise;
      expect(result.content).toBe("Success");
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("retries on 500 server errors", async () => {
      mockGenerateContent
        .mockRejectedValueOnce(mockGeminiError(500, "Server error"))
        .mockRejectedValueOnce(mockGeminiError(502, "Bad gateway"))
        .mockResolvedValueOnce(mockGeminiResponse("Recovered"));

      const client = new GoogleClient();
      const promise = client.complete(
        {
          model: "gemini-3-flash-preview",
          messages: [{ role: "user", content: "hello" }],
        },
        { maxRetries: 3, baseDelayMs: 10 },
      );

      await vi.advanceTimersByTimeAsync(10000);

      const result = await promise;
      expect(result.content).toBe("Recovered");
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it("does not retry on non-retryable errors (400)", async () => {
      mockGenerateContent.mockRejectedValueOnce(mockGeminiError(400, "Bad request"));

      const client = new GoogleClient();
      await expect(
        client.complete(
          {
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: "hello" }],
          },
          { maxRetries: 3, baseDelayMs: 10 },
        ),
      ).rejects.toThrow("Bad request");

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("throws after exhausting retries", async () => {
      vi.useRealTimers();

      mockGenerateContent.mockRejectedValue(mockGeminiError(429, "Rate limited"));

      const client = new GoogleClient();
      await expect(
        client.complete(
          {
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: "hello" }],
          },
          { maxRetries: 2, baseDelayMs: 1 },
        ),
      ).rejects.toThrow("Rate limited");

      // initial + 2 retries = 3
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });
  });

  describe("completeWithFallback", () => {
    it("returns result on success without needing fallback", async () => {
      mockGenerateContent.mockResolvedValueOnce(mockGeminiResponse("Direct success"));

      const client = new GoogleClient();
      const result = await client.completeWithFallback({
        model: "gemini-3-pro-preview",
        messages: [{ role: "user", content: "hello" }],
      });

      expect(result.content).toBe("Direct success");
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("falls back to other models on 503", async () => {
      // Primary model fails with 503 (exhausts retries)
      mockGenerateContent
        .mockRejectedValueOnce(mockGeminiError(503, "Model unavailable"))
        .mockRejectedValueOnce(mockGeminiError(503, "Model unavailable"))
        .mockRejectedValueOnce(mockGeminiError(503, "Model unavailable"))
        .mockRejectedValueOnce(mockGeminiError(503, "Model unavailable"))
        // Fallback model succeeds
        .mockResolvedValueOnce(
          mockGeminiResponse("Fallback response", {
            promptTokenCount: 80,
            candidatesTokenCount: 40,
            totalTokenCount: 120,
          }),
        );

      vi.useRealTimers();
      const client = new GoogleClient();

      const result = await client.completeWithFallback(
        {
          model: "gemini-3-pro-preview",
          messages: [{ role: "user", content: "hello" }],
        },
        { maxRetries: 3, baseDelayMs: 1 },
      );

      expect(result.content).toBe("Fallback response");
    });

    it("falls back to other models on 502", async () => {
      mockGenerateContent
        .mockRejectedValueOnce(mockGeminiError(502, "Bad gateway"))
        .mockRejectedValueOnce(mockGeminiError(502, "Bad gateway"))
        .mockRejectedValueOnce(mockGeminiError(502, "Bad gateway"))
        .mockRejectedValueOnce(mockGeminiError(502, "Bad gateway"))
        // Fallback succeeds
        .mockResolvedValueOnce(mockGeminiResponse("Fallback on 502"));

      vi.useRealTimers();
      const client = new GoogleClient();

      const result = await client.completeWithFallback(
        {
          model: "gemini-3-pro-preview",
          messages: [{ role: "user", content: "hello" }],
        },
        { maxRetries: 3, baseDelayMs: 1 },
      );

      expect(result.content).toBe("Fallback on 502");
    });

    it("does NOT fallback on non-502/503 errors (e.g., 400)", async () => {
      mockGenerateContent.mockRejectedValueOnce(mockGeminiError(400, "Bad request"));

      const client = new GoogleClient();

      await expect(
        client.completeWithFallback(
          {
            model: "gemini-3-flash-preview",
            messages: [{ role: "user", content: "hello" }],
          },
          { maxRetries: 0 },
        ),
      ).rejects.toThrow("Bad request");

      // Only the primary attempt
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("throws if all fallbacks fail", async () => {
      // All models fail
      mockGenerateContent.mockRejectedValue(mockGeminiError(503, "All down"));

      vi.useRealTimers();
      const client = new GoogleClient();

      await expect(
        client.completeWithFallback(
          {
            model: "gemini-3-pro-preview",
            messages: [{ role: "user", content: "hello" }],
          },
          { maxRetries: 0, baseDelayMs: 1 },
        ),
      ).rejects.toThrow("All down");
    });
  });

  describe("adaptContent (full pipeline)", () => {
    it("executes 2-step pipeline: translate -> adapt", async () => {
      // Step 1: translation response
      mockGenerateContent.mockResolvedValueOnce(
        mockGeminiResponse("Hello world, this is a test post", {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          totalTokenCount: 150,
        }),
      );
      // Step 2: adaptation response
      mockGenerateContent.mockResolvedValueOnce(
        mockGeminiResponse(
          "Hello world -- a fascinating test post!\n\nWhat do you think?\n\n#AI #Tech",
          { promptTokenCount: 150, candidatesTokenCount: 80, totalTokenCount: 230 },
        ),
      );

      const client = new GoogleClient();
      const request: AdaptationRequest = {
        content: "Привет мир, это тестовый пост",
        platform: "linkedin",
      };

      const result = await client.adaptContent(request);

      expect(result.translatedContent).toBe("Hello world, this is a test post");
      expect(result.content).toContain("Hello world");
      expect(result.platform).toBe("linkedin");
      expect(result.modelUsed).toBeTruthy();
      // Token usage should be combined from both steps
      expect(result.tokenUsage.promptTokens).toBe(250);
      expect(result.tokenUsage.completionTokens).toBe(130);
      expect(result.tokenUsage.totalTokens).toBe(380);
    });

    it("uses Twitter adapt prompt for twitter platform", async () => {
      mockGenerateContent
        .mockResolvedValueOnce(mockGeminiResponse("Translated text"))
        .mockResolvedValueOnce(mockGeminiResponse("Translated text #Tech #AI"));

      const client = new GoogleClient();
      const result = await client.adaptContent({
        content: "Тестовый контент",
        platform: "twitter",
      });

      expect(result.platform).toBe("twitter");
      // Both translate and adapt calls
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("skips translation call when source and target languages already match", async () => {
      mockGenerateContent.mockResolvedValueOnce(
        mockGeminiResponse("Already English adaptation #Tech"),
      );

      const client = new GoogleClient();
      const result = await client.adaptContent({
        content: "Already English content",
        platform: "linkedin",
        sourceLanguage: "en",
        targetLanguage: "en",
      });

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(result.translatedContent).toBe("Already English content");
      expect(result.content).toContain("Already English adaptation");
    });

    it("passes channel profile to adapt prompt when provided", async () => {
      mockGenerateContent
        .mockResolvedValueOnce(mockGeminiResponse("Translated"))
        .mockResolvedValueOnce(mockGeminiResponse("Adapted"));

      const client = new GoogleClient();
      await client.adaptContent({
        content: "Тест",
        platform: "linkedin",
        channelProfile: {
          niche: "AI/ML",
          tone: "analytical",
          topTopics: ["deep learning"],
          language: "ru",
        },
      });

      // Verify the second call includes channel profile context via systemInstruction
      const secondCallArgs = mockGenerateContent.mock.calls[1][0];
      const systemInstruction = secondCallArgs.config?.systemInstruction ?? "";
      expect(systemInstruction).toContain("AI/ML");
    });

    it("uses correct model tier", async () => {
      mockGenerateContent
        .mockResolvedValueOnce(mockGeminiResponse("Translated"))
        .mockResolvedValueOnce(mockGeminiResponse("Adapted"));

      const client = new GoogleClient();
      await client.adaptContent(
        {
          content: "Тест",
          platform: "linkedin",
        },
        { modelTier: "pro" },
      );

      // Both calls should use the pro model
      expect(mockGenerateContent.mock.calls[0][0].model).toBe("gemini-3-pro-preview");
      expect(mockGenerateContent.mock.calls[1][0].model).toBe("gemini-3-pro-preview");
    });

    it("aggregates token usage from both steps", async () => {
      mockGenerateContent
        .mockResolvedValueOnce(
          mockGeminiResponse("Translated", {
            promptTokenCount: 50,
            candidatesTokenCount: 30,
            totalTokenCount: 80,
          }),
        )
        .mockResolvedValueOnce(
          mockGeminiResponse("Adapted", {
            promptTokenCount: 70,
            candidatesTokenCount: 40,
            totalTokenCount: 110,
          }),
        );

      const client = new GoogleClient();
      const result = await client.adaptContent({
        content: "Test",
        platform: "twitter",
      });

      expect(result.tokenUsage.promptTokens).toBe(120);
      expect(result.tokenUsage.completionTokens).toBe(70);
      expect(result.tokenUsage.totalTokens).toBe(190);
    });
  });

  describe("analyzeChannelProfile", () => {
    it("returns parsed channel profile", async () => {
      const profileJson = JSON.stringify({
        niche: "Technology",
        tone: "informative",
        topTopics: ["AI", "web dev", "startups"],
        language: "ru",
      });

      mockGenerateContent.mockResolvedValueOnce(
        mockGeminiResponse(profileJson, {
          promptTokenCount: 500,
          candidatesTokenCount: 100,
          totalTokenCount: 600,
        }),
      );

      const client = new GoogleClient();
      const result = await client.analyzeChannelProfile({
        posts: ["Post about AI", "Post about web dev"],
        channelName: "TechChannel",
      });

      expect(result.niche).toBe("Technology");
      expect(result.tone).toBe("informative");
      expect(result.topTopics).toEqual(["AI", "web dev", "startups"]);
      expect(result.language).toBe("ru");
      expect(result.tokenUsage.promptTokens).toBe(500);
    });

    it("handles JSON wrapped in markdown code fences", async () => {
      const wrappedJson =
        '```json\n{"niche":"Tech","tone":"casual","topTopics":["AI"],"language":"en"}\n```';

      mockGenerateContent.mockResolvedValueOnce(mockGeminiResponse(wrappedJson));

      const client = new GoogleClient();
      const result = await client.analyzeChannelProfile({
        posts: ["Post 1"],
        channelName: "Test",
      });

      expect(result.niche).toBe("Tech");
      expect(result.tone).toBe("casual");
    });

    it("handles JSON wrapped in code fences without json label", async () => {
      const wrappedJson =
        '```\n{"niche":"Tech","tone":"formal","topTopics":["crypto"],"language":"en"}\n```';

      mockGenerateContent.mockResolvedValueOnce(mockGeminiResponse(wrappedJson));

      const client = new GoogleClient();
      const result = await client.analyzeChannelProfile({
        posts: ["Post 1"],
        channelName: "Test",
      });

      expect(result.niche).toBe("Tech");
      expect(result.tone).toBe("formal");
    });

    it("throws AIProviderError on invalid JSON response", async () => {
      mockGenerateContent.mockResolvedValueOnce(
        mockGeminiResponse("This is not valid JSON at all!"),
      );

      const client = new GoogleClient();

      await expect(
        client.analyzeChannelProfile({
          posts: ["Post 1"],
          channelName: "Test",
        }),
      ).rejects.toThrow(AIProviderError);
    });

    it("includes token usage in result", async () => {
      const profileJson = JSON.stringify({
        niche: "Tech",
        tone: "casual",
        topTopics: ["AI"],
        language: "en",
      });

      mockGenerateContent.mockResolvedValueOnce(
        mockGeminiResponse(profileJson, {
          promptTokenCount: 300,
          candidatesTokenCount: 50,
          totalTokenCount: 350,
        }),
      );

      const client = new GoogleClient();
      const result = await client.analyzeChannelProfile({
        posts: ["Post 1"],
        channelName: "Test",
      });

      expect(result.tokenUsage.promptTokens).toBe(300);
      expect(result.tokenUsage.completionTokens).toBe(50);
      expect(result.tokenUsage.totalTokens).toBe(350);
    });

    it("includes modelUsed in result", async () => {
      const profileJson = JSON.stringify({
        niche: "Tech",
        tone: "casual",
        topTopics: ["AI"],
        language: "en",
      });

      mockGenerateContent.mockResolvedValueOnce(mockGeminiResponse(profileJson));

      const client = new GoogleClient();
      const result = await client.analyzeChannelProfile({
        posts: ["Post 1"],
        channelName: "Test",
      });

      expect(result.modelUsed).toBe(AI_MODELS.default.id);
    });
  });
});

// ---------------------------------------------------------------------------
// AIProviderError tests
// ---------------------------------------------------------------------------

describe("AIProviderError", () => {
  it("has correct name", () => {
    const error = new AIProviderError("test", 500, true);
    expect(error.name).toBe("AIProviderError");
  });

  it("preserves status code and retryable flag", () => {
    const error = new AIProviderError("rate limited", 429, true);
    expect(error.statusCode).toBe(429);
    expect(error.retryable).toBe(true);
    expect(error.message).toBe("rate limited");
  });

  it("is an instance of Error", () => {
    const error = new AIProviderError("test", 500, true);
    expect(error).toBeInstanceOf(Error);
  });
});
