import { describe, it, expect } from "vitest";
import type {
  GenerationType,
  GenerationRequest,
  GenerationOptions,
  RepurposeMode,
  GenerationResult,
  CalendarFillSuggestion,
} from "../types";
import { GenerationEngine } from "../generation-engine";

describe("AI Generation Types", () => {
  describe("GenerationType", () => {
    it("accepts all valid generation types", () => {
      const types: GenerationType[] = [
        "source_to_telegram",
        "repurpose",
        "idea_to_draft",
        "calendar_fill",
      ];
      expect(types).toHaveLength(4);
    });
  });

  describe("RepurposeMode", () => {
    it("accepts exactly 3 fixed modes", () => {
      const modes: RepurposeMode[] = ["shorter", "thread", "poll"];
      expect(modes).toHaveLength(3);
    });
  });

  describe("GenerationRequest", () => {
    it("can be constructed with required fields", () => {
      const request: GenerationRequest = {
        type: "source_to_telegram",
        sourceContent: "Test content from YouTube transcript",
      };
      expect(request.type).toBe("source_to_telegram");
      expect(request.sourceContent).toBe("Test content from YouTube transcript");
    });

    it("accepts optional channelProfile and options", () => {
      const request: GenerationRequest = {
        type: "repurpose",
        sourceContent: "Original post",
        channelProfile: {
          niche: "tech",
          tone: "casual",
          topTopics: ["AI", "startups"],
          language: "en",
        },
        options: {
          repurposeMode: "shorter",
          numVariations: 3,
        },
      };
      expect(request.options?.repurposeMode).toBe("shorter");
    });
  });

  describe("GenerationResult", () => {
    it("can hold a single content string", () => {
      const result: GenerationResult = {
        content: "Generated Telegram post",
        type: "source_to_telegram",
        modelUsed: "openai/gpt-4.1-mini",
        tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };
      expect(result.content).toBe("Generated Telegram post");
    });

    it("can hold array of strings for repurpose variations", () => {
      const result: GenerationResult = {
        content: ["Shorter version", "Thread part 1\nThread part 2", "Poll: What do you think?"],
        type: "repurpose",
        modelUsed: "openai/gpt-4.1-mini",
        tokenUsage: { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
      };
      expect(Array.isArray(result.content)).toBe(true);
    });
  });

  describe("CalendarFillSuggestion", () => {
    it("has all required fields", () => {
      const suggestion: CalendarFillSuggestion = {
        date: "2026-03-10",
        suggestedContent: "Post about AI trends",
        sourceType: "draft",
        confidence: 0.85,
      };
      expect(suggestion.confidence).toBeLessThanOrEqual(1);
      expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
    });

    it("accepts optional sourceId", () => {
      const suggestion: CalendarFillSuggestion = {
        date: "2026-03-10",
        suggestedContent: "Repurpose this idea",
        sourceId: "abc-123",
        sourceType: "idea",
        confidence: 0.7,
      };
      expect(suggestion.sourceId).toBe("abc-123");
    });
  });

  describe("GenerationEngine class", () => {
    it("exports GenerationEngine as a class with generate method", () => {
      expect(GenerationEngine).toBeDefined();
      expect(GenerationEngine.prototype.generate).toBeDefined();
    });
  });
});
