import { GoogleGenAI } from "@google/genai";
import { AI_MODELS, type TokenUsage } from "./types";

const DEFAULT_VOICE_MIME_TYPE = "audio/ogg";

const VOICE_TO_POST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["transcript", "polishedPost", "title"],
  properties: {
    transcript: { type: "string" },
    polishedPost: { type: "string" },
    title: { type: "string" },
    detectedLanguage: { type: "string" },
  },
} as const;

interface VoiceToPostResponse {
  transcript?: unknown;
  polishedPost?: unknown;
  title?: unknown;
}

export interface VoiceToPostInput {
  audioBuffer: Buffer;
  mimeType?: string;
  caption?: string | null;
  modelId?: string;
}

export interface VoiceToPostResult {
  transcript: string;
  polishedPost: string;
  title: string;
  modelUsed: string;
  tokenUsage: TokenUsage;
}

function requireGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return key;
}

function coerceString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function deriveTitleFromText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Voice note draft";
  }

  if (normalized.length <= 80) {
    return normalized;
  }

  return `${normalized.slice(0, 77).trimEnd()}...`;
}

function parseVoiceToPostJson(jsonText: string): VoiceToPostResponse {
  try {
    return JSON.parse(jsonText) as VoiceToPostResponse;
  } catch {
    return {};
  }
}

function buildVoicePrompt(caption?: string | null): string {
  const captionContext = caption?.trim()
    ? `Optional user caption/context:\n${caption.trim()}\n\n`
    : "";

  return `You are an expert Telegram editor.

Task:
1) Transcribe this voice note accurately.
2) Rewrite it into a polished Telegram-ready post that keeps the speaker's intent.
3) Preserve factual meaning. Do not invent details.
4) Keep the final post concise and readable.
5) Use light Telegram-friendly formatting and emoji only when natural.

${captionContext}Return JSON with fields:
- transcript
- polishedPost
- title`;
}

export async function transcribeVoiceNoteToPost(
  input: VoiceToPostInput,
): Promise<VoiceToPostResult> {
  if (!input.audioBuffer || input.audioBuffer.byteLength === 0) {
    throw new Error("Voice audio buffer is empty");
  }

  const apiKey = requireGeminiApiKey();
  const modelId = input.modelId ?? AI_MODELS.fast.id;
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: modelId,
    contents: [
      {
        role: "user",
        parts: [
          { text: buildVoicePrompt(input.caption) },
          {
            inlineData: {
              data: input.audioBuffer.toString("base64"),
              mimeType: input.mimeType ?? DEFAULT_VOICE_MIME_TYPE,
            },
          },
        ],
      },
    ],
    config: {
      temperature: 0.3,
      responseMimeType: "application/json",
      responseJsonSchema: VOICE_TO_POST_SCHEMA,
    },
  });

  const rawText = (response.text ?? "").trim();
  const parsed = parseVoiceToPostJson(rawText);

  const transcript = coerceString(parsed.transcript) ?? rawText;
  const polishedPost = coerceString(parsed.polishedPost) ?? transcript;
  const fallbackTitleSource = polishedPost || transcript;
  const title = coerceString(parsed.title) ?? deriveTitleFromText(fallbackTitleSource);

  return {
    transcript,
    polishedPost: polishedPost || transcript,
    title,
    modelUsed: modelId,
    tokenUsage: {
      promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
    },
  };
}
