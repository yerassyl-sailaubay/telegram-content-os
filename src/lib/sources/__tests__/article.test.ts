import { describe, it, expect, vi, beforeEach } from "vitest";
import { InvalidUrlError } from "../types";

const mockExtract = vi.hoisted(() => vi.fn());

vi.mock("@extractus/article-extractor", () => ({
  extract: mockExtract,
}));

import { extractArticle, MAX_CONTENT_LENGTH } from "../article";

beforeEach(() => {
  mockExtract.mockReset();
});

describe("extractArticle", () => {
  const ARTICLE_URL = "https://example.com/blog/great-article";

  describe("successful extraction", () => {
    it("extracts article content and returns ExtractionResult", async () => {
      mockExtract.mockResolvedValue({
        title: "Great Article",
        content: "<p>This is the article body.</p>",
        author: "Jane Doe",
        published: "2025-06-15T10:00:00Z",
        source: "Example Blog",
        ttr: 120,
      });

      const result = await extractArticle(ARTICLE_URL);

      expect(result.content).toBe("This is the article body.");
      expect(result.sourceType).toBe("article");
      expect(result.metadata.title).toBe("Great Article");
      expect(result.metadata.author).toBe("Jane Doe");
      expect(result.metadata.sourceUrl).toBe(ARTICLE_URL);
      expect(result.metadata.wordCount).toBe(5);
    });

    it("strips HTML tags from content", async () => {
      mockExtract.mockResolvedValue({
        title: "HTML Test",
        content:
          '<div><h1>Title</h1><p>Paragraph with <strong>bold</strong> and <a href="#">link</a>.</p></div>',
        author: null,
        published: null,
        source: null,
        ttr: null,
      });

      const result = await extractArticle(ARTICLE_URL);

      expect(result.content).not.toContain("<");
      expect(result.content).not.toContain(">");
      expect(result.content).toContain("Title");
      expect(result.content).toContain("bold");
      expect(result.content).toContain("link");
    });

    it("normalizes whitespace in extracted content", async () => {
      mockExtract.mockResolvedValue({
        title: "Whitespace Test",
        content: "<p>  Multiple   spaces   and\n\n\nnewlines  </p>",
        author: null,
        published: null,
        source: null,
        ttr: null,
      });

      const result = await extractArticle(ARTICLE_URL);

      expect(result.content).toBe("Multiple spaces and newlines");
    });

    it("truncates content exceeding MAX_CONTENT_LENGTH with marker", async () => {
      const longContent = "a".repeat(MAX_CONTENT_LENGTH + 1000);
      mockExtract.mockResolvedValue({
        title: "Long Article",
        content: `<p>${longContent}</p>`,
        author: null,
        published: null,
        source: null,
        ttr: null,
      });

      const result = await extractArticle(ARTICLE_URL);

      expect(result.content.length).toBeLessThanOrEqual(MAX_CONTENT_LENGTH + 50);
      expect(result.content).toContain("... [truncated]");
    });

    it("includes publishedDate in metadata when available", async () => {
      mockExtract.mockResolvedValue({
        title: "Dated Article",
        content: "<p>Content here.</p>",
        author: "Author",
        published: "2025-06-15T10:00:00Z",
        source: null,
        ttr: null,
      });

      const result = await extractArticle(ARTICLE_URL);

      expect(result.metadata.publishedDate).toBe("2025-06-15T10:00:00Z");
    });
  });

  describe("SSRF protection", () => {
    it("rejects private IP addresses", async () => {
      await expect(extractArticle("http://192.168.1.1/article")).rejects.toThrow(InvalidUrlError);
      expect(mockExtract).not.toHaveBeenCalled();
    });

    it("rejects localhost", async () => {
      await expect(extractArticle("http://localhost/article")).rejects.toThrow(InvalidUrlError);
      expect(mockExtract).not.toHaveBeenCalled();
    });

    it("rejects non-HTTP protocols", async () => {
      await expect(extractArticle("ftp://example.com/article")).rejects.toThrow(InvalidUrlError);
      expect(mockExtract).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("throws when extract returns null (non-article page)", async () => {
      mockExtract.mockResolvedValue(null);

      await expect(extractArticle(ARTICLE_URL)).rejects.toThrow(
        /failed to extract article content/i,
      );
    });

    it("throws when extract returns empty content", async () => {
      mockExtract.mockResolvedValue({
        title: "Empty",
        content: "",
        author: null,
        published: null,
        source: null,
        ttr: null,
      });

      await expect(extractArticle(ARTICLE_URL)).rejects.toThrow(
        /failed to extract article content/i,
      );
    });

    it("throws on extraction timeout", async () => {
      mockExtract.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 15_000)));

      await expect(extractArticle(ARTICLE_URL)).rejects.toThrow(/timed out/i);
    }, 15_000);

    it("propagates extraction errors", async () => {
      mockExtract.mockRejectedValue(new Error("Network error"));

      await expect(extractArticle(ARTICLE_URL)).rejects.toThrow("Network error");
    });
  });

  describe("partial content (paywalled)", () => {
    it("returns partial content when available", async () => {
      mockExtract.mockResolvedValue({
        title: "Paywalled Article",
        content: "<p>First paragraph visible.</p>",
        author: null,
        published: null,
        source: null,
        ttr: null,
      });

      const result = await extractArticle(ARTICLE_URL);

      expect(result.content).toBe("First paragraph visible.");
      expect(result.sourceType).toBe("article");
    });
  });
});
