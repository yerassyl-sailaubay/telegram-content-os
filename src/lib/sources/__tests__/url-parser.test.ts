import { describe, it, expect } from "vitest";
import {
  parseUrl,
  sanitizeUrl,
  extractYouTubeVideoId,
  isYouTubeUrl,
  isArticleUrl,
} from "../url-parser";
import { InvalidUrlError } from "../types";

const VIDEO_ID = "dQw4w9WgXcQ";

describe("extractYouTubeVideoId", () => {
  it("extracts video ID from watch URL", () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it("extracts video ID from youtu.be short URL", () => {
    expect(extractYouTubeVideoId(`https://youtu.be/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it("extracts video ID from shorts URL", () => {
    expect(extractYouTubeVideoId(`https://youtube.com/shorts/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it("extracts video ID from live URL", () => {
    expect(extractYouTubeVideoId(`https://youtube.com/live/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it("extracts video ID from embed URL", () => {
    expect(extractYouTubeVideoId(`https://youtube.com/embed/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it("returns null for non-YouTube URL", () => {
    expect(extractYouTubeVideoId("https://example.com/video")).toBeNull();
  });
});

describe("isYouTubeUrl", () => {
  it("returns true for youtube.com watch URL", () => {
    expect(isYouTubeUrl(`https://youtube.com/watch?v=${VIDEO_ID}`)).toBe(true);
  });

  it("returns false for non-YouTube URL", () => {
    expect(isYouTubeUrl("https://example.com")).toBe(false);
  });
});

describe("isArticleUrl", () => {
  it("returns true for regular article URL", () => {
    expect(isArticleUrl("https://example.com/post")).toBe(true);
  });

  it("returns false for YouTube URL", () => {
    expect(isArticleUrl(`https://youtube.com/watch?v=${VIDEO_ID}`)).toBe(false);
  });
});

describe("parseUrl - YouTube", () => {
  it("parses watch URL", () => {
    const result = parseUrl(`https://www.youtube.com/watch?v=${VIDEO_ID}`);
    expect(result.type).toBe("youtube");
    expect(result.videoId).toBe(VIDEO_ID);
  });

  it("parses youtu.be short URL", () => {
    const result = parseUrl(`https://youtu.be/${VIDEO_ID}`);
    expect(result.type).toBe("youtube");
    expect(result.videoId).toBe(VIDEO_ID);
  });

  it("parses shorts URL", () => {
    const result = parseUrl(`https://youtube.com/shorts/${VIDEO_ID}`);
    expect(result.type).toBe("youtube");
    expect(result.videoId).toBe(VIDEO_ID);
  });

  it("parses live URL", () => {
    const result = parseUrl(`https://youtube.com/live/${VIDEO_ID}`);
    expect(result.type).toBe("youtube");
    expect(result.videoId).toBe(VIDEO_ID);
  });

  it("parses embed URL", () => {
    const result = parseUrl(`https://youtube.com/embed/${VIDEO_ID}`);
    expect(result.type).toBe("youtube");
    expect(result.videoId).toBe(VIDEO_ID);
  });

  it("extracts videoId without timestamp param", () => {
    const result = parseUrl(`https://www.youtube.com/watch?v=${VIDEO_ID}&t=120`);
    expect(result.type).toBe("youtube");
    expect(result.videoId).toBe(VIDEO_ID);
  });

  it("extracts videoId with extra params", () => {
    const result = parseUrl(`https://www.youtube.com/watch?v=${VIDEO_ID}&list=PL123&index=1`);
    expect(result.type).toBe("youtube");
    expect(result.videoId).toBe(VIDEO_ID);
  });
});

describe("parseUrl - article", () => {
  it("parses regular article URL", () => {
    const result = parseUrl("https://example.com/article/my-post");
    expect(result.type).toBe("article");
    expect(result.url).toBe("https://example.com/article/my-post");
  });

  it("parses medium article URL", () => {
    const result = parseUrl("https://medium.com/@user/title-123abc");
    expect(result.type).toBe("article");
  });
});

describe("sanitizeUrl - SSRF protection", () => {
  it("throws for loopback 127.0.0.1", () => {
    expect(() => sanitizeUrl("http://127.0.0.1/admin")).toThrow(InvalidUrlError);
  });

  it("throws for private 192.168.x.x", () => {
    expect(() => sanitizeUrl("http://192.168.1.1/")).toThrow(InvalidUrlError);
  });

  it("throws for private 10.x.x.x", () => {
    expect(() => sanitizeUrl("http://10.0.0.1/")).toThrow(InvalidUrlError);
  });

  it("throws for private 172.16.x.x", () => {
    expect(() => sanitizeUrl("http://172.16.0.1/")).toThrow(InvalidUrlError);
  });

  it("throws for file:// protocol", () => {
    expect(() => sanitizeUrl("file:///etc/passwd")).toThrow(InvalidUrlError);
  });

  it("throws for ftp:// protocol", () => {
    expect(() => sanitizeUrl("ftp://example.com")).toThrow(InvalidUrlError);
  });

  it("returns URL for valid https URL", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com/");
  });

  it("throws for non-URL string", () => {
    expect(() => sanitizeUrl("not-a-url")).toThrow(InvalidUrlError);
  });

  it("throws for localhost", () => {
    expect(() => sanitizeUrl("http://localhost")).toThrow(InvalidUrlError);
  });

  it("throws for 0.0.0.0", () => {
    expect(() => sanitizeUrl("http://0.0.0.0")).toThrow(InvalidUrlError);
  });
});
