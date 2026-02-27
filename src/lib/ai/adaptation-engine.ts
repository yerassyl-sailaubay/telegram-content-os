/**
 * AI Content Adaptation Engine.
 *
 * Orchestrates the full pipeline: parsed Telegram post → AI adaptation → platform-specific output.
 * Steps: extract plain text → call AI provider → run quality checks → handle Twitter threading.
 */

import type { AIProvider } from "./provider";
import type {
  Platform,
  ChannelProfile,
  AdaptedContent,
  AdaptationOptions,
  TokenUsage,
} from "./types";
import type { ParsedContent, ContentBlock } from "@/lib/telegram/parser.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Input for the adaptation engine. */
export interface AdaptationInput {
  /** The parsed content from Telegram parser. */
  parsedContent: ParsedContent;
  /** Target platform. */
  platform: Platform;
  /** Optional channel profile for tone matching. */
  channelProfile?: ChannelProfile;
}

/** Quality check results for adapted content. */
export interface QualityCheckResult {
  isEnglish: boolean;
  fitsLengthLimit: boolean;
  hasHashtags: boolean;
  warnings: string[];
}

/** Result of the full adaptation pipeline. */
export interface AdaptationResult {
  /** Single adapted content string (LinkedIn) or full text (Twitter). */
  content: string;
  /** For Twitter: array of individual tweets if threaded. */
  tweets?: string[];
  /** The intermediate literal translation. */
  translatedContent: string;
  /** Platform this was adapted for. */
  platform: Platform;
  /** Model used. */
  modelUsed: string;
  /** Token usage. */
  tokenUsage: TokenUsage;
  /** Quality check results. */
  qualityChecks: QualityCheckResult;
}

// ---------------------------------------------------------------------------
// Platform length limits
// ---------------------------------------------------------------------------

const PLATFORM_LENGTH_LIMITS: Record<Platform, number> = {
  linkedin: 3000,
  twitter: 280,
};

// ---------------------------------------------------------------------------
// Pure utility functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Extract plain text from parsed content blocks.
 * Joins text from text, blockquote, link, mention, hashtag blocks.
 * Ignores media-only blocks.
 */
export function extractPlainText(blocks: ContentBlock[]): string {
  const textParts: string[] = [];

  for (const block of blocks) {
    if (block.type === "media") continue;
    textParts.push(block.text);
  }

  return textParts.join("");
}

/**
 * Check if text is predominantly English (>90% of alpha chars are Latin, not Cyrillic).
 */
export function isEnglish(text: string): boolean {
  let latinCount = 0;
  let nonLatinAlphaCount = 0;

  for (const char of text) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;

    // Basic Latin letters (A-Z, a-z)
    if (
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a)
    ) {
      latinCount++;
    }
    // Cyrillic range (U+0400 – U+04FF)
    else if (code >= 0x0400 && code <= 0x04ff) {
      nonLatinAlphaCount++;
    }
    // Extended Latin (e.g., accented characters) — count as Latin
    else if (code >= 0x00c0 && code <= 0x024f) {
      latinCount++;
    }
  }

  const totalAlpha = latinCount + nonLatinAlphaCount;
  if (totalAlpha === 0) return true; // No alpha characters — assume ok
  return latinCount / totalAlpha > 0.9;
}

/**
 * Check if content fits the platform's character limit.
 * For Twitter, checks individual tweet limit (280).
 * For LinkedIn, checks total content limit (3000).
 */
export function fitsLengthLimit(text: string, platform: Platform): boolean {
  const limit = PLATFORM_LENGTH_LIMITS[platform];
  return text.length <= limit;
}

/**
 * Check if text contains at least one hashtag.
 */
export function hasHashtags(text: string): boolean {
  return /#\w+/.test(text);
}

/**
 * Run all quality checks on adapted content.
 */
export function runQualityChecks(
  text: string,
  platform: Platform,
  tweets?: string[],
): QualityCheckResult {
  const warnings: string[] = [];
  const englishCheck = isEnglish(text);
  const hashtagCheck = hasHashtags(text);

  let lengthCheck: boolean;
  if (platform === "twitter" && tweets && tweets.length > 0) {
    // For Twitter threads, check each tweet individually
    lengthCheck = tweets.every((tweet) => tweet.length <= 280);
    if (!lengthCheck) {
      warnings.push("One or more tweets exceed the 280 character limit");
    }
  } else {
    lengthCheck = fitsLengthLimit(text, platform);
    if (!lengthCheck) {
      const limit = PLATFORM_LENGTH_LIMITS[platform];
      warnings.push(
        `Content exceeds ${platform} limit of ${limit} characters (${text.length})`,
      );
    }
  }

  if (!englishCheck) {
    warnings.push("Content may not be fully translated to English");
  }

  if (!hashtagCheck) {
    warnings.push("Content has no hashtags — consider adding relevant ones");
  }

  return {
    isEnglish: englishCheck,
    fitsLengthLimit: lengthCheck,
    hasHashtags: hashtagCheck,
    warnings,
  };
}

/**
 * Split long content into a Twitter thread.
 *
 * Rules:
 * - Reserve 10 chars for thread numbering (" N/M")
 * - Split at sentence boundaries (". ", "! ", "? ") when possible
 * - Each tweet must be ≤ maxLength (270 to leave room for numbering)
 * - Append " 1/N", " 2/N" etc. to each tweet
 * - Never split mid-word
 */
export function splitIntoThread(
  content: string,
  maxLength = 270,
): string[] {
  // If content fits in one tweet without numbering, return as-is
  if (content.length <= 280) {
    return [content];
  }

  const sentences = splitIntoSentences(content);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    // If adding this sentence would exceed the limit
    if (currentChunk.length + sentence.length > maxLength) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      // If a single sentence exceeds maxLength, split by words
      if (sentence.length > maxLength) {
        const wordChunks = splitByWords(sentence, maxLength);
        chunks.push(...wordChunks);
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  // If we still only have one chunk, no numbering needed
  if (chunks.length <= 1) {
    return chunks.length === 0 ? [content] : chunks;
  }

  // Add thread numbering
  const total = chunks.length;
  return chunks.map((chunk, i) => `${chunk} ${i + 1}/${total}`);
}

/**
 * Split text into sentences, preserving the delimiter with the sentence.
 */
function splitIntoSentences(text: string): string[] {
  const sentences: string[] = [];
  // Match sentences ending with ". ", "! ", "? " or end-of-string
  const regex = /[^.!?]*[.!?]\s?|[^.!?]+$/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match[0].length > 0) {
      sentences.push(match[0]);
    }
  }

  return sentences.length > 0 ? sentences : [text];
}

/**
 * Split a sentence into word-boundary chunks that fit within maxLength.
 */
function splitByWords(text: string, maxLength: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxLength) {
      current += " " + word;
    } else {
      chunks.push(current.trim());
      current = word;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// AdaptationEngine class
// ---------------------------------------------------------------------------

export class AdaptationEngine {
  constructor(private readonly aiProvider: AIProvider) {}

  /**
   * Adapt parsed Telegram content for a target platform.
   *
   * Pipeline:
   * 1. Extract plain text from parsed content blocks
   * 2. Call aiProvider.adaptContent with content + platform + profile
   * 3. Run quality checks
   * 4. For Twitter: split into thread if > 280 chars
   * 5. Return result with quality data
   */
  async adapt(
    input: AdaptationInput,
    options?: AdaptationOptions,
  ): Promise<AdaptationResult> {
    const { parsedContent, platform, channelProfile } = input;

    // Step 1: Extract plain text
    const plainText = extractPlainText(parsedContent.blocks);

    if (!plainText.trim()) {
      throw new Error("No text content to adapt — post may be media-only");
    }

    // Step 2: Call AI provider
    const adapted: AdaptedContent = await this.aiProvider.adaptContent(
      {
        content: plainText,
        platform,
        channelProfile,
      },
      options,
    );

    // Step 3-4: Handle Twitter threading
    let tweets: string[] | undefined;
    if (platform === "twitter" && adapted.content.length > 280) {
      tweets = splitIntoThread(adapted.content);
    }

    // Step 5: Run quality checks
    const qualityChecks = runQualityChecks(
      adapted.content,
      platform,
      tweets,
    );

    return {
      content: adapted.content,
      tweets,
      translatedContent: adapted.translatedContent,
      platform: adapted.platform,
      modelUsed: adapted.modelUsed,
      tokenUsage: adapted.tokenUsage,
      qualityChecks,
    };
  }
}
