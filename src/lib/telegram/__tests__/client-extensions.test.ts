import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TelegramClient } from "../client";
import { TelegramApiError } from "../types";
import type { InputMediaPhoto, InputMediaVideo } from "../types";

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helper to create mock Response
// ---------------------------------------------------------------------------

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// TelegramClient extension tests
// ---------------------------------------------------------------------------

describe("TelegramClient extensions", () => {
  const BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
  let client: TelegramClient;

  beforeEach(() => {
    client = new TelegramClient(BOT_TOKEN, {
      retryOptions: { maxRetries: 0 },
    });
  });

  // ---- sendMediaGroup ----

  describe("sendMediaGroup", () => {
    it("calls the sendMediaGroup endpoint with chat_id and media array", async () => {
      const sentMessages = [
        { message_id: 1, chat: { id: -1001234567890, type: "channel" }, date: 1700000000 },
        { message_id: 2, chat: { id: -1001234567890, type: "channel" }, date: 1700000000 },
      ];

      mockFetch.mockResolvedValueOnce(mockResponse({ ok: true, result: sentMessages }));

      const media: InputMediaPhoto[] = [
        { type: "photo", media: "https://example.com/photo1.jpg", caption: "Photo 1" },
        { type: "photo", media: "https://example.com/photo2.jpg" },
      ];

      const result = await client.sendMediaGroup(-1001234567890, media);

      expect(result).toEqual(sentMessages);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            chat_id: -1001234567890,
            media,
          }),
        }),
      );
    });

    it("returns array of message objects", async () => {
      const sentMessages = [
        { message_id: 10, chat: { id: 123, type: "private" }, date: 1700000001 },
        { message_id: 11, chat: { id: 123, type: "private" }, date: 1700000001 },
        { message_id: 12, chat: { id: 123, type: "private" }, date: 1700000001 },
      ];

      mockFetch.mockResolvedValueOnce(mockResponse({ ok: true, result: sentMessages }));

      const media: (InputMediaPhoto | InputMediaVideo)[] = [
        { type: "photo", media: "file_id_1" },
        { type: "video", media: "file_id_2", width: 1280, height: 720 },
        { type: "photo", media: "file_id_3" },
      ];

      const result = await client.sendMediaGroup(123, media);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });

    it("passes optional disable_notification parameter", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          ok: true,
          result: [{ message_id: 1, chat: { id: 100, type: "channel" }, date: 1700000000 }],
        }),
      );

      const media: InputMediaPhoto[] = [{ type: "photo", media: "file_id_abc" }];

      await client.sendMediaGroup(100, media, { disable_notification: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            chat_id: 100,
            media,
            disable_notification: true,
          }),
        }),
      );
    });

    it("throws TelegramApiError on API failure", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          { ok: false, description: "Bad Request: invalid media group", error_code: 400 },
          400,
        ),
      );

      const media: InputMediaPhoto[] = [{ type: "photo", media: "invalid" }];

      await expect(client.sendMediaGroup(-1001234567890, media)).rejects.toThrow(TelegramApiError);
    });
  });

  // ---- sendPoll ----

  describe("sendPoll", () => {
    it("calls the sendPoll endpoint with chat_id, question, and options", async () => {
      const sentMessage = {
        message_id: 5,
        chat: { id: -1001234567890, type: "channel" },
        date: 1700000000,
      };

      mockFetch.mockResolvedValueOnce(mockResponse({ ok: true, result: sentMessage }));

      const result = await client.sendPoll(-1001234567890, "What is your favorite color?", [
        "Red",
        "Green",
        "Blue",
      ]);

      expect(result).toEqual(sentMessage);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendPoll`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            chat_id: -1001234567890,
            question: "What is your favorite color?",
            options: ["Red", "Green", "Blue"],
          }),
        }),
      );
    });

    it("returns a message object", async () => {
      const sentMessage = {
        message_id: 6,
        chat: { id: 456, type: "group" },
        date: 1700000002,
      };

      mockFetch.mockResolvedValueOnce(mockResponse({ ok: true, result: sentMessage }));

      const result = await client.sendPoll(456, "Yes or No?", ["Yes", "No"]);

      expect(result).toEqual(sentMessage);
      expect(result.message_id).toBe(6);
    });

    it("passes optional is_anonymous parameter", async () => {
      const sentMessage = {
        message_id: 7,
        chat: { id: 789, type: "channel" },
        date: 1700000003,
      };

      mockFetch.mockResolvedValueOnce(mockResponse({ ok: true, result: sentMessage }));

      await client.sendPoll(789, "Anonymous poll?", ["Option A", "Option B"], {
        is_anonymous: false,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            chat_id: 789,
            question: "Anonymous poll?",
            options: ["Option A", "Option B"],
            is_anonymous: false,
          }),
        }),
      );
    });

    it("passes quiz poll options correctly", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          ok: true,
          result: { message_id: 8, chat: { id: 1, type: "channel" }, date: 1700000000 },
        }),
      );

      await client.sendPoll(1, "What is 2+2?", ["3", "4", "5"], {
        type: "quiz",
        correct_option_id: 1,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            chat_id: 1,
            question: "What is 2+2?",
            options: ["3", "4", "5"],
            type: "quiz",
            correct_option_id: 1,
          }),
        }),
      );
    });

    it("throws TelegramApiError on API failure", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          {
            ok: false,
            description: "Bad Request: poll must have at least 2 options",
            error_code: 400,
          },
          400,
        ),
      );

      await expect(
        client.sendPoll(-1001234567890, "Bad poll?", ["only one option"]),
      ).rejects.toThrow(TelegramApiError);
    });
  });

  // ---- sendDocument ----

  describe("sendDocument", () => {
    it("calls the sendDocument endpoint with chat_id and document", async () => {
      const sentMessage = {
        message_id: 20,
        chat: { id: -1001234567890, type: "channel" },
        date: 1700000000,
      };

      mockFetch.mockResolvedValueOnce(mockResponse({ ok: true, result: sentMessage }));

      const result = await client.sendDocument(-1001234567890, "https://example.com/document.pdf");

      expect(result).toEqual(sentMessage);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            chat_id: -1001234567890,
            document: "https://example.com/document.pdf",
          }),
        }),
      );
    });

    it("passes optional caption parameter", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          ok: true,
          result: { message_id: 21, chat: { id: 100, type: "channel" }, date: 1700000000 },
        }),
      );

      await client.sendDocument(100, "file_id_xyz", { caption: "My document" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            chat_id: 100,
            document: "file_id_xyz",
            caption: "My document",
          }),
        }),
      );
    });

    it("passes optional parse_mode parameter", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          ok: true,
          result: { message_id: 22, chat: { id: 200, type: "channel" }, date: 1700000000 },
        }),
      );

      await client.sendDocument(200, "file_id_abc", {
        caption: "<b>Important file</b>",
        parse_mode: "HTML",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            chat_id: 200,
            document: "file_id_abc",
            caption: "<b>Important file</b>",
            parse_mode: "HTML",
          }),
        }),
      );
    });

    it("works with file_id string", async () => {
      const sentMessage = {
        message_id: 23,
        chat: { id: 300, type: "private" },
        date: 1700000000,
      };

      mockFetch.mockResolvedValueOnce(mockResponse({ ok: true, result: sentMessage }));

      const result = await client.sendDocument(300, "BQACAgIAAxkBAAIBZ2JzYWZrZQ");

      expect(result).toEqual(sentMessage);
    });

    it("throws TelegramApiError on API failure", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          { ok: false, description: "Bad Request: wrong file identifier", error_code: 400 },
          400,
        ),
      );

      await expect(client.sendDocument(-1001234567890, "invalid_file_id")).rejects.toThrow(
        TelegramApiError,
      );
    });
  });
});
