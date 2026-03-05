import { fetchTranscript } from "youtube-transcript-plus";
import type { ExtractionResult, SourceMetadata } from "./types";

export interface YouTubeMetadata {
  title: string;
  authorName: string;
  thumbnailUrl: string;
}

const OEMBED_URL = "https://www.youtube.com/oembed?url=https://youtube.com/watch?v=";
const WATCH_URL = "https://www.youtube.com/watch?v=";

type TranscriptFetchResult = Awaited<ReturnType<typeof fetchTranscript>>;
type TranscriptOrFallback = TranscriptFetchResult | { content: string };

export async function extractYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  try {
    const response = await fetch(`${OEMBED_URL}${videoId}&format=json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube metadata for video: ${videoId}`);
    }
    const data = await response.json();
    return {
      title: data.title,
      authorName: data.author_name,
      thumbnailUrl: data.thumbnail_url,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("metadata")) {
      throw error;
    }
    throw new Error(`Failed to fetch YouTube metadata for video: ${videoId}`);
  }
}

export async function extractYouTubeTranscript(
  videoId: string,
  lang?: string,
): Promise<ExtractionResult> {
  const transcriptOrFallback = await fetchTranscriptWithFallback(videoId, lang);

  let content = "";
  const metadata: SourceMetadata = {};

  if (Array.isArray(transcriptOrFallback)) {
    const segments = transcriptOrFallback;
    content = segments.map((s) => s.text).join(" ");
    const language = segments[0]?.lang;
    const lastSegment = segments[segments.length - 1];
    const duration = lastSegment ? lastSegment.offset + lastSegment.duration : 0;
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    metadata.language = language;
    metadata.duration = duration;
    metadata.wordCount = wordCount;
    metadata.transcriptAvailable = true;
  } else {
    content = transcriptOrFallback.content;
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    metadata.wordCount = wordCount;
    metadata.transcriptAvailable = false;
    metadata.transcriptFallback = "description";
  }

  try {
    const oEmbed = await extractYouTubeMetadata(videoId);
    metadata.title = oEmbed.title;
    metadata.author = oEmbed.authorName;
    metadata.thumbnailUrl = oEmbed.thumbnailUrl;
  } catch {
    // oEmbed is best-effort — transcript content is the priority
  }

  return {
    content,
    sourceType: "youtube",
    metadata,
  };
}

async function fetchTranscriptWithFallback(
  videoId: string,
  lang?: string,
): Promise<TranscriptOrFallback> {
  try {
    return await fetchTranscript(videoId, lang ? { lang } : {});
  } catch (error: unknown) {
    if (lang && isLanguageNotAvailableError(error)) {
      try {
        return await fetchTranscript(videoId, {});
      } catch (retryError: unknown) {
        if (isTranscriptUnavailableError(retryError)) {
          const description = await extractYouTubeDescription(videoId);
          if (description) {
            return { content: description };
          }
        }
        throw mapTranscriptError(retryError, videoId);
      }
    }

    if (isTranscriptUnavailableError(error)) {
      const description = await extractYouTubeDescription(videoId);
      if (description) {
        return { content: description };
      }
    }

    throw mapTranscriptError(error, videoId);
  }
}

function isLanguageNotAvailableError(error: unknown): boolean {
  return error instanceof Error && error.name === "YoutubeTranscriptNotAvailableLanguageError";
}

function isTranscriptUnavailableError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "YoutubeTranscriptDisabledError" ||
      error.name === "YoutubeTranscriptNotAvailableError" ||
      error.name === "YoutubeTranscriptNotAvailableLanguageError")
  );
}

async function extractYouTubeDescription(videoId: string): Promise<string | null> {
  try {
    const response = await fetch(`${WATCH_URL}${videoId}`);
    if (!response.ok) return null;

    const html = await response.text();
    const description =
      extractMetaTagContent(html, "name", "description") ??
      extractMetaTagContent(html, "property", "og:description");

    if (!description) return null;

    const normalized = normalizeWhitespace(decodeHtmlEntities(description));
    if (!normalized) return null;

    return normalized;
  } catch {
    return null;
  }
}

function extractMetaTagContent(
  html: string,
  attrName: "name" | "property",
  attrValue: string,
): string | null {
  const escaped = attrValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]*${attrName}=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attrName}=["']${escaped}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function decodeHtmlEntities(input: string): string {
  const named: Record<string, string> = {
    "&amp;": "&",
    "&quot;": '"',
    "&#39;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&nbsp;": " ",
  };

  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num: string) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&(amp|quot|lt|gt|nbsp|#39);/g, (entity: string) => named[entity] ?? entity);
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function mapTranscriptError(error: unknown, videoId: string): Error {
  if (!(error instanceof Error)) {
    return new Error(`YouTube transcript extraction failed for video: ${videoId}`);
  }

  switch (error.name) {
    case "YoutubeTranscriptDisabledError":
      return new Error(
        `YouTube captions are disabled for video: ${videoId}. The video owner has not enabled captions.`,
      );
    case "YoutubeTranscriptVideoUnavailableError":
      return new Error(
        `YouTube video unavailable or not found: ${videoId}. It may be private, deleted, or region-locked.`,
      );
    case "YoutubeTranscriptNotAvailableError":
      return new Error(
        `No transcript available for YouTube video: ${videoId}. The video may not have any captions.`,
      );
    case "YoutubeTranscriptInvalidVideoIdError":
      return new Error(`Invalid YouTube video ID: "${videoId}".`);
    default:
      return new Error(
        `YouTube transcript extraction failed for video: ${videoId}: ${error.message}`,
      );
  }
}
