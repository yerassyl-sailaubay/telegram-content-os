import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TranscriptResponse } from "youtube-transcript-plus";
import type { ExtractionResult } from "../types";

const { mockFetchTranscript } = vi.hoisted(() => ({
  mockFetchTranscript: vi.fn(),
}));

vi.mock("youtube-transcript-plus", () => ({
  fetchTranscript: mockFetchTranscript,
  YoutubeTranscriptDisabledError: class extends Error {
    readonly videoId: string;
    constructor(videoId: string) {
      super(`Transcript is disabled for video: ${videoId}`);
      this.videoId = videoId;
      this.name = "YoutubeTranscriptDisabledError";
    }
  },
  YoutubeTranscriptNotAvailableError: class extends Error {
    readonly videoId: string;
    constructor(videoId: string) {
      super(`No transcript available for video: ${videoId}`);
      this.videoId = videoId;
      this.name = "YoutubeTranscriptNotAvailableError";
    }
  },
  YoutubeTranscriptNotAvailableLanguageError: class extends Error {
    readonly videoId: string;
    readonly lang: string;
    readonly availableLangs: string[];
    constructor(lang: string, availableLangs: string[], videoId: string) {
      super(`Language ${lang} not available`);
      this.videoId = videoId;
      this.lang = lang;
      this.availableLangs = availableLangs;
      this.name = "YoutubeTranscriptNotAvailableLanguageError";
    }
  },
  YoutubeTranscriptVideoUnavailableError: class extends Error {
    readonly videoId: string;
    constructor(videoId: string) {
      super(`Video unavailable: ${videoId}`);
      this.videoId = videoId;
      this.name = "YoutubeTranscriptVideoUnavailableError";
    }
  },
  YoutubeTranscriptInvalidVideoIdError: class extends Error {
    constructor() {
      super("Invalid video ID");
      this.name = "YoutubeTranscriptInvalidVideoIdError";
    }
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { extractYouTubeTranscript, extractYouTubeMetadata } from "../youtube";

const VIDEO_ID = "dQw4w9WgXcQ";

const MOCK_SEGMENTS: TranscriptResponse[] = [
  { text: "Hello world", duration: 2.5, offset: 0, lang: "en" },
  { text: "this is a test", duration: 3.0, offset: 2.5, lang: "en" },
  { text: "of the transcript", duration: 2.0, offset: 5.5, lang: "en" },
];

const MOCK_OEMBED_RESPONSE = {
  title: "Rick Astley - Never Gonna Give You Up",
  author_name: "Rick Astley",
  thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("extractYouTubeTranscript", () => {
  it("extracts and concatenates transcript segments into clean text", async () => {
    mockFetchTranscript.mockResolvedValue(MOCK_SEGMENTS);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_OEMBED_RESPONSE,
    });

    const result = await extractYouTubeTranscript(VIDEO_ID);

    expect(result.content).toBe("Hello world this is a test of the transcript");
    expect(result.sourceType).toBe("youtube");
    expect(result.metadata.title).toBe("Rick Astley - Never Gonna Give You Up");
    expect(result.metadata.author).toBe("Rick Astley");
    expect(result.metadata.thumbnailUrl).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    expect(result.metadata.language).toBe("en");
    expect(result.metadata.wordCount).toBe(9);
  });

  it("calculates duration from the last segment offset + duration", async () => {
    mockFetchTranscript.mockResolvedValue(MOCK_SEGMENTS);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_OEMBED_RESPONSE,
    });

    const result = await extractYouTubeTranscript(VIDEO_ID);

    expect(result.metadata.duration).toBe(7.5);
  });

  it("passes language preference to fetchTranscript", async () => {
    mockFetchTranscript.mockResolvedValue(MOCK_SEGMENTS);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_OEMBED_RESPONSE,
    });

    await extractYouTubeTranscript(VIDEO_ID, "fr");

    expect(mockFetchTranscript).toHaveBeenCalledWith(
      VIDEO_ID,
      expect.objectContaining({ lang: "fr" }),
    );
  });

  it("falls back to any language when requested language is unavailable", async () => {
    mockFetchTranscript
      .mockRejectedValueOnce(
        Object.assign(new Error("Language ru not available"), {
          name: "YoutubeTranscriptNotAvailableLanguageError",
          videoId: VIDEO_ID,
          lang: "ru",
          availableLangs: ["en"],
        }),
      )
      .mockResolvedValueOnce(MOCK_SEGMENTS);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_OEMBED_RESPONSE,
    });

    const result = await extractYouTubeTranscript(VIDEO_ID, "ru");

    expect(mockFetchTranscript).toHaveBeenCalledTimes(2);
    expect(mockFetchTranscript).toHaveBeenNthCalledWith(
      2,
      VIDEO_ID,
      expect.not.objectContaining({ lang: "ru" }),
    );
    expect(result.content).toBe("Hello world this is a test of the transcript");
  });

  it("throws descriptive error when captions are disabled", async () => {
    mockFetchTranscript.mockRejectedValue(
      Object.assign(new Error(`Transcript is disabled for video: ${VIDEO_ID}`), {
        name: "YoutubeTranscriptDisabledError",
        videoId: VIDEO_ID,
      }),
    );

    await expect(extractYouTubeTranscript(VIDEO_ID)).rejects.toThrow(/captions are disabled/i);
  });

  it("throws descriptive error when video is unavailable", async () => {
    mockFetchTranscript.mockRejectedValue(
      Object.assign(new Error(`Video unavailable: ${VIDEO_ID}`), {
        name: "YoutubeTranscriptVideoUnavailableError",
        videoId: VIDEO_ID,
      }),
    );

    await expect(extractYouTubeTranscript(VIDEO_ID)).rejects.toThrow(
      /video.*unavailable|not found/i,
    );
  });

  it("throws descriptive error for invalid video ID", async () => {
    mockFetchTranscript.mockRejectedValue(
      Object.assign(new Error("Invalid video ID"), {
        name: "YoutubeTranscriptInvalidVideoIdError",
      }),
    );

    await expect(extractYouTubeTranscript("")).rejects.toThrow(/invalid.*video/i);
  });

  it("still returns content when oEmbed metadata fetch fails", async () => {
    mockFetchTranscript.mockResolvedValue(MOCK_SEGMENTS);
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    const result = await extractYouTubeTranscript(VIDEO_ID);

    expect(result.content).toBe("Hello world this is a test of the transcript");
    expect(result.sourceType).toBe("youtube");
    expect(result.metadata.language).toBe("en");
    expect(result.metadata.title).toBeUndefined();
  });

  it("returns correct ExtractionResult shape", async () => {
    mockFetchTranscript.mockResolvedValue(MOCK_SEGMENTS);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_OEMBED_RESPONSE,
    });

    const result: ExtractionResult = await extractYouTubeTranscript(VIDEO_ID);

    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("sourceType");
    expect(result).toHaveProperty("metadata");
    expect(typeof result.content).toBe("string");
    expect(result.sourceType).toBe("youtube");
  });
});

describe("extractYouTubeMetadata", () => {
  it("fetches metadata from YouTube oEmbed endpoint", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_OEMBED_RESPONSE,
    });

    const metadata = await extractYouTubeMetadata(VIDEO_ID);

    expect(mockFetch).toHaveBeenCalledWith(
      `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${VIDEO_ID}&format=json`,
    );
    expect(metadata.title).toBe("Rick Astley - Never Gonna Give You Up");
    expect(metadata.authorName).toBe("Rick Astley");
    expect(metadata.thumbnailUrl).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });

  it("throws when oEmbed returns non-OK response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    await expect(extractYouTubeMetadata(VIDEO_ID)).rejects.toThrow(/metadata/i);
  });

  it("throws when fetch fails with network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    await expect(extractYouTubeMetadata(VIDEO_ID)).rejects.toThrow(/metadata/i);
  });
});
