/**
 * Shared types for source extraction modules.
 */

/** The type of URL source detected. */
export type SourceType = "youtube" | "article" | "unknown";

/** Result of parsing a URL. */
export interface ParsedUrl {
  /** Detected source type. */
  type: SourceType;
  /** The sanitized/normalized URL. */
  url: string;
  /** YouTube video ID (only for YouTube URLs). */
  videoId?: string;
}

/** Result of content extraction from a source. */
export interface ExtractionResult {
  /** The extracted text content. */
  content: string;
  /** Source type that produced this extraction. */
  sourceType: "youtube" | "article";
  /** Metadata about the extraction. */
  metadata: SourceMetadata;
}

/** Metadata from source extraction. */
export interface SourceMetadata {
  title?: string;
  author?: string;
  language?: string;
  duration?: number;
  wordCount?: number;
  thumbnailUrl?: string;
  [key: string]: unknown;
}

/** Error thrown for invalid or dangerous URLs. */
export class InvalidUrlError extends Error {
  constructor(
    message: string,
    public readonly url: string,
  ) {
    super(message);
    this.name = "InvalidUrlError";
  }
}
