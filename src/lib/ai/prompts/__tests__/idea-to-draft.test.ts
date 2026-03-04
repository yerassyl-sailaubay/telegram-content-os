import { describe, it, expect } from "vitest";
import { buildIdeaToDraftPrompt } from "../idea-to-draft";
import type { ChannelProfile } from "../../types";

const baseProfile: ChannelProfile = {
  niche: "tech startups",
  tone: "casual and witty",
  topTopics: ["AI", "SaaS", "fundraising"],
  language: "ru",
};

describe("buildIdeaToDraftPrompt", () => {
  it("builds complete prompt from minimal idea with channel voice", () => {
    const messages = buildIdeaToDraftPrompt({
      idea: "Write about burnout in startups",
      channelProfile: baseProfile,
    });

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");

    expect(messages[0].content).toContain("Telegram channel content creator");
    expect(messages[0].content).toContain("tech startups");
    expect(messages[0].content).toContain("casual and witty");
    expect(messages[0].content).toContain("ru");
    expect(messages[0].content).toContain("Maintain the channel's voice");

    expect(messages[1].content).toContain("Write about burnout in startups");
  });

  it("includes detailed idea (paragraph) in user prompt", () => {
    const longIdea =
      "Explore how AI coding assistants are changing the way developers work. " +
      "Cover the productivity gains, potential risks of over-reliance, " +
      "and what this means for junior developers entering the field. " +
      "Include real-world examples from companies using Copilot and Cursor.";

    const messages = buildIdeaToDraftPrompt({
      idea: longIdea,
      channelProfile: baseProfile,
    });

    expect(messages[1].content).toContain(longIdea);
  });

  it("includes optional category and tags when provided", () => {
    const messages = buildIdeaToDraftPrompt({
      idea: "AI in healthcare",
      channelProfile: baseProfile,
      category: "Technology",
      tags: ["AI", "healthcare", "innovation"],
    });

    expect(messages[1].content).toContain("Category: Technology");
    expect(messages[1].content).toContain("Tags: AI, healthcare, innovation");
  });

  it("includes existingDrafts as 'Avoid overlap with:' section when provided", () => {
    const messages = buildIdeaToDraftPrompt({
      idea: "Benefits of remote work",
      channelProfile: baseProfile,
      existingDrafts: [
        "Remote work increases productivity by 20%",
        "5 tools every remote team needs",
      ],
    });

    expect(messages[1].content).toContain("Avoid overlap with:");
    expect(messages[1].content).toContain("Remote work increases productivity by 20%");
    expect(messages[1].content).toContain("5 tools every remote team needs");
  });

  it("does not include missing optional fields in prompt", () => {
    const messages = buildIdeaToDraftPrompt({
      idea: "Simple idea",
      channelProfile: baseProfile,
    });

    const userContent = messages[1].content;
    expect(userContent).not.toContain("Category:");
    expect(userContent).not.toContain("Tags:");
    expect(userContent).not.toContain("Avoid overlap with:");
    expect(userContent).not.toContain("undefined");
    expect(userContent).not.toContain("null");
  });
});
