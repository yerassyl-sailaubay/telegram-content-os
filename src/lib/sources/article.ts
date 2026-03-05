import { extract } from "@extractus/article-extractor";

import type { ExtractionResult } from "./types";
import { sanitizeUrl } from "./url-parser";

export const MAX_CONTENT_LENGTH = 50_000;
export const EXTRACTION_TIMEOUT_MS = 10_000;
const TRUNCATION_MARKER = "... [truncated]";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ");
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + TRUNCATION_MARKER;
}

export async function extractArticle(url: string): Promise<ExtractionResult> {
  const sanitized = sanitizeUrl(url);

  const result = await Promise.race([
    extract(sanitized),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Article extraction timed out")), EXTRACTION_TIMEOUT_MS),
    ),
  ]);

  if (!result || !result.content) {
    throw new Error(`Failed to extract article content from ${sanitized}`);
  }

  const plainText = normalizeWhitespace(stripHtml(result.content));

  if (!plainText) {
    throw new Error(`Failed to extract article content from ${sanitized}`);
  }

  const content = truncate(plainText, MAX_CONTENT_LENGTH);

  return {
    content,
    sourceType: "article",
    metadata: {
      title: result.title ?? undefined,
      author: result.author ?? undefined,
      publishedDate: result.published ?? undefined,
      sourceUrl: sanitized,
      wordCount: countWords(plainText),
    },
  };
}
