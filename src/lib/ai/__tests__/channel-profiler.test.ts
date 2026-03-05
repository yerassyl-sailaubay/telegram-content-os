import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChannelProfiler } from "../channel-profiler";
import type { AIProvider } from "../provider";
import type { ChannelProfileResult } from "../types";

// ---------------------------------------------------------------------------
// Mock AIProvider
// ---------------------------------------------------------------------------

function createMockProvider(
  overrides?: Partial<AIProvider>,
): AIProvider {
  return {
    adaptContent: vi.fn(),
    analyzeChannelProfile: vi.fn().mockResolvedValue({
      niche: "Technology",
      tone: "informative",
      topTopics: ["AI", "web dev", "startups"],
      language: "ru",
      modelUsed: "openai/gpt-4.1-mini",
      tokenUsage: { promptTokens: 500, completionTokens: 100, totalTokens: 600 },
    } satisfies ChannelProfileResult),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ChannelProfiler", () => {
  let mockProvider: AIProvider;
  let profiler: ChannelProfiler;

  beforeEach(() => {
    mockProvider = createMockProvider();
    profiler = new ChannelProfiler(mockProvider);
  });

  describe("generateProfile", () => {
    it("calls analyzeChannelProfile with correct arguments", async () => {
      const posts = ["Post about AI", "Post about web dev"];
      await profiler.generateProfile("TechChannel", posts);

      expect(mockProvider.analyzeChannelProfile).toHaveBeenCalledWith(
        { posts, channelName: "TechChannel" },
        { modelTier: undefined },
      );
    });

    it("returns the validated profile result", async () => {
      const result = await profiler.generateProfile("TechChannel", [
        "Post 1",
        "Post 2",
      ]);

      expect(result.niche).toBe("Technology");
      expect(result.tone).toBe("informative");
      expect(result.topTopics).toEqual(["AI", "web dev", "startups"]);
      expect(result.language).toBe("ru");
    });

    it("passes modelTier option to the provider", async () => {
      await profiler.generateProfile("Ch", ["Post"], { modelTier: "pro" });

      expect(mockProvider.analyzeChannelProfile).toHaveBeenCalledWith(
        expect.anything(),
        { modelTier: "pro" },
      );
    });
  });

  describe("post limiting", () => {
    it("limits posts to default max of 50", async () => {
      const posts = Array.from({ length: 80 }, (_, i) => `Post ${i}`);
      await profiler.generateProfile("Ch", posts);

      const callArgs = vi.mocked(mockProvider.analyzeChannelProfile).mock
        .calls[0]![0];
      expect(callArgs.posts).toHaveLength(50);
    });

    it("limits posts to custom maxPosts value", async () => {
      const posts = Array.from({ length: 20 }, (_, i) => `Post ${i}`);
      await profiler.generateProfile("Ch", posts, { maxPosts: 5 });

      const callArgs = vi.mocked(mockProvider.analyzeChannelProfile).mock
        .calls[0]![0];
      expect(callArgs.posts).toHaveLength(5);
    });

    it("passes all posts when count is under the limit", async () => {
      const posts = ["Post 1", "Post 2", "Post 3"];
      await profiler.generateProfile("Ch", posts);

      const callArgs = vi.mocked(mockProvider.analyzeChannelProfile).mock
        .calls[0]![0];
      expect(callArgs.posts).toHaveLength(3);
    });
  });

  describe("post filtering", () => {
    it("filters out empty strings", async () => {
      const posts = ["Good post", "", "Another good post", ""];
      await profiler.generateProfile("Ch", posts);

      const callArgs = vi.mocked(mockProvider.analyzeChannelProfile).mock
        .calls[0]![0];
      expect(callArgs.posts).toEqual(["Good post", "Another good post"]);
    });

    it("filters out whitespace-only strings", async () => {
      const posts = ["Good post", "   ", "\t\n", "Another"];
      await profiler.generateProfile("Ch", posts);

      const callArgs = vi.mocked(mockProvider.analyzeChannelProfile).mock
        .calls[0]![0];
      expect(callArgs.posts).toEqual(["Good post", "Another"]);
    });
  });

  describe("error handling", () => {
    it("throws when all posts are empty after filtering", async () => {
      await expect(
        profiler.generateProfile("Ch", ["", "  ", "\n"]),
      ).rejects.toThrow("Not enough posts");
    });

    it("throws when posts array is empty", async () => {
      await expect(
        profiler.generateProfile("Ch", []),
      ).rejects.toThrow("Not enough posts");
    });

    it("throws when AI returns empty niche", async () => {
      mockProvider = createMockProvider({
        analyzeChannelProfile: vi.fn().mockResolvedValue({
          niche: "",
          tone: "casual",
          topTopics: ["topic"],
          language: "en",
          modelUsed: "test",
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        }),
      });
      profiler = new ChannelProfiler(mockProvider);

      await expect(
        profiler.generateProfile("Ch", ["Post"]),
      ).rejects.toThrow("empty niche");
    });

    it("throws when AI returns empty tone", async () => {
      mockProvider = createMockProvider({
        analyzeChannelProfile: vi.fn().mockResolvedValue({
          niche: "Tech",
          tone: "",
          topTopics: ["topic"],
          language: "en",
          modelUsed: "test",
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        }),
      });
      profiler = new ChannelProfiler(mockProvider);

      await expect(
        profiler.generateProfile("Ch", ["Post"]),
      ).rejects.toThrow("empty tone");
    });

    it("throws when AI returns non-array topTopics", async () => {
      mockProvider = createMockProvider({
        analyzeChannelProfile: vi.fn().mockResolvedValue({
          niche: "Tech",
          tone: "casual",
          topTopics: "not an array" as unknown as string[],
          language: "en",
          modelUsed: "test",
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        }),
      });
      profiler = new ChannelProfiler(mockProvider);

      await expect(
        profiler.generateProfile("Ch", ["Post"]),
      ).rejects.toThrow("invalid topTopics");
    });
  });

  describe("result validation", () => {
    it("caps topTopics at 10 items", async () => {
      const manyTopics = Array.from({ length: 15 }, (_, i) => `Topic ${i}`);
      mockProvider = createMockProvider({
        analyzeChannelProfile: vi.fn().mockResolvedValue({
          niche: "Tech",
          tone: "casual",
          topTopics: manyTopics,
          language: "en",
          modelUsed: "test",
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        }),
      });
      profiler = new ChannelProfiler(mockProvider);

      const result = await profiler.generateProfile("Ch", ["Post"]);
      expect(result.topTopics).toHaveLength(10);
    });

    it("filters non-string and empty entries from topTopics", async () => {
      mockProvider = createMockProvider({
        analyzeChannelProfile: vi.fn().mockResolvedValue({
          niche: "Tech",
          tone: "casual",
          topTopics: ["valid", "", 42, "   ", "also valid", null] as unknown as string[],
          language: "en",
          modelUsed: "test",
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        }),
      });
      profiler = new ChannelProfiler(mockProvider);

      const result = await profiler.generateProfile("Ch", ["Post"]);
      expect(result.topTopics).toEqual(["valid", "also valid"]);
    });
  });
});
