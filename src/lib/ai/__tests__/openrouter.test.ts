import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AI_MODELS,
  AIProviderError,
  type OpenRouterResponse,
  type AdaptationRequest,
} from "../types";
import { buildTranslatePrompt } from "../prompts/translate";
import { buildLinkedInAdaptPrompt } from "../prompts/adapt-linkedin";
import { buildTwitterAdaptPrompt } from "../prompts/adapt-twitter";
import { buildChannelProfilePrompt } from "../prompts/channel-profile";
import { OpenRouterClient } from "../openrouter";

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  process.env.OPENROUTER_API_KEY = "sk-or-test-key-12345";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.OPENROUTER_API_KEY;
});

// ---------------------------------------------------------------------------
// Helper: mock OpenRouter response
// ---------------------------------------------------------------------------

function mockOpenRouterResponse(
  content: string,
  options?: {
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    status?: number;
  },
): Response {
  const status = options?.status ?? 200;
  const body: OpenRouterResponse = {
    id: "gen-test-123",
    model: options?.model ?? "openai/gpt-4.1-mini",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: options?.promptTokens ?? 100,
      completion_tokens: options?.completionTokens ?? 50,
      total_tokens:
        (options?.promptTokens ?? 100) + (options?.completionTokens ?? 50),
    },
  };

  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response;
}

function mockErrorResponse(
  status: number,
  message: string,
): Response {
  return {
    ok: false,
    status,
    json: () =>
      Promise.resolve({
        error: { message, code: status },
      }),
    headers: new Headers({
      "retry-after": "1",
    }),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Prompt template tests
// ---------------------------------------------------------------------------

describe("Prompt Templates", () => {
  describe("buildTranslatePrompt", () => {
    it("returns system and user messages for RU→EN translation", () => {
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
      expect(
        systemPrompt.includes("conversational") ||
          systemPrompt.includes("punchy"),
      ).toBe(true);
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

  it("default tier is GPT-4.1 Mini", () => {
    expect(AI_MODELS.default.id).toBe("openai/gpt-4.1-mini");
  });

  it("fast tier is Claude Haiku", () => {
    expect(AI_MODELS.fast.id).toContain("haiku");
  });

  it("pro tier is GPT-4.1", () => {
    expect(AI_MODELS.pro.id).toBe("openai/gpt-4.1");
  });
});

// ---------------------------------------------------------------------------
// OpenRouterClient tests
// ---------------------------------------------------------------------------

describe("OpenRouterClient", () => {
  describe("constructor / lazy init", () => {
    it("does NOT throw if OPENROUTER_API_KEY is missing at construction time", () => {
      delete process.env.OPENROUTER_API_KEY;
      // Constructing should not fail — lazy init pattern
      expect(() => new OpenRouterClient()).not.toThrow();
    });

    it("throws AIProviderError when making a request without API key", async () => {
      delete process.env.OPENROUTER_API_KEY;
      const client = new OpenRouterClient();

      await expect(
        client.complete({
          model: "openai/gpt-4.1-mini",
          messages: [{ role: "user", content: "hello" }],
        }),
      ).rejects.toThrow(AIProviderError);
    });
  });

  describe("complete", () => {
    it("sends correct request to OpenRouter API", async () => {
      mockFetch.mockResolvedValueOnce(
        mockOpenRouterResponse("Test response"),
      );

      const client = new OpenRouterClient();
      await client.complete({
        model: "openai/gpt-4.1-mini",
        messages: [{ role: "user", content: "hello" }],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer sk-or-test-key-12345",
          }),
        }),
      );
    });

    it("parses response content and token usage correctly", async () => {
      mockFetch.mockResolvedValueOnce(
        mockOpenRouterResponse("Translated text", {
          promptTokens: 200,
          completionTokens: 100,
        }),
      );

      const client = new OpenRouterClient();
      const result = await client.complete({
        model: "openai/gpt-4.1-mini",
        messages: [{ role: "user", content: "translate this" }],
      });

      expect(result.content).toBe("Translated text");
      expect(result.tokenUsage.promptTokens).toBe(200);
      expect(result.tokenUsage.completionTokens).toBe(100);
      expect(result.tokenUsage.totalTokens).toBe(300);
      expect(result.model).toBe("openai/gpt-4.1-mini");
    });
  });

  describe("error handling", () => {
    it("throws AIProviderError on 400 (non-retryable)", async () => {
      mockFetch.mockResolvedValueOnce(
        mockErrorResponse(400, "Bad request"),
      );

      const client = new OpenRouterClient();

      try {
        await client.complete({
          model: "openai/gpt-4.1-mini",
          messages: [{ role: "user", content: "hello" }],
        });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AIProviderError);
        const aiError = error as AIProviderError;
        expect(aiError.statusCode).toBe(400);
        expect(aiError.retryable).toBe(false);
      }
    });

    it("throws retryable AIProviderError on 429 (rate limit)", async () => {
      mockFetch.mockResolvedValueOnce(
        mockErrorResponse(429, "Rate limit exceeded"),
      );

      const client = new OpenRouterClient();

      try {
        await client.complete(
          {
            model: "openai/gpt-4.1-mini",
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
      mockFetch.mockResolvedValueOnce(
        mockErrorResponse(500, "Internal server error"),
      );

      const client = new OpenRouterClient();

      try {
        await client.complete(
          {
            model: "openai/gpt-4.1-mini",
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
  });

  describe("retry with backoff", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("retries on 429 and succeeds on second attempt", async () => {
      mockFetch
        .mockResolvedValueOnce(mockErrorResponse(429, "Rate limited"))
        .mockResolvedValueOnce(mockOpenRouterResponse("Success"));

      const client = new OpenRouterClient();
      const promise = client.complete(
        {
          model: "openai/gpt-4.1-mini",
          messages: [{ role: "user", content: "hello" }],
        },
        { maxRetries: 3, baseDelayMs: 10 },
      );

      await vi.advanceTimersByTimeAsync(5000);

      const result = await promise;
      expect(result.content).toBe("Success");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("retries on 500 server errors", async () => {
      mockFetch
        .mockResolvedValueOnce(mockErrorResponse(500, "Server error"))
        .mockResolvedValueOnce(mockErrorResponse(502, "Bad gateway"))
        .mockResolvedValueOnce(mockOpenRouterResponse("Recovered"));

      const client = new OpenRouterClient();
      const promise = client.complete(
        {
          model: "openai/gpt-4.1-mini",
          messages: [{ role: "user", content: "hello" }],
        },
        { maxRetries: 3, baseDelayMs: 10 },
      );

      await vi.advanceTimersByTimeAsync(10000);

      const result = await promise;
      expect(result.content).toBe("Recovered");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("does not retry on non-retryable errors (400)", async () => {
      mockFetch.mockResolvedValueOnce(
        mockErrorResponse(400, "Bad request"),
      );

      const client = new OpenRouterClient();
      await expect(
        client.complete(
          {
            model: "openai/gpt-4.1-mini",
            messages: [{ role: "user", content: "hello" }],
          },
          { maxRetries: 3, baseDelayMs: 10 },
        ),
      ).rejects.toThrow("Bad request");

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("throws after exhausting retries", async () => {
      vi.useRealTimers();

      mockFetch
        .mockResolvedValue(mockErrorResponse(429, "Rate limited"));

      const client = new OpenRouterClient();
      await expect(
        client.complete(
          {
            model: "openai/gpt-4.1-mini",
            messages: [{ role: "user", content: "hello" }],
          },
          { maxRetries: 2, baseDelayMs: 1 },
        ),
      ).rejects.toThrow("Rate limited");

      // initial + 2 retries = 3
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("model fallback", () => {
    it("falls back to cheaper model when primary is unavailable (503)", async () => {
      // First call fails with 503 (model unavailable)
      mockFetch
        .mockResolvedValueOnce(mockErrorResponse(503, "Model unavailable"))
        .mockResolvedValueOnce(mockErrorResponse(503, "Model unavailable"))
        .mockResolvedValueOnce(mockErrorResponse(503, "Model unavailable"))
        .mockResolvedValueOnce(mockErrorResponse(503, "Model unavailable"))
        // After exhausting retries, fallback model succeeds
        .mockResolvedValueOnce(
          mockOpenRouterResponse("Fallback response", {
            model: "openai/gpt-4.1-mini",
          }),
        );

      vi.useRealTimers();
      const client = new OpenRouterClient();

      const result = await client.completeWithFallback(
        {
          model: "openai/gpt-4.1",
          messages: [{ role: "user", content: "hello" }],
        },
        { maxRetries: 3, baseDelayMs: 1 },
      );

      expect(result.content).toBe("Fallback response");
    });
  });

  describe("adaptContent (full pipeline)", () => {
    it("executes 2-step pipeline: translate → adapt", async () => {
      // Step 1: translation response
      mockFetch.mockResolvedValueOnce(
        mockOpenRouterResponse("Hello world, this is a test post", {
          promptTokens: 100,
          completionTokens: 50,
        }),
      );
      // Step 2: adaptation response
      mockFetch.mockResolvedValueOnce(
        mockOpenRouterResponse(
          "🌍 Hello world — a fascinating test post!\n\nWhat do you think?\n\n#AI #Tech",
          { promptTokens: 150, completionTokens: 80 },
        ),
      );

      const client = new OpenRouterClient();
      const request: AdaptationRequest = {
        content: "Привет мир, это тестовый пост",
        platform: "linkedin",
      };

      const result = await client.adaptContent(request);

      expect(result.translatedContent).toBe(
        "Hello world, this is a test post",
      );
      expect(result.content).toContain("Hello world");
      expect(result.platform).toBe("linkedin");
      expect(result.modelUsed).toBeTruthy();
      // Token usage should be combined from both steps
      expect(result.tokenUsage.promptTokens).toBe(250);
      expect(result.tokenUsage.completionTokens).toBe(130);
      expect(result.tokenUsage.totalTokens).toBe(380);
    });

    it("uses Twitter adapt prompt for twitter platform", async () => {
      mockFetch
        .mockResolvedValueOnce(mockOpenRouterResponse("Translated text"))
        .mockResolvedValueOnce(
          mockOpenRouterResponse("Translated text 🚀 #Tech #AI"),
        );

      const client = new OpenRouterClient();
      const result = await client.adaptContent({
        content: "Тестовый контент",
        platform: "twitter",
      });

      expect(result.platform).toBe("twitter");
      // Second call should have been for Twitter adaptation
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("passes channel profile to adapt prompt when provided", async () => {
      mockFetch
        .mockResolvedValueOnce(mockOpenRouterResponse("Translated"))
        .mockResolvedValueOnce(mockOpenRouterResponse("Adapted"));

      const client = new OpenRouterClient();
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

      // Verify the second call includes channel profile in the prompt
      const secondCallBody = JSON.parse(
        mockFetch.mock.calls[1][1].body as string,
      );
      const systemMsg = secondCallBody.messages[0].content;
      expect(systemMsg).toContain("AI/ML");
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

      mockFetch.mockResolvedValueOnce(
        mockOpenRouterResponse(profileJson, {
          promptTokens: 500,
          completionTokens: 100,
        }),
      );

      const client = new OpenRouterClient();
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
      const wrappedJson = '```json\n{"niche":"Tech","tone":"casual","topTopics":["AI"],"language":"en"}\n```';

      mockFetch.mockResolvedValueOnce(
        mockOpenRouterResponse(wrappedJson),
      );

      const client = new OpenRouterClient();
      const result = await client.analyzeChannelProfile({
        posts: ["Post 1"],
        channelName: "Test",
      });

      expect(result.niche).toBe("Tech");
      expect(result.tone).toBe("casual");
    });
  });

  describe("timeout handling", () => {
    it("uses AbortSignal with configurable timeout", async () => {
      mockFetch.mockResolvedValueOnce(
        mockOpenRouterResponse("response"),
      );

      const client = new OpenRouterClient();
      await client.complete(
        {
          model: "openai/gpt-4.1-mini",
          messages: [{ role: "user", content: "hello" }],
        },
        { timeoutMs: 5000 },
      );

      const fetchCall = mockFetch.mock.calls[0];
      const fetchOptions = fetchCall[1];
      expect(fetchOptions.signal).toBeDefined();
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
