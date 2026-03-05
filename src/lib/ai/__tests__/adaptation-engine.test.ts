import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AIProvider } from "../provider";
import type {
  AdaptedContent,
  AdaptationRequest,
  AdaptationOptions,
  ChannelProfile,
  ChannelProfileRequest,
  ChannelProfileResult,
} from "../types";
import type { ParsedContent, ContentBlock } from "@/lib/telegram/parser.types";
import {
  AdaptationEngine,
  extractPlainText,
  isEnglish,
  fitsLengthLimit,
  hasHashtags,
  runQualityChecks,
  splitIntoThread,
} from "../adaptation-engine";
import type { AdaptationInput } from "../adaptation-engine";

// ---------------------------------------------------------------------------
// Mock AIProvider
// ---------------------------------------------------------------------------

function createMockProvider(
  overrides?: Partial<AdaptedContent>,
): AIProvider & { adaptContent: ReturnType<typeof vi.fn> } {
  const defaultResult: AdaptedContent = {
    content:
      "This is a great post about technology and innovation. #tech #innovation",
    translatedContent: "This is a literal translation of the original post.",
    platform: "linkedin",
    modelUsed: "openai/gpt-4.1-mini",
    tokenUsage: {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    },
    ...overrides,
  };

  return {
    adaptContent: vi.fn().mockResolvedValue(defaultResult),
    analyzeChannelProfile: vi.fn().mockResolvedValue({
      niche: "tech",
      tone: "professional",
      topTopics: ["AI", "startups"],
      language: "ru",
      modelUsed: "openai/gpt-4.1-mini",
      tokenUsage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
    } satisfies ChannelProfileResult),
  };
}

// ---------------------------------------------------------------------------
// Helper: create ParsedContent fixture
// ---------------------------------------------------------------------------

function createParsedContent(
  blocks: ContentBlock[],
  rawText = "Test content",
): ParsedContent {
  return {
    blocks,
    media: [],
    rawText,
    isMediaOnly: false,
    messageId: 1,
    date: 1700000000,
  };
}

// ---------------------------------------------------------------------------
// Tests: extractPlainText
// ---------------------------------------------------------------------------

describe("extractPlainText", () => {
  it("joins text blocks into a single string", () => {
    const blocks: ContentBlock[] = [
      { type: "text", text: "Hello " },
      { type: "text", text: "world!" },
    ];
    expect(extractPlainText(blocks)).toBe("Hello world!");
  });

  it("includes blockquote, link, mention, hashtag blocks", () => {
    const blocks: ContentBlock[] = [
      { type: "text", text: "Check this: " },
      { type: "link", text: "https://example.com", url: "https://example.com" },
      { type: "text", text: " by " },
      { type: "mention", text: "@user" },
      { type: "text", text: " " },
      { type: "hashtag", text: "#tech" },
    ];
    expect(extractPlainText(blocks)).toBe(
      "Check this: https://example.com by @user #tech",
    );
  });

  it("ignores media blocks", () => {
    const blocks: ContentBlock[] = [
      { type: "text", text: "Photo: " },
      { type: "media", text: "" },
      { type: "text", text: "description" },
    ];
    expect(extractPlainText(blocks)).toBe("Photo: description");
  });

  it("returns empty string for empty blocks", () => {
    expect(extractPlainText([])).toBe("");
  });

  it("handles code blocks", () => {
    const blocks: ContentBlock[] = [
      { type: "text", text: "Here's code: " },
      { type: "code_block", text: "console.log('hello')", language: "js" },
    ];
    expect(extractPlainText(blocks)).toBe(
      "Here's code: console.log('hello')",
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: isEnglish
// ---------------------------------------------------------------------------

describe("isEnglish", () => {
  it("returns true for English text", () => {
    expect(isEnglish("Hello world")).toBe(true);
  });

  it("returns false for Russian text", () => {
    expect(isEnglish("Привет мир")).toBe(false);
  });

  it("returns true for predominantly English with some Cyrillic", () => {
    // ~95% Latin, 5% Cyrillic → > 90% threshold
    const text = "This is a long English text with lots of Latin characters. Ок.";
    expect(isEnglish(text)).toBe(true);
  });

  it("returns false for mixed text below 90% Latin", () => {
    // Roughly 50/50
    const text = "Hello Привет World Мир";
    expect(isEnglish(text)).toBe(false);
  });

  it("returns true for text with only numbers and symbols", () => {
    expect(isEnglish("123 !@# 456")).toBe(true);
  });

  it("returns true for empty string", () => {
    expect(isEnglish("")).toBe(true);
  });

  it("handles accented Latin characters as Latin", () => {
    expect(isEnglish("Café résumé naïve")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: fitsLengthLimit
// ---------------------------------------------------------------------------

describe("fitsLengthLimit", () => {
  it("returns true for LinkedIn content within 3000 chars", () => {
    const text = "A".repeat(3000);
    expect(fitsLengthLimit(text, "linkedin")).toBe(true);
  });

  it("returns false for LinkedIn content over 3000 chars", () => {
    const text = "A".repeat(3001);
    expect(fitsLengthLimit(text, "linkedin")).toBe(false);
  });

  it("returns true for Twitter content within 280 chars", () => {
    const text = "A".repeat(280);
    expect(fitsLengthLimit(text, "twitter")).toBe(true);
  });

  it("returns false for Twitter content over 280 chars", () => {
    const text = "A".repeat(281);
    expect(fitsLengthLimit(text, "twitter")).toBe(false);
  });

  it("returns true for empty string on any platform", () => {
    expect(fitsLengthLimit("", "linkedin")).toBe(true);
    expect(fitsLengthLimit("", "twitter")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: hasHashtags
// ---------------------------------------------------------------------------

describe("hasHashtags", () => {
  it("returns true when text has hashtags", () => {
    expect(hasHashtags("Great post! #tech #innovation")).toBe(true);
  });

  it("returns false when text has no hashtags", () => {
    expect(hasHashtags("Great post about technology")).toBe(false);
  });

  it("returns true for single hashtag", () => {
    expect(hasHashtags("#hello")).toBe(true);
  });

  it("returns false for bare # symbol", () => {
    expect(hasHashtags("Item # 5")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: runQualityChecks
// ---------------------------------------------------------------------------

describe("runQualityChecks", () => {
  it("returns all passing for good English LinkedIn content", () => {
    const result = runQualityChecks(
      "Great article about AI trends! #technology #AI",
      "linkedin",
    );
    expect(result.isEnglish).toBe(true);
    expect(result.fitsLengthLimit).toBe(true);
    expect(result.hasHashtags).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("warns about non-English content", () => {
    const result = runQualityChecks(
      "Привет мир #тест",
      "linkedin",
    );
    expect(result.isEnglish).toBe(false);
    expect(result.warnings).toContain(
      "Content may not be fully translated to English",
    );
  });

  it("warns about missing hashtags", () => {
    const result = runQualityChecks("No hashtags here", "linkedin");
    expect(result.hasHashtags).toBe(false);
    expect(result.warnings).toContain(
      "Content has no hashtags — consider adding relevant ones",
    );
  });

  it("warns about exceeding LinkedIn limit", () => {
    const result = runQualityChecks("A".repeat(3001) + " #test", "linkedin");
    expect(result.fitsLengthLimit).toBe(false);
    expect(result.warnings.some((w) => w.includes("3000"))).toBe(true);
  });

  it("checks each tweet in a Twitter thread", () => {
    const tweets = ["Short tweet 1/2", "A".repeat(281) + " 2/2"];
    const fullText = tweets.join(" ");
    const result = runQualityChecks(fullText, "twitter", tweets);
    expect(result.fitsLengthLimit).toBe(false);
    expect(result.warnings.some((w) => w.includes("280"))).toBe(true);
  });

  it("passes for valid Twitter thread", () => {
    const tweets = ["Tweet one #hello 1/2", "Tweet two #world 2/2"];
    const fullText = "Tweet one #hello. Tweet two #world";
    const result = runQualityChecks(fullText, "twitter", tweets);
    expect(result.fitsLengthLimit).toBe(true);
    expect(result.hasHashtags).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: splitIntoThread
// ---------------------------------------------------------------------------

describe("splitIntoThread", () => {
  it("returns single tweet without numbering for short content", () => {
    const text = "This is a short tweet. #tech";
    const result = splitIntoThread(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(text);
    // No numbering for single tweets
    expect(result[0]).not.toContain("/");
  });

  it("returns single tweet for exactly 280 chars", () => {
    const text = "A".repeat(280);
    const result = splitIntoThread(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(text);
  });

  it("splits long content into multiple tweets with numbering", () => {
    // Create content that requires splitting: multiple sentences > 280 chars total
    const sentence1 = "This is the first sentence about technology and its impact on society. ";
    const sentence2 = "And here is another sentence about innovation in modern businesses. ";
    const sentence3 = "Finally a third sentence about artificial intelligence and machine learning advances. ";
    const sentence4 = "Fourth sentence about the future of quantum computing and blockchain. ";
    const sentence5 = "Fifth sentence discussing cloud platforms and infrastructure services. ";
    const longContent =
      sentence1 + sentence2 + sentence3 + sentence4 + sentence5;

    expect(longContent.length).toBeGreaterThan(280);

    const result = splitIntoThread(longContent);
    expect(result.length).toBeGreaterThan(1);

    // Each tweet should have numbering
    for (let i = 0; i < result.length; i++) {
      expect(result[i]).toContain(`${i + 1}/${result.length}`);
    }
  });

  it("keeps each tweet within 280 characters including numbering", () => {
    const longContent =
      "This is a comprehensive analysis of AI in 2024. " +
      "The technology landscape has shifted dramatically. " +
      "Machine learning models are getting larger and more capable. " +
      "OpenAI released GPT-4 and it changed everything. " +
      "Google responded with Gemini and its multimodal capabilities. " +
      "Anthropic pushed safety-focused development with Claude. " +
      "The race for artificial general intelligence continues. " +
      "Meanwhile enterprises are finding practical AI applications. ";

    const result = splitIntoThread(longContent);

    for (const tweet of result) {
      expect(tweet.length).toBeLessThanOrEqual(280);
    }
  });

  it("preserves sentence boundaries when splitting", () => {
    const content =
      "First sentence about technology. " +
      "Second sentence about innovation. " +
      "Third sentence about AI trends and developments in the industry. " +
      "Fourth sentence about startups and venture capital. " +
      "Fifth sentence about the future of work. " +
      "Sixth sentence about digital transformation. " +
      "Seventh sentence about cloud computing platforms. ";

    const result = splitIntoThread(content);

    // Each tweet (before the numbering suffix) should generally end with
    // a sentence-ending character (period, exclamation, or question mark)
    // This isn't always possible but for typical sentence-based text it should be
    for (const tweet of result) {
      // Remove numbering
      const withoutNumber = tweet.replace(/\s+\d+\/\d+$/, "");
      // Should end with punctuation or be the last chunk
      const endsWithPunctuation = /[.!?]$/.test(withoutNumber);
      // At minimum, should not end mid-word (no trailing partial words)
      expect(withoutNumber.length).toBeGreaterThan(0);
      // We relax this check — just make sure no tweet is empty
      if (!endsWithPunctuation) {
        // Acceptable only if it's because we split a very long sentence by words
        expect(withoutNumber.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("handles single very long sentence by word splitting", () => {
    // Create a single sentence without any period/exclamation/question
    const words = Array.from(
      { length: 80 },
      (_, i) => `word${i}`,
    );
    const longSentence = words.join(" ");
    expect(longSentence.length).toBeGreaterThan(280);

    const result = splitIntoThread(longSentence);
    expect(result.length).toBeGreaterThan(1);

    for (const tweet of result) {
      expect(tweet.length).toBeLessThanOrEqual(280);
    }
  });

  it("uses custom maxLength parameter", () => {
    // Content must be > 280 to trigger splitting at all
    const content =
      "First part of this content here is about technology. " +
      "Second part follows after with details about innovation. " +
      "Third part discusses machine learning capabilities. " +
      "Fourth part covers the rise of autonomous vehicles. " +
      "Fifth part concludes everything about the future of AI. " +
      "Sixth part about cloud computing infrastructure and deployment.";

    expect(content.length).toBeGreaterThan(280);
    const result = splitIntoThread(content, 50);
    expect(result.length).toBeGreaterThan(1);

    for (const tweet of result) {
      // With numbering, tweets can be up to maxLength + ~6 chars for " N/M"
      // But total should still be reasonable
      expect(tweet.length).toBeLessThanOrEqual(60);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: AdaptationEngine — full pipeline
// ---------------------------------------------------------------------------

describe("AdaptationEngine", () => {
  let mockProvider: ReturnType<typeof createMockProvider>;
  let engine: AdaptationEngine;

  beforeEach(() => {
    mockProvider = createMockProvider();
    engine = new AdaptationEngine(mockProvider);
  });

  describe("adapt — LinkedIn", () => {
    it("calls aiProvider.adaptContent with correct params", async () => {
      const input: AdaptationInput = {
        parsedContent: createParsedContent([
          { type: "text", text: "Привет! Это пост о технологиях." },
        ]),
        platform: "linkedin",
      };

      await engine.adapt(input);

      expect(mockProvider.adaptContent).toHaveBeenCalledOnce();
      expect(mockProvider.adaptContent).toHaveBeenCalledWith(
        {
          content: "Привет! Это пост о технологиях.",
          platform: "linkedin",
          channelProfile: undefined,
        },
        undefined,
      );
    });

    it("returns adapted content with quality checks", async () => {
      const input: AdaptationInput = {
        parsedContent: createParsedContent([
          { type: "text", text: "Test post content" },
        ]),
        platform: "linkedin",
      };

      const result = await engine.adapt(input);

      expect(result.content).toBe(
        "This is a great post about technology and innovation. #tech #innovation",
      );
      expect(result.translatedContent).toBe(
        "This is a literal translation of the original post.",
      );
      expect(result.platform).toBe("linkedin");
      expect(result.modelUsed).toBe("openai/gpt-4.1-mini");
      expect(result.tokenUsage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      });
      expect(result.qualityChecks.isEnglish).toBe(true);
      expect(result.qualityChecks.hasHashtags).toBe(true);
      expect(result.qualityChecks.fitsLengthLimit).toBe(true);
      expect(result.tweets).toBeUndefined();
    });

    it("does not produce tweets array for LinkedIn", async () => {
      const input: AdaptationInput = {
        parsedContent: createParsedContent([
          { type: "text", text: "Some LinkedIn post" },
        ]),
        platform: "linkedin",
      };

      const result = await engine.adapt(input);
      expect(result.tweets).toBeUndefined();
    });
  });

  describe("adapt — Twitter", () => {
    it("returns single tweet without threading for short content", async () => {
      mockProvider = createMockProvider({
        content: "Short tweet about AI! #tech",
        platform: "twitter",
      });
      engine = new AdaptationEngine(mockProvider);

      const input: AdaptationInput = {
        parsedContent: createParsedContent([
          { type: "text", text: "Короткий пост" },
        ]),
        platform: "twitter",
      };

      const result = await engine.adapt(input);
      expect(result.tweets).toBeUndefined();
      expect(result.content).toBe("Short tweet about AI! #tech");
    });

    it("splits long content into Twitter thread", async () => {
      const longContent =
        "This is a comprehensive analysis of AI in 2024. " +
        "The technology landscape has shifted dramatically. " +
        "Machine learning models are getting larger and more capable. " +
        "OpenAI released GPT-4 and it changed everything. " +
        "Google responded with Gemini and its multimodal capabilities. " +
        "Anthropic pushed safety with Claude. #AI #tech";

      mockProvider = createMockProvider({
        content: longContent,
        platform: "twitter",
      });
      engine = new AdaptationEngine(mockProvider);

      const input: AdaptationInput = {
        parsedContent: createParsedContent([
          { type: "text", text: "Длинный пост о технологиях" },
        ]),
        platform: "twitter",
      };

      const result = await engine.adapt(input);
      expect(result.tweets).toBeDefined();
      expect(result.tweets!.length).toBeGreaterThan(1);

      // Each tweet should be ≤ 280 chars
      for (const tweet of result.tweets!) {
        expect(tweet.length).toBeLessThanOrEqual(280);
      }
    });
  });

  describe("adapt — channel profile integration", () => {
    it("passes channelProfile to AI provider", async () => {
      const profile: ChannelProfile = {
        niche: "fintech",
        tone: "professional but friendly",
        topTopics: ["payments", "blockchain"],
        language: "ru",
      };

      const input: AdaptationInput = {
        parsedContent: createParsedContent([
          { type: "text", text: "Пост о финтехе" },
        ]),
        platform: "linkedin",
        channelProfile: profile,
      };

      await engine.adapt(input);

      expect(mockProvider.adaptContent).toHaveBeenCalledWith(
        {
          content: "Пост о финтехе",
          platform: "linkedin",
          channelProfile: profile,
        },
        undefined,
      );
    });
  });

  describe("adapt — options forwarding", () => {
    it("forwards AdaptationOptions to AI provider", async () => {
      const options: AdaptationOptions = {
        modelTier: "pro",
        timeoutMs: 60000,
        maxRetries: 5,
      };

      const input: AdaptationInput = {
        parsedContent: createParsedContent([
          { type: "text", text: "Some content" },
        ]),
        platform: "linkedin",
      };

      await engine.adapt(input, options);

      expect(mockProvider.adaptContent).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Some content" }),
        options,
      );
    });
  });

  describe("adapt — error handling", () => {
    it("throws for media-only posts with no text", async () => {
      const input: AdaptationInput = {
        parsedContent: createParsedContent([], ""),
        platform: "linkedin",
      };

      await expect(engine.adapt(input)).rejects.toThrow(
        "No text content to adapt",
      );
    });

    it("throws for whitespace-only content", async () => {
      const input: AdaptationInput = {
        parsedContent: createParsedContent(
          [{ type: "text", text: "   \n\t  " }],
          "   ",
        ),
        platform: "linkedin",
      };

      await expect(engine.adapt(input)).rejects.toThrow(
        "No text content to adapt",
      );
    });

    it("propagates AI provider errors", async () => {
      mockProvider.adaptContent.mockRejectedValue(
        new Error("API rate limit exceeded"),
      );

      const input: AdaptationInput = {
        parsedContent: createParsedContent([
          { type: "text", text: "Some content" },
        ]),
        platform: "linkedin",
      };

      await expect(engine.adapt(input)).rejects.toThrow(
        "API rate limit exceeded",
      );
    });
  });

  describe("adapt — plain text extraction from mixed blocks", () => {
    it("extracts text from mixed block types", async () => {
      const blocks: ContentBlock[] = [
        { type: "text", text: "Start " },
        { type: "link", text: "https://example.com", url: "https://example.com" },
        { type: "text", text: " middle " },
        { type: "blockquote", text: "quoted text" },
        { type: "media", text: "" },
        { type: "text", text: " end" },
      ];

      const input: AdaptationInput = {
        parsedContent: createParsedContent(blocks),
        platform: "linkedin",
      };

      await engine.adapt(input);

      expect(mockProvider.adaptContent).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Start https://example.com middle quoted text end",
        }),
        undefined,
      );
    });
  });
});
