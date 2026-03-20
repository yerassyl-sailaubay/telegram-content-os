import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { transcribeVoiceNoteToPost } from "../voice-to-post";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GEMINI_API_KEY = "test-gemini-api-key";
});

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
});

describe("transcribeVoiceNoteToPost", () => {
  it("transcribes voice input and returns polished post fields", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        transcript: "Raw transcript from voice",
        polishedPost: "Polished Telegram-ready post",
        title: "Polished Telegram-ready post",
      }),
      usageMetadata: {
        promptTokenCount: 11,
        candidatesTokenCount: 22,
        totalTokenCount: 33,
      },
    });

    const result = await transcribeVoiceNoteToPost({
      audioBuffer: Buffer.from("voice-binary"),
      mimeType: "audio/ogg",
      caption: "Context caption",
    });

    expect(result).toEqual({
      transcript: "Raw transcript from voice",
      polishedPost: "Polished Telegram-ready post",
      title: "Polished Telegram-ready post",
      modelUsed: "gemini-3-flash-preview",
      tokenUsage: {
        promptTokens: 11,
        completionTokens: 22,
        totalTokens: 33,
      },
    });

    const request = mockGenerateContent.mock.calls[0]?.[0] as {
      model: string;
      contents: Array<{ parts: Array<{ inlineData?: { data?: string; mimeType?: string } }> }>;
    };

    expect(request.model).toBe("gemini-3-flash-preview");
    expect(request.contents[0]?.parts[1]?.inlineData?.mimeType).toBe("audio/ogg");
    expect(request.contents[0]?.parts[1]?.inlineData?.data).toBe(
      Buffer.from("voice-binary").toString("base64"),
    );
  });

  it("falls back to raw text output when JSON output is invalid", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: "Just transcribed text from model",
      usageMetadata: {
        promptTokenCount: 3,
        candidatesTokenCount: 4,
        totalTokenCount: 7,
      },
    });

    const result = await transcribeVoiceNoteToPost({
      audioBuffer: Buffer.from("voice"),
    });

    expect(result.transcript).toBe("Just transcribed text from model");
    expect(result.polishedPost).toBe("Just transcribed text from model");
    expect(result.title).toContain("Just transcribed text from model");
  });

  it("throws when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(
      transcribeVoiceNoteToPost({
        audioBuffer: Buffer.from("voice"),
      }),
    ).rejects.toThrow("GEMINI_API_KEY");
  });
});
