import { describe, it, expect } from "vitest";
import { buildRepurposePrompt } from "../repurpose-telegram";
import type { ChannelProfile, RepurposeMode } from "../../types";

const sampleProfile: ChannelProfile = {
  niche: "technology",
  tone: "casual and witty",
  topTopics: ["AI", "startups", "productivity"],
  language: "ru",
};

const sampleContent = "This is a long Telegram post about AI and startups that needs repurposing.";

describe("buildRepurposePrompt", () => {
  describe("shorter mode", () => {
    it("asks for a condensed version of the content", () => {
      const messages = buildRepurposePrompt({
        originalContent: sampleContent,
        mode: "shorter",
        channelProfile: sampleProfile,
      });

      const systemMsg = messages.find((m) => m.role === "system");
      expect(systemMsg).toBeDefined();
      expect(systemMsg!.content).toContain("Condense");
      expect(systemMsg!.content).toContain("shorter");
      expect(systemMsg!.content).toContain("core message");
    });

    it("includes channel profile data for voice matching", () => {
      const messages = buildRepurposePrompt({
        originalContent: sampleContent,
        mode: "shorter",
        channelProfile: sampleProfile,
      });

      const systemMsg = messages.find((m) => m.role === "system")!;
      expect(systemMsg.content).toContain("technology");
      expect(systemMsg.content).toContain("casual and witty");
      expect(systemMsg.content).toContain("AI");
      expect(systemMsg.content).toContain("startups");
      expect(systemMsg.content).toContain("productivity");
    });
  });

  describe("thread mode", () => {
    it("asks to split content into 2-5 connected posts", () => {
      const messages = buildRepurposePrompt({
        originalContent: sampleContent,
        mode: "thread",
        channelProfile: sampleProfile,
      });

      const systemMsg = messages.find((m) => m.role === "system");
      expect(systemMsg).toBeDefined();
      expect(systemMsg!.content).toContain("thread");
      expect(systemMsg!.content).toContain("2-5");
      expect(systemMsg!.content).toContain("stand alone");
    });

    it("includes channel profile data for voice matching", () => {
      const messages = buildRepurposePrompt({
        originalContent: sampleContent,
        mode: "thread",
        channelProfile: sampleProfile,
      });

      const systemMsg = messages.find((m) => m.role === "system")!;
      expect(systemMsg.content).toContain("technology");
      expect(systemMsg.content).toContain("casual and witty");
      expect(systemMsg.content).toContain("AI, startups, productivity");
    });
  });

  describe("poll mode", () => {
    it("asks to generate a question and answer options", () => {
      const messages = buildRepurposePrompt({
        originalContent: sampleContent,
        mode: "poll",
        channelProfile: sampleProfile,
      });

      const systemMsg = messages.find((m) => m.role === "system");
      expect(systemMsg).toBeDefined();
      expect(systemMsg!.content).toContain("poll");
      expect(systemMsg!.content).toContain("question");
      expect(systemMsg!.content).toContain("2-4");
    });

    it("includes channel profile data for voice matching", () => {
      const messages = buildRepurposePrompt({
        originalContent: sampleContent,
        mode: "poll",
        channelProfile: sampleProfile,
      });

      const systemMsg = messages.find((m) => m.role === "system")!;
      expect(systemMsg.content).toContain("technology");
      expect(systemMsg.content).toContain("casual and witty");
      expect(systemMsg.content).toContain("AI, startups, productivity");
    });
  });

  describe("mode differentiation", () => {
    it("produces structurally different system prompts for each mode", () => {
      const modes: RepurposeMode[] = ["shorter", "thread", "poll"];
      const systemPrompts = modes.map((mode) => {
        const messages = buildRepurposePrompt({
          originalContent: sampleContent,
          mode,
          channelProfile: sampleProfile,
        });
        return messages.find((m) => m.role === "system")!.content;
      });

      expect(systemPrompts[0]).not.toEqual(systemPrompts[1]);
      expect(systemPrompts[1]).not.toEqual(systemPrompts[2]);
      expect(systemPrompts[0]).not.toEqual(systemPrompts[2]);
    });
  });

  describe("message structure", () => {
    it("includes original content in the user message", () => {
      const messages = buildRepurposePrompt({
        originalContent: sampleContent,
        mode: "shorter",
        channelProfile: sampleProfile,
      });

      const userMsg = messages.find((m) => m.role === "user");
      expect(userMsg).toBeDefined();
      expect(userMsg!.content).toContain(sampleContent);
    });

    it("returns exactly 2 messages (system + user)", () => {
      const messages = buildRepurposePrompt({
        originalContent: sampleContent,
        mode: "thread",
        channelProfile: sampleProfile,
      });

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("system");
      expect(messages[1].role).toBe("user");
    });
  });

  describe("numVariations", () => {
    it("instructs AI to generate multiple versions when numVariations > 1", () => {
      const messages = buildRepurposePrompt({
        originalContent: sampleContent,
        mode: "shorter",
        channelProfile: sampleProfile,
        numVariations: 3,
      });

      const systemMsg = messages.find((m) => m.role === "system")!;
      expect(systemMsg.content).toContain("3");
      expect(systemMsg.content).toMatch(/variation|version/i);
    });
  });

  describe("channel profile with null fields", () => {
    it("uses fallback values when profile fields are null", () => {
      const sparseProfile: ChannelProfile = {
        niche: null,
        tone: null,
        topTopics: [],
        language: "ru",
      };

      const messages = buildRepurposePrompt({
        originalContent: sampleContent,
        mode: "shorter",
        channelProfile: sparseProfile,
      });

      const systemMsg = messages.find((m) => m.role === "system")!;
      expect(systemMsg.content).toContain("general");
      expect(systemMsg.content).toContain("neutral");
    });
  });
});
