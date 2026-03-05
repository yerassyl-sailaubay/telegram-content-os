/**
 * Tests for Twitter/X integration:
 * - PKCE flow (code verifier, code challenge, state generation)
 * - OAuth token exchange and refresh
 * - Tweet creation (single, thread, with media)
 * - Rate limit tracking
 * - Encryption utilities
 * - Error handling / retry logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock: global fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ---------------------------------------------------------------------------
// Mock: crypto.subtle for PKCE (happy-dom may not have full Web Crypto)
// ---------------------------------------------------------------------------

const mockDigest = vi.fn();

// We need subtle.digest for code challenge generation.
// If happy-dom doesn't provide it, we mock it.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
      subtle: {
        digest: mockDigest,
      },
    },
    writable: true,
  });
} else {
  // Real subtle exists, we can use it directly
  mockDigest.mockImplementation((algo: string, data: ArrayBuffer) =>
    globalThis.crypto.subtle.digest(algo, data),
  );
}

// ---------------------------------------------------------------------------
// Mock: DB and schema for rate limit tests
// ---------------------------------------------------------------------------

const mockDbSelect = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbInsert = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockSet = vi.fn();
const mockReturning = vi.fn();
const mockValues = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    select: () => {
      mockDbSelect();
      return {
        from: (...args: unknown[]) => {
          mockFrom(...args);
          return {
            where: (...wArgs: unknown[]) => {
              mockWhere(...wArgs);
              return {
                limit: (...lArgs: unknown[]) => {
                  mockLimit(...lArgs);
                  return mockLimit.mock.results[mockLimit.mock.calls.length - 1]?.value ?? [];
                },
              };
            },
          };
        },
      };
    },
    update: (...args: unknown[]) => {
      mockDbUpdate(...args);
      return {
        set: (...sArgs: unknown[]) => {
          mockSet(...sArgs);
          return {
            where: (...wArgs: unknown[]) => {
              mockWhere(...wArgs);
              return {
                returning: (...rArgs: unknown[]) => {
                  mockReturning(...rArgs);
                  return mockReturning.mock.results[mockReturning.mock.calls.length - 1]?.value ?? [];
                },
              };
            },
          };
        },
      };
    },
    insert: (...args: unknown[]) => {
      mockDbInsert(...args);
      return {
        values: (...vArgs: unknown[]) => {
          mockValues(...vArgs);
          return Promise.resolve();
        },
      };
    },
  },
}));

vi.mock("@/server/db/schema", () => ({
  usageTracking: {
    id: "id",
    userId: "user_id",
    month: "month",
    crossPostsCount: "cross_posts_count",
  },
  platformConnections: {
    id: "id",
    userId: "user_id",
    platform: "platform",
    accessTokenEncrypted: "access_token_encrypted",
    refreshTokenEncrypted: "refresh_token_encrypted",
    tokenExpiresAt: "token_expires_at",
  },
  crossPosts: {
    id: "id",
    status: "status",
    platformPostId: "platform_post_id",
    postedAt: "posted_at",
    updatedAt: "updated_at",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val, op: "eq" }),
  and: (...conditions: unknown[]) => ({ conditions, op: "and" }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
    op: "sql",
  }),
}));

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------

import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getTwitterUserInfo,
  createTweet,
  createThread,
  uploadMedia,
  checkRateLimit,
  incrementPostCount,
  getCurrentMonth,
  TWITTER_MONTHLY_POST_LIMIT,
  withRetry,
} from "../twitter";
import { TwitterApiError } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchResponse(data: unknown, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

function mockFetchError(errorBody: string, status: number): void {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve(JSON.parse(errorBody)),
    text: () => Promise.resolve(errorBody),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Twitter Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // PKCE helpers
  // -----------------------------------------------------------------------

  describe("PKCE helpers", () => {
    it("generateCodeVerifier returns a non-empty base64url string", () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toBeTruthy();
      expect(verifier.length).toBeGreaterThan(20);
      // base64url chars only
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("generateCodeVerifier produces unique values", () => {
      const v1 = generateCodeVerifier();
      const v2 = generateCodeVerifier();
      expect(v1).not.toBe(v2);
    });

    it("generateCodeChallenge produces a valid S256 challenge", async () => {
      const verifier = "test-code-verifier-value";

      const challenge = await generateCodeChallenge(verifier);
      expect(challenge).toBeTruthy();
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
      // Same input → same output (deterministic)
      const challenge2 = await generateCodeChallenge(verifier);
      expect(challenge).toBe(challenge2);
    });

    it("generateState returns a non-empty base64url string", () => {
      const state = generateState();
      expect(state).toBeTruthy();
      expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  // -----------------------------------------------------------------------
  // Authorization URL
  // -----------------------------------------------------------------------

  describe("buildAuthorizationUrl", () => {
    it("builds correct authorization URL with all params", () => {
      const url = buildAuthorizationUrl({
        clientId: "test-client-id",
        redirectUri: "http://localhost:3000/api/auth/twitter/callback",
        state: "test-state",
        codeChallenge: "test-challenge",
      });

      const parsed = new URL(url);
      expect(parsed.origin).toBe("https://x.com");
      expect(parsed.pathname).toBe("/i/oauth2/authorize");
      expect(parsed.searchParams.get("response_type")).toBe("code");
      expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
      expect(parsed.searchParams.get("redirect_uri")).toBe(
        "http://localhost:3000/api/auth/twitter/callback",
      );
      expect(parsed.searchParams.get("state")).toBe("test-state");
      expect(parsed.searchParams.get("code_challenge")).toBe("test-challenge");
      expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
      // Should include required scopes
      const scope = parsed.searchParams.get("scope") ?? "";
      expect(scope).toContain("tweet.read");
      expect(scope).toContain("tweet.write");
      expect(scope).toContain("users.read");
      expect(scope).toContain("offline.access");
    });
  });

  // -----------------------------------------------------------------------
  // Token exchange
  // -----------------------------------------------------------------------

  describe("exchangeCodeForTokens", () => {
    it("exchanges code for tokens successfully", async () => {
      const tokenResponse = {
        access_token: "test-access-token",
        token_type: "bearer",
        expires_in: 7200,
        refresh_token: "test-refresh-token",
        scope: "tweet.read tweet.write",
      };

      mockFetchResponse(tokenResponse);

      const result = await exchangeCodeForTokens({
        code: "auth-code",
        codeVerifier: "test-verifier",
        clientId: "client-id",
        clientSecret: "client-secret",
        redirectUri: "http://localhost:3000/callback",
      });

      expect(result.access_token).toBe("test-access-token");
      expect(result.refresh_token).toBe("test-refresh-token");
      expect(result.expires_in).toBe(7200);

      // Verify fetch was called correctly
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [fetchUrl, fetchOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(fetchUrl).toBe("https://api.x.com/2/oauth2/token");
      expect(fetchOptions.method).toBe("POST");
      expect(fetchOptions.headers).toHaveProperty(
        "Content-Type",
        "application/x-www-form-urlencoded",
      );
      // Check Authorization header has Basic auth
      const authHeader = (fetchOptions.headers as Record<string, string>).Authorization;
      expect(authHeader).toMatch(/^Basic /);
    });

    it("throws TwitterApiError on failure", async () => {
      mockFetchError('{"error":"invalid_grant"}', 400);

      await expect(
        exchangeCodeForTokens({
          code: "bad-code",
          codeVerifier: "test-verifier",
          clientId: "client-id",
          clientSecret: "client-secret",
          redirectUri: "http://localhost:3000/callback",
        }),
      ).rejects.toThrow(TwitterApiError);
    });
  });

  // -----------------------------------------------------------------------
  // Token refresh
  // -----------------------------------------------------------------------

  describe("refreshAccessToken", () => {
    it("refreshes token successfully", async () => {
      const tokenResponse = {
        access_token: "new-access-token",
        token_type: "bearer",
        expires_in: 7200,
        refresh_token: "new-refresh-token",
        scope: "tweet.read tweet.write",
      };

      mockFetchResponse(tokenResponse);

      const result = await refreshAccessToken({
        refreshToken: "old-refresh-token",
        clientId: "client-id",
        clientSecret: "client-secret",
      });

      expect(result.access_token).toBe("new-access-token");
      expect(result.refresh_token).toBe("new-refresh-token");

      // Verify refresh_token was sent in body
      const body = (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string;
      expect(body).toContain("grant_type=refresh_token");
      expect(body).toContain("refresh_token=old-refresh-token");
    });

    it("throws on refresh failure", async () => {
      mockFetchError('{"error":"invalid_grant"}', 401);

      await expect(
        refreshAccessToken({
          refreshToken: "expired-token",
          clientId: "client-id",
          clientSecret: "client-secret",
        }),
      ).rejects.toThrow(TwitterApiError);
    });
  });

  // -----------------------------------------------------------------------
  // User info
  // -----------------------------------------------------------------------

  describe("getTwitterUserInfo", () => {
    it("fetches user info successfully", async () => {
      mockFetchResponse({
        data: { id: "123456", name: "Test User", username: "testuser" },
      });

      const user = await getTwitterUserInfo("test-access-token");

      expect(user.id).toBe("123456");
      expect(user.name).toBe("Test User");
      expect(user.username).toBe("testuser");

      // Verify auth header
      const headers = (mockFetch.mock.calls[0] as [string, RequestInit])[1].headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer test-access-token");
    });

    it("throws on failure", async () => {
      mockFetchError('{"error":"unauthorized"}', 401);

      await expect(getTwitterUserInfo("bad-token")).rejects.toThrow(
        TwitterApiError,
      );
    });
  });

  // -----------------------------------------------------------------------
  // Tweet creation
  // -----------------------------------------------------------------------

  describe("createTweet", () => {
    it("creates a single tweet successfully", async () => {
      mockFetchResponse({
        data: { id: "tweet-123", text: "Hello, Twitter!" },
      });

      const result = await createTweet("access-token", "Hello, Twitter!");

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe("tweet-123");

      // Verify request body
      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      ) as Record<string, unknown>;
      expect(body.text).toBe("Hello, Twitter!");
      expect(body.reply).toBeUndefined();
      expect(body.media).toBeUndefined();
    });

    it("creates a reply tweet", async () => {
      mockFetchResponse({
        data: { id: "reply-456", text: "This is a reply" },
      });

      const result = await createTweet("access-token", "This is a reply", {
        replyToTweetId: "parent-789",
      });

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe("reply-456");

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      ) as Record<string, unknown>;
      expect(body.reply).toEqual({ in_reply_to_tweet_id: "parent-789" });
    });

    it("creates a tweet with media", async () => {
      mockFetchResponse({
        data: { id: "media-tweet-123", text: "Check this out!" },
      });

      const result = await createTweet("access-token", "Check this out!", {
        mediaIds: ["media-1", "media-2"],
      });

      expect(result.success).toBe(true);

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      ) as Record<string, unknown>;
      expect(body.media).toEqual({ media_ids: ["media-1", "media-2"] });
    });

    it("throws TwitterApiError on 403", async () => {
      mockFetchError('{"detail":"Forbidden"}', 403);

      await expect(
        createTweet("access-token", "test"),
      ).rejects.toThrow(TwitterApiError);
    });

    it("retries on 429 rate limit", async () => {
      // First call: 429
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('{"detail":"Too Many Requests"}'),
      });

      // Second call: success
      mockFetchResponse({
        data: { id: "tweet-after-retry", text: "Hello!" },
      });

      const result = await createTweet("access-token", "Hello!");

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe("tweet-after-retry");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("retries on 500 server error", async () => {
      // First call: 500
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });

      // Second call: success
      mockFetchResponse({
        data: { id: "tweet-recovered", text: "Recovered!" },
      });

      const result = await createTweet("access-token", "Recovered!");

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // -----------------------------------------------------------------------
  // Thread creation
  // -----------------------------------------------------------------------

  describe("createThread", () => {
    it("creates a thread of tweets as reply chain", async () => {
      // Tweet 1
      mockFetchResponse({
        data: { id: "thread-1", text: "First tweet" },
      });
      // Tweet 2 (reply to 1)
      mockFetchResponse({
        data: { id: "thread-2", text: "Second tweet" },
      });
      // Tweet 3 (reply to 2)
      mockFetchResponse({
        data: { id: "thread-3", text: "Third tweet" },
      });

      const result = await createThread("access-token", [
        "First tweet",
        "Second tweet",
        "Third tweet",
      ]);

      expect(result.postIds).toEqual(["thread-1", "thread-2", "thread-3"]);
      expect(result.firstPostId).toBe("thread-1");

      // Verify first tweet has no reply
      const body1 = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      ) as Record<string, unknown>;
      expect(body1.reply).toBeUndefined();

      // Verify second tweet replies to first
      const body2 = JSON.parse(
        (mockFetch.mock.calls[1] as [string, RequestInit])[1].body as string,
      ) as Record<string, unknown>;
      expect(body2.reply).toEqual({ in_reply_to_tweet_id: "thread-1" });

      // Verify third tweet replies to second
      const body3 = JSON.parse(
        (mockFetch.mock.calls[2] as [string, RequestInit])[1].body as string,
      ) as Record<string, unknown>;
      expect(body3.reply).toEqual({ in_reply_to_tweet_id: "thread-2" });
    });

    it("throws on empty tweets array", async () => {
      await expect(createThread("access-token", [])).rejects.toThrow(
        "Thread must contain at least one tweet",
      );
    });

    it("handles single-tweet thread", async () => {
      mockFetchResponse({
        data: { id: "single-thread", text: "Only one tweet" },
      });

      const result = await createThread("access-token", ["Only one tweet"]);

      expect(result.postIds).toEqual(["single-thread"]);
      expect(result.firstPostId).toBe("single-thread");
    });
  });

  // -----------------------------------------------------------------------
  // Media upload
  // -----------------------------------------------------------------------

  describe("uploadMedia", () => {
    it("uploads an image and returns media_id_string", async () => {
      mockFetchResponse({
        media_id_string: "media-upload-123",
        size: 1024,
        expires_after_secs: 86400,
        image: { image_type: "image/png", w: 800, h: 600 },
      });

      const buffer = Buffer.from("fake-image-data");
      const mediaId = await uploadMedia("access-token", buffer, "image/png");

      expect(mediaId).toBe("media-upload-123");

      // Verify the upload URL
      const [fetchUrl] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(fetchUrl).toBe(
        "https://upload.twitter.com/1.1/media/upload.json",
      );
    });

    it("throws on upload failure", async () => {
      mockFetchError('{"error":"media_upload_failed"}', 400);

      const buffer = Buffer.from("fake-image-data");
      await expect(
        uploadMedia("access-token", buffer),
      ).rejects.toThrow(TwitterApiError);
    });
  });

  // -----------------------------------------------------------------------
  // Rate limit tracking
  // -----------------------------------------------------------------------

  describe("Rate limit tracking", () => {
    describe("getCurrentMonth", () => {
      it("returns YYYY-MM format", () => {
        const month = getCurrentMonth();
        expect(month).toMatch(/^\d{4}-\d{2}$/);
      });
    });

    describe("checkRateLimit", () => {
      it("returns allowed=true when under limit", async () => {
        mockLimit.mockReturnValueOnce([{ crossPostsCount: 100 }]);

        const result = await checkRateLimit("user-123");

        expect(result.allowed).toBe(true);
        expect(result.currentCount).toBe(100);
        expect(result.limit).toBe(TWITTER_MONTHLY_POST_LIMIT);
        expect(result.remaining).toBe(TWITTER_MONTHLY_POST_LIMIT - 100);
      });

      it("returns allowed=false when at limit", async () => {
        mockLimit.mockReturnValueOnce([
          { crossPostsCount: TWITTER_MONTHLY_POST_LIMIT },
        ]);

        const result = await checkRateLimit("user-123");

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      });

      it("returns allowed=true when no tracking row exists", async () => {
        mockLimit.mockReturnValueOnce([]);

        const result = await checkRateLimit("user-123");

        expect(result.allowed).toBe(true);
        expect(result.currentCount).toBe(0);
        expect(result.remaining).toBe(TWITTER_MONTHLY_POST_LIMIT);
      });
    });

    describe("incrementPostCount", () => {
      it("updates existing row", async () => {
        mockReturning.mockReturnValueOnce([{ id: "tracking-row-1" }]);

        await incrementPostCount("user-123", 1);

        expect(mockDbUpdate).toHaveBeenCalled();
        expect(mockDbInsert).not.toHaveBeenCalled();
      });

      it("inserts new row when no existing row", async () => {
        mockReturning.mockReturnValueOnce([]);

        await incrementPostCount("user-123", 1);

        expect(mockDbUpdate).toHaveBeenCalled();
        expect(mockDbInsert).toHaveBeenCalled();
      });
    });
  });

  // -----------------------------------------------------------------------
  // Retry logic
  // -----------------------------------------------------------------------

  describe("withRetry", () => {
    it("returns immediately on success", async () => {
      const fn = vi.fn().mockResolvedValueOnce("success");
      const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries on TwitterApiError with retryable=true", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(
          new TwitterApiError("Rate limited", 429, "rate_limit", true),
        )
        .mockResolvedValueOnce("recovered");

      const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
      expect(result).toBe("recovered");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("throws immediately on non-retryable error", async () => {
      const fn = vi.fn().mockRejectedValueOnce(
        new TwitterApiError("Forbidden", 403, "forbidden", false),
      );

      await expect(
        withRetry(fn, { maxRetries: 3, baseDelayMs: 1 }),
      ).rejects.toThrow("Forbidden");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("throws after max retries exhausted", async () => {
      const error = new TwitterApiError("Server Error", 500, "server_error", true);
      const fn = vi.fn().mockRejectedValue(error);

      await expect(
        withRetry(fn, { maxRetries: 2, baseDelayMs: 1 }),
      ).rejects.toThrow("Server Error");
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it("throws immediately on non-TwitterApiError", async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error("generic error"));

      await expect(
        withRetry(fn, { maxRetries: 3, baseDelayMs: 1 }),
      ).rejects.toThrow("generic error");
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // TwitterApiError
  // -----------------------------------------------------------------------

  describe("TwitterApiError", () => {
    it("has correct properties", () => {
      const error = new TwitterApiError("test error", 429, "rate_limit", true);
      expect(error.message).toBe("test error");
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe("rate_limit");
      expect(error.retryable).toBe(true);
      expect(error.name).toBe("TwitterApiError");
      expect(error).toBeInstanceOf(Error);
    });

    it("defaults retryable to false", () => {
      const error = new TwitterApiError("test", 400);
      expect(error.retryable).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Encryption
  // -----------------------------------------------------------------------

  describe("Encryption", () => {
    const MOCK_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    beforeEach(() => {
      process.env.ENCRYPTION_KEY = MOCK_KEY;
    });

    afterEach(() => {
      delete process.env.ENCRYPTION_KEY;
    });

    it("encrypts and decrypts a string", async () => {
      // Dynamic import to get fresh module with env var set
      const { encrypt, decrypt } = await import("../encryption");

      const plaintext = "my-secret-access-token";
      const encrypted = encrypt(plaintext);

      // Encrypted should be base64
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(0);

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("produces different ciphertext for same plaintext (random IV)", async () => {
      const { encrypt } = await import("../encryption");

      const plaintext = "same-token-value";
      const enc1 = encrypt(plaintext);
      const enc2 = encrypt(plaintext);

      // Different IVs → different ciphertext
      expect(enc1).not.toBe(enc2);
    });

    it("throws on missing ENCRYPTION_KEY", async () => {
      delete process.env.ENCRYPTION_KEY;
      const { encrypt } = await import("../encryption");

      expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY environment variable is not set");
    });

    it("accepts any non-empty ENCRYPTION_KEY (SHA-256 derives key)", async () => {
      process.env.ENCRYPTION_KEY = "tooshort";
      const { encrypt, decrypt } = await import("../encryption");

      // SHA-256 derivation accepts any string — no length restriction
      const encrypted = encrypt("test");
      expect(typeof encrypted).toBe("string");
      expect(decrypt(encrypted)).toBe("test");
    });

    it("throws on tampered ciphertext", async () => {
      process.env.ENCRYPTION_KEY = MOCK_KEY;
      const { encrypt, decrypt } = await import("../encryption");

      const encrypted = encrypt("test-value");
      // Tamper with the ciphertext
      const buf = Buffer.from(encrypted, "base64");
      buf[28] ^= 0xff; // flip a byte in the ciphertext (after 12-byte IV + 16-byte authTag)
      const tampered = buf.toString("base64");
      expect(() => decrypt(tampered)).toThrow();
    });
  });
});
