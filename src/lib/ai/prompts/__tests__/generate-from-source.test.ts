import { describe, it, expect } from "vitest";
import { buildGenerateFromSourcePrompt } from "../generate-from-source";
import type { ChannelProfile } from "../../types";
import type { SourceType } from "@/lib/sources/types";

const defaultProfile: ChannelProfile = {
  niche: "technology",
  tone: "casual and witty",
  topTopics: ["AI", "startups", "productivity"],
  language: "ru",
};

describe("buildGenerateFromSourcePrompt", () => {
  it("builds correct prompt for YouTube source", () => {
    const messages = buildGenerateFromSourcePrompt({
      sourceContent: "This is a YouTube transcript about building AI agents.",
      sourceType: "youtube",
      channelProfile: defaultProfile,
    });

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");

    // System prompt must mention Telegram
    expect(messages[0].content).toContain("Telegram channel content creator");

    // User prompt must label source type
    expect(messages[1].content).toContain("Source (youtube):");
    expect(messages[1].content).toContain("This is a YouTube transcript about building AI agents.");
  });

  it("builds correct prompt for article source", () => {
    const messages = buildGenerateFromSourcePrompt({
      sourceContent: "An in-depth article about React Server Components.",
      sourceType: "article",
      channelProfile: defaultProfile,
    });

    expect(messages).toHaveLength(2);
    expect(messages[1].content).toContain("Source (article):");
    expect(messages[1].content).toContain("An in-depth article about React Server Components.");
  });

  it("truncates source content exceeding 15,000 characters", () => {
    const longContent = "A".repeat(16_000);

    const messages = buildGenerateFromSourcePrompt({
      sourceContent: longContent,
      sourceType: "article",
      channelProfile: defaultProfile,
    });

    const userContent = messages[1].content;
    // Should contain truncation marker
    expect(userContent).toContain("... [truncated]");
    // The source portion should not contain the full 16,000 chars
    expect(userContent).not.toContain("A".repeat(16_000));
    // Should contain exactly 15,000 A's before truncation
    expect(userContent).toContain("A".repeat(15_000));
  });

  it("includes channel profile data (niche, tone, language) in system prompt", () => {
    const messages = buildGenerateFromSourcePrompt({
      sourceContent: "Some content",
      sourceType: "youtube",
      channelProfile: {
        niche: "fintech",
        tone: "professional",
        topTopics: ["banking", "crypto"],
        language: "en",
      },
    });

    const systemContent = messages[0].content;
    expect(systemContent).toContain("fintech");
    expect(systemContent).toContain("professional");
    expect(systemContent).toContain("banking, crypto");
    expect(systemContent).toContain("en");
  });

  it("handles null niche and tone with defaults", () => {
    const messages = buildGenerateFromSourcePrompt({
      sourceContent: "Some content",
      sourceType: "unknown",
      channelProfile: {
        niche: null,
        tone: null,
        topTopics: [],
        language: "ru",
      },
    });

    const systemContent = messages[0].content;
    expect(systemContent).toContain("general");
    expect(systemContent).toContain("neutral");
  });

  it("includes Telegram formatting guidance in system prompt", () => {
    const messages = buildGenerateFromSourcePrompt({
      sourceContent: "Content",
      sourceType: "article",
      channelProfile: defaultProfile,
    });

    const systemContent = messages[0].content;
    expect(systemContent).toContain("bold");
    expect(systemContent).toContain("italic");
  });

  it("instructs to rewrite, not copy", () => {
    const messages = buildGenerateFromSourcePrompt({
      sourceContent: "Content",
      sourceType: "article",
      channelProfile: defaultProfile,
    });

    const systemContent = messages[0].content;
    expect(systemContent).toContain("extract key insights");
    expect(systemContent).toContain("rewrite");
  });

  it("includes maxLength instruction when provided", () => {
    const messages = buildGenerateFromSourcePrompt({
      sourceContent: "Content",
      sourceType: "youtube",
      channelProfile: defaultProfile,
      options: { maxLength: 2000 },
    });

    const userContent = messages[1].content;
    expect(userContent).toContain("2000");
  });
});
