import { fetchTranscript } from "youtube-transcript-plus";
import type { ExtractionResult, SourceMetadata } from "./types";

export interface YouTubeMetadata {
  title: string;
  authorName: string;
  thumbnailUrl: string;
}

const OEMBED_URL = "https://www.youtube.com/oembed?url=https://youtube.com/watch?v=";

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
  const segments = await fetchTranscriptWithFallback(videoId, lang);

  const content = segments.map((s) => s.text).join(" ");
  const language = segments[0]?.lang;
  const lastSegment = segments[segments.length - 1];
  const duration = lastSegment ? lastSegment.offset + lastSegment.duration : 0;
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const metadata: SourceMetadata = {
    language,
    duration,
    wordCount,
  };

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

async function fetchTranscriptWithFallback(videoId: string, lang?: string) {
  try {
    return await fetchTranscript(videoId, lang ? { lang } : {});
  } catch (error: unknown) {
    if (lang && isLanguageNotAvailableError(error)) {
      return await fetchTranscript(videoId, {});
    }
    throw mapTranscriptError(error, videoId);
  }
}

function isLanguageNotAvailableError(error: unknown): boolean {
  return error instanceof Error && error.name === "YoutubeTranscriptNotAvailableLanguageError";
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
