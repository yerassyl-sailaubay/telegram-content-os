import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TelegramClient, withRetry } from "../client";
import { TelegramApiError } from "../types";

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
// TelegramClient tests
// ---------------------------------------------------------------------------

describe("TelegramClient", () => {
  const BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
  let client: TelegramClient;

  beforeEach(() => {
    client = new TelegramClient(BOT_TOKEN, {
      retryOptions: { maxRetries: 0 }, // disable retry for unit tests
    });
  });

  it("throws if bot token is empty", () => {
    expect(() => new TelegramClient("")).toThrow("TELEGRAM_BOT_TOKEN is required");
  });

  describe("getMe", () => {
    it("returns bot user on success", async () => {
      const botUser = {
        id: 123456,
        is_bot: true,
        first_name: "TestBot",
        username: "test_bot",
      };

      mockFetch.mockResolvedValueOnce(
        mockResponse({ ok: true, result: botUser }),
      );

      const result = await client.getMe();

      expect(result).toEqual(botUser);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.telegram.org/bot${BOT_TOKEN}/getMe`,
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("throws TelegramApiError on API failure", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          { ok: false, description: "Unauthorized", error_code: 401 },
          401,
        ),
      );

      await expect(client.getMe()).rejects.toThrow(TelegramApiError);
      await expect(client.getMe()).rejects.toThrow(); // Re-mock needed
    });
  });

  describe("getChat", () => {
    it("returns chat info", async () => {
      const chat = {
        id: -1001234567890,
        type: "channel",
        title: "Test Channel",
        username: "test_channel",
      };

      mockFetch.mockResolvedValueOnce(
        mockResponse({ ok: true, result: chat }),
      );

      const result = await client.getChat(-1001234567890);

      expect(result).toEqual(chat);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.telegram.org/bot${BOT_TOKEN}/getChat`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ chat_id: -1001234567890 }),
        }),
      );
    });
  });

  describe("getChatMemberCount", () => {
    it("returns member count", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ ok: true, result: 42 }),
      );

      const count = await client.getChatMemberCount(-1001234567890);

      expect(count).toBe(42);
    });
  });

  describe("sendMessage", () => {
    it("sends a text message", async () => {
      const sent = {
        message_id: 1,
        chat: { id: -1001234567890, type: "channel" },
        date: 1700000000,
        text: "Hello!",
      };

      mockFetch.mockResolvedValueOnce(
        mockResponse({ ok: true, result: sent }),
      );

      const result = await client.sendMessage(-1001234567890, "Hello!");

      expect(result).toEqual(sent);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        expect.objectContaining({
          body: JSON.stringify({
            chat_id: -1001234567890,
            text: "Hello!",
          }),
        }),
      );
    });

    it("includes parse_mode when provided", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          ok: true,
          result: {
            message_id: 2,
            chat: { id: 123, type: "channel" },
            date: 1700000000,
            text: "<b>Bold</b>",
          },
        }),
      );

      await client.sendMessage(123, "<b>Bold</b>", {
        parse_mode: "HTML",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            chat_id: 123,
            text: "<b>Bold</b>",
            parse_mode: "HTML",
          }),
        }),
      );
    });
  });

  describe("setWebhook", () => {
    it("sets webhook with secret token", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ ok: true, result: true }),
      );

      const result = await client.setWebhook("https://example.com/webhook", {
        secret_token: "my-secret",
        allowed_updates: ["channel_post"],
      });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
        expect.objectContaining({
          body: JSON.stringify({
            url: "https://example.com/webhook",
            secret_token: "my-secret",
            allowed_updates: ["channel_post"],
          }),
        }),
      );
    });
  });

  describe("deleteWebhook", () => {
    it("deletes webhook", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ ok: true, result: true }),
      );

      const result = await client.deleteWebhook(true);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`,
        expect.objectContaining({
          body: JSON.stringify({ drop_pending_updates: true }),
        }),
      );
    });
  });

  describe("error handling", () => {
    it("throws TelegramApiError with correct fields", async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          {
            ok: false,
            description: "Bad Request: chat not found",
            error_code: 400,
          },
          400,
        ),
      );

      try {
        await client.getChat(999);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TelegramApiError);
        const apiError = error as TelegramApiError;
        expect(apiError.message).toBe("Bad Request: chat not found");
        expect(apiError.statusCode).toBe(400);
        expect(apiError.errorCode).toBe(400);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// withRetry tests
// ---------------------------------------------------------------------------

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");

    const result = await withRetry(fn, { maxRetries: 3 });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable TelegramApiError (429)", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TelegramApiError("Rate limited", 429))
      .mockResolvedValueOnce("ok");

    // withRetry uses real setTimeout internally, so we advance timers
    const promise = withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
    });

    // Advance timers for the backoff
    await vi.advanceTimersByTimeAsync(5000);

    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on retryable TelegramApiError (500)", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TelegramApiError("Server error", 500))
      .mockRejectedValueOnce(new TelegramApiError("Server error", 500))
      .mockResolvedValueOnce("ok");

    const promise = withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
    });

    await vi.advanceTimersByTimeAsync(10000);

    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-retryable errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TelegramApiError("Bad Request", 400));

    await expect(
      withRetry(fn, { maxRetries: 3, baseDelayMs: 10 }),
    ).rejects.toThrow("Bad Request");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting retries", async () => {
    vi.useRealTimers(); // use real timers for this test since we need tiny delays
    let callCount = 0;
    const fn = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.reject(new TelegramApiError("Rate limited", 429));
    });

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 1 }),
    ).rejects.toThrow("Rate limited");

    expect(callCount).toBe(3); // initial + 2 retries
  });

  it("does not retry non-TelegramApiError", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    await expect(
      withRetry(fn, { maxRetries: 3, baseDelayMs: 10 }),
    ).rejects.toThrow("Network error");

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
