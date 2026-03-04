import { describe, it, expect, vi, beforeEach } from "vitest";
import type { OpenRouterMessage, GenerationRequest, TokenUsage } from "../types";
import { AI_MODELS, AIProviderError } from "../types";
import type { CompletionResult } from "../google";

const {
  mockBuildGenerateFromSourcePrompt,
  mockBuildRepurposePrompt,
  mockBuildIdeaToDraftPrompt,
  mockBuildCalendarFillPrompt,
  mockCompleteWithFallback,
} = vi.hoisted(() => ({
  mockBuildGenerateFromSourcePrompt: vi.fn(),
  mockBuildRepurposePrompt: vi.fn(),
  mockBuildIdeaToDraftPrompt: vi.fn(),
  mockBuildCalendarFillPrompt: vi.fn(),
  mockCompleteWithFallback: vi.fn(),
}));

vi.mock("../prompts/generate-from-source", () => ({
  buildGenerateFromSourcePrompt: mockBuildGenerateFromSourcePrompt,
  POSTS_PER_SOURCE: 3,
}));

vi.mock("../prompts/repurpose-telegram", () => ({
  buildRepurposePrompt: mockBuildRepurposePrompt,
}));

vi.mock("../prompts/idea-to-draft", () => ({
  buildIdeaToDraftPrompt: mockBuildIdeaToDraftPrompt,
}));

vi.mock("../prompts/calendar-fill", () => ({
  buildCalendarFillPrompt: mockBuildCalendarFillPrompt,
}));

vi.mock("../google", () => ({
  GoogleClient: vi.fn().mockImplementation(() => ({
    completeWithFallback: mockCompleteWithFallback,
  })),
}));

import {
  GenerationEngine,
  getModelTierForType,
  parseMultiPostResponse,
} from "../generation-engine";

const defaultTokenUsage: TokenUsage = {
  promptTokens: 120,
  completionTokens: 80,
  totalTokens: 200,
};

const defaultCompletionResult: CompletionResult = {
  content: "Generated Telegram post about AI trends.",
  model: "gemini-3-flash-preview",
  tokenUsage: defaultTokenUsage,
};

const defaultMessages: OpenRouterMessage[] = [
  { role: "system", content: "You are a Telegram content creator." },
  { role: "user", content: "Source: some article content" },
];

function createMockClient() {
  return { completeWithFallback: mockCompleteWithFallback } as unknown as InstanceType<
    typeof import("../google").GoogleClient
  >;
}

beforeEach(() => {
  vi.clearAllMocks();

  mockBuildGenerateFromSourcePrompt.mockReturnValue(defaultMessages);
  mockBuildRepurposePrompt.mockReturnValue(defaultMessages);
  mockBuildIdeaToDraftPrompt.mockReturnValue(defaultMessages);
  mockBuildCalendarFillPrompt.mockReturnValue(defaultMessages);
  mockCompleteWithFallback.mockResolvedValue(defaultCompletionResult);
});

describe("GenerationEngine", () => {
  describe("generate — routing", () => {
    it("routes source_to_telegram to buildGenerateFromSourcePrompt", async () => {
      const engine = new GenerationEngine(createMockClient());
      const request: GenerationRequest = {
        type: "source_to_telegram",
        sourceContent: "Article about AI",
        channelProfile: {
          niche: "tech",
          tone: "casual",
          topTopics: ["AI"],
          language: "ru",
        },
      };

      await engine.generate(request);

      expect(mockBuildGenerateFromSourcePrompt).toHaveBeenCalledOnce();
      expect(mockBuildRepurposePrompt).not.toHaveBeenCalled();
      expect(mockBuildIdeaToDraftPrompt).not.toHaveBeenCalled();
    });

    it("routes repurpose to buildRepurposePrompt", async () => {
      const engine = new GenerationEngine(createMockClient());
      const request: GenerationRequest = {
        type: "repurpose",
        sourceContent: "Existing Telegram post",
      };

      await engine.generate(request);

      expect(mockBuildRepurposePrompt).toHaveBeenCalledOnce();
      expect(mockBuildGenerateFromSourcePrompt).not.toHaveBeenCalled();
      expect(mockBuildIdeaToDraftPrompt).not.toHaveBeenCalled();
    });

    it("routes idea_to_draft to buildIdeaToDraftPrompt", async () => {
      const engine = new GenerationEngine(createMockClient());
      const request: GenerationRequest = {
        type: "idea_to_draft",
        sourceContent: "Write about quantum computing",
      };

      await engine.generate(request);

      expect(mockBuildIdeaToDraftPrompt).toHaveBeenCalledOnce();
      expect(mockBuildGenerateFromSourcePrompt).not.toHaveBeenCalled();
      expect(mockBuildRepurposePrompt).not.toHaveBeenCalled();
    });

    it("routes calendar_fill to buildCalendarFillPrompt", async () => {
      const engine = new GenerationEngine(createMockClient());
      const calendarInput = {
        gapDates: ["2026-03-10", "2026-03-12"],
        existingContent: [{ date: "2026-03-09", title: "AI Trends" }],
        recentTopics: ["AI"],
      };
      const request: GenerationRequest = {
        type: "calendar_fill",
        sourceContent: JSON.stringify(calendarInput),
        channelProfile: {
          niche: "tech",
          tone: "casual",
          topTopics: ["AI"],
          language: "ru",
        },
      };

      await engine.generate(request);

      expect(mockBuildCalendarFillPrompt).toHaveBeenCalledOnce();
      expect(mockBuildCalendarFillPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          gapDates: ["2026-03-10", "2026-03-12"],
          existingContent: [{ date: "2026-03-09", title: "AI Trends" }],
          recentTopics: ["AI"],
        }),
      );
      expect(mockBuildGenerateFromSourcePrompt).not.toHaveBeenCalled();
      expect(mockBuildRepurposePrompt).not.toHaveBeenCalled();
      expect(mockBuildIdeaToDraftPrompt).not.toHaveBeenCalled();
    });
  });

  describe("generate — model tier selection", () => {
    it("uses 'default' tier for source_to_telegram", async () => {
      const engine = new GenerationEngine(createMockClient());
      await engine.generate({
        type: "source_to_telegram",
        sourceContent: "content",
        channelProfile: { niche: "tech", tone: "casual", topTopics: [], language: "ru" },
      });

      expect(mockCompleteWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          model: AI_MODELS.default.id,
        }),
        undefined,
      );
    });

    it("uses 'default' tier for repurpose", async () => {
      const engine = new GenerationEngine(createMockClient());
      await engine.generate({
        type: "repurpose",
        sourceContent: "content",
      });

      expect(mockCompleteWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          model: AI_MODELS.default.id,
        }),
        undefined,
      );
    });

    it("uses 'fast' tier for idea_to_draft", async () => {
      const engine = new GenerationEngine(createMockClient());
      await engine.generate({
        type: "idea_to_draft",
        sourceContent: "An idea about space",
      });

      expect(mockCompleteWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          model: AI_MODELS.fast.id,
        }),
        undefined,
      );
    });

    it("allows overriding model tier via options", async () => {
      const engine = new GenerationEngine(createMockClient());
      await engine.generate({
        type: "idea_to_draft",
        sourceContent: "An idea",
        options: { modelTier: "pro" },
      });

      expect(mockCompleteWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          model: AI_MODELS.pro.id,
        }),
        undefined,
      );
    });

    it("uses 'pro' tier for calendar_fill", async () => {
      const engine = new GenerationEngine(createMockClient());
      await engine.generate({
        type: "calendar_fill",
        sourceContent: JSON.stringify({ gapDates: ["2026-03-10"], existingContent: [] }),
        channelProfile: { niche: "tech", tone: "casual", topTopics: [], language: "ru" },
      });

      expect(mockCompleteWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          model: AI_MODELS.pro.id,
        }),
        undefined,
      );
    });
  });

  describe("generate — result mapping", () => {
    it("extracts token usage from provider response", async () => {
      const engine = new GenerationEngine(createMockClient());
      const result = await engine.generate({
        type: "source_to_telegram",
        sourceContent: "content",
        channelProfile: { niche: "tech", tone: "casual", topTopics: [], language: "ru" },
      });

      expect(result.tokenUsage).toEqual(defaultTokenUsage);
    });

    it("returns string[] for source_to_telegram via parseMultiPostResponse", async () => {
      mockCompleteWithFallback.mockResolvedValue({
        content: "Post 1\n---POST_SEPARATOR---\nPost 2\n---POST_SEPARATOR---\nPost 3",
        model: "gemini-3-flash-preview",
        tokenUsage: defaultTokenUsage,
      });

      const engine = new GenerationEngine(createMockClient());
      const result = await engine.generate({
        type: "source_to_telegram",
        sourceContent: "content",
        channelProfile: { niche: "tech", tone: "casual", topTopics: [], language: "ru" },
      });

      expect(result.content).toEqual(["Post 1", "Post 2", "Post 3"]);
      expect(result.type).toBe("source_to_telegram");
    });

    it("returns string (not array) for repurpose type", async () => {
      mockCompleteWithFallback.mockResolvedValue({
        content: "Generated post about AI.",
        model: "gemini-3-pro-preview",
        tokenUsage: { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
      });

      const engine = new GenerationEngine(createMockClient());
      const result = await engine.generate({
        type: "repurpose",
        sourceContent: "original content",
      });

      expect(result.content).toBe("Generated post about AI.");
      expect(result.type).toBe("repurpose");
      expect(result.modelUsed).toBe("gemini-3-pro-preview");
      expect(result.tokenUsage.totalTokens).toBe(350);
    });
  });

  describe("generate — error handling", () => {
    it("wraps provider errors with context", async () => {
      mockCompleteWithFallback.mockRejectedValue(
        new AIProviderError("Model unavailable", 503, true),
      );

      const engine = new GenerationEngine(createMockClient());

      await expect(
        engine.generate({
          type: "source_to_telegram",
          sourceContent: "content",
          channelProfile: { niche: "tech", tone: "casual", topTopics: [], language: "ru" },
        }),
      ).rejects.toThrow("Model unavailable");
    });

    it("propagates non-AI errors from provider", async () => {
      mockCompleteWithFallback.mockRejectedValue(new Error("Network failure"));

      const engine = new GenerationEngine(createMockClient());

      await expect(
        engine.generate({
          type: "idea_to_draft",
          sourceContent: "idea",
        }),
      ).rejects.toThrow("Network failure");
    });
  });

  describe("generate — request passing", () => {
    it("calls completeWithFallback with temperature 0.7", async () => {
      const engine = new GenerationEngine(createMockClient());
      await engine.generate({
        type: "source_to_telegram",
        sourceContent: "content",
        channelProfile: { niche: "tech", tone: "casual", topTopics: [], language: "ru" },
      });

      expect(mockCompleteWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          messages: defaultMessages,
        }),
        undefined,
      );
    });
  });
});

describe("getModelTierForType", () => {
  it("returns 'default' for source_to_telegram", () => {
    expect(getModelTierForType("source_to_telegram")).toBe("default");
  });

  it("returns 'default' for repurpose", () => {
    expect(getModelTierForType("repurpose")).toBe("default");
  });

  it("returns 'fast' for idea_to_draft", () => {
    expect(getModelTierForType("idea_to_draft")).toBe("fast");
  });

  it("returns 'pro' for calendar_fill", () => {
    expect(getModelTierForType("calendar_fill")).toBe("pro");
  });
});

describe("parseMultiPostResponse", () => {
  it("splits response by POST_SEPARATOR delimiter", () => {
    const raw = "Post one\n---POST_SEPARATOR---\nPost two\n---POST_SEPARATOR---\nPost three";
    expect(parseMultiPostResponse(raw)).toEqual(["Post one", "Post two", "Post three"]);
  });

  it("trims whitespace from each post", () => {
    const raw = "  Post one  \n---POST_SEPARATOR---\n  Post two  ";
    expect(parseMultiPostResponse(raw)).toEqual(["Post one", "Post two"]);
  });

  it("filters out empty segments", () => {
    const raw = "Post one\n---POST_SEPARATOR---\n\n---POST_SEPARATOR---\nPost three";
    expect(parseMultiPostResponse(raw)).toEqual(["Post one", "Post three"]);
  });

  it("returns single-element array when no separator present", () => {
    const raw = "Just a single post with no separator";
    expect(parseMultiPostResponse(raw)).toEqual(["Just a single post with no separator"]);
  });

  it("returns trimmed raw as fallback when all segments are empty", () => {
    const raw = "   some content   ";
    expect(parseMultiPostResponse(raw)).toEqual(["some content"]);
  });
});
