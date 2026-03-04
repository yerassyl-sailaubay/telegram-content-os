import { describe, it, expect } from "vitest";
import { buildCalendarFillPrompt } from "../calendar-fill";
import type { CalendarFillPromptInput } from "../calendar-fill";
import type { ChannelProfile } from "../../types";

const baseProfile: ChannelProfile = {
  niche: "technology",
  tone: "casual and witty",
  topTopics: ["AI", "startups", "productivity"],
  language: "ru",
};

describe("buildCalendarFillPrompt", () => {
  it("builds prompt for a single gap date", () => {
    const input: CalendarFillPromptInput = {
      gapDates: ["2026-03-10"],
      existingContent: [],
      channelProfile: baseProfile,
    };

    const messages = buildCalendarFillPrompt(input);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
    expect(messages[1].content).toContain("2026-03-10");
  });

  it("builds prompt for multiple gap dates", () => {
    const input: CalendarFillPromptInput = {
      gapDates: ["2026-03-10", "2026-03-12", "2026-03-15"],
      existingContent: [],
      channelProfile: baseProfile,
    };

    const messages = buildCalendarFillPrompt(input);

    expect(messages[1].content).toContain("2026-03-10");
    expect(messages[1].content).toContain("2026-03-12");
    expect(messages[1].content).toContain("2026-03-15");
  });

  it("includes recent topics in avoidance section", () => {
    const input: CalendarFillPromptInput = {
      gapDates: ["2026-03-10"],
      existingContent: [],
      channelProfile: baseProfile,
      recentTopics: ["burnout", "remote work", "hiring"],
    };

    const messages = buildCalendarFillPrompt(input);
    const userContent = messages[1].content;

    expect(userContent).toContain("burnout");
    expect(userContent).toContain("remote work");
    expect(userContent).toContain("hiring");
  });

  it("includes existing content context as bullets", () => {
    const input: CalendarFillPromptInput = {
      gapDates: ["2026-03-12"],
      existingContent: [
        { date: "2026-03-10", title: "AI Trends 2026" },
        { date: "2026-03-11", title: "Startup Funding Guide" },
      ],
      channelProfile: baseProfile,
    };

    const messages = buildCalendarFillPrompt(input);
    const userContent = messages[1].content;

    expect(userContent).toContain("AI Trends 2026");
    expect(userContent).toContain("Startup Funding Guide");
    expect(userContent).toContain("2026-03-10");
    expect(userContent).toContain("2026-03-11");
  });

  it("includes channel profile info in system message", () => {
    const messages = buildCalendarFillPrompt({
      gapDates: ["2026-03-10"],
      existingContent: [],
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
  });

  it("includes JSON format instruction in prompt", () => {
    const messages = buildCalendarFillPrompt({
      gapDates: ["2026-03-10"],
      existingContent: [],
      channelProfile: baseProfile,
    });

    const userContent = messages[1].content;
    expect(userContent).toContain("JSON");
    expect(userContent).toContain("suggestedContent");
    expect(userContent).toContain("sourceType");
    expect(userContent).toContain("confidence");
  });

  it("handles null niche and tone with defaults", () => {
    const messages = buildCalendarFillPrompt({
      gapDates: ["2026-03-10"],
      existingContent: [],
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

  it("omits recent topics section when not provided", () => {
    const messages = buildCalendarFillPrompt({
      gapDates: ["2026-03-10"],
      existingContent: [],
      channelProfile: baseProfile,
    });

    const userContent = messages[1].content;
    expect(userContent).not.toContain("Recent topics to avoid");
  });
});
