/**
 * Twitter/X platform integration service.
 *
 * OAuth 2.0 with PKCE, v2 tweets API, media upload (v1.1), token refresh,
 * and rate limit tracking for the free tier (1,500 posts/month).
 *
 * Uses native fetch — no external SDK dependencies.
 */

import type {
  TwitterTokenResponse,
  TwitterTweetResponse,
  TwitterUserInfo,
  TwitterMediaUploadResponse,
  PostResult,
} from "./types";
import { TwitterApiError } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TWITTER_AUTH_URL = "https://x.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const TWITTER_TWEETS_URL = "https://api.x.com/2/tweets";
const TWITTER_USERINFO_URL = "https://api.x.com/2/users/me";
const TWITTER_MEDIA_UPLOAD_URL =
  "https://upload.twitter.com/1.1/media/upload.json";

const TWITTER_SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "offline.access",
];

/** Twitter free tier: 1,500 posts per month. */
export const TWITTER_MONTHLY_POST_LIMIT = 1500;

/** Status codes that warrant a retry. */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// Retry helper (mirrors telegram/client.ts pattern)
// ---------------------------------------------------------------------------

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isRetryable =
        error instanceof TwitterApiError && error.retryable;

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
      await sleep(delay);
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

/**
 * Generates a cryptographically random code verifier for PKCE.
 * Uses crypto.getRandomValues for browser/edge runtime compatibility.
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Derives a S256 code challenge from a code verifier.
 */
export async function generateCodeChallenge(
  codeVerifier: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generates a random state parameter for CSRF protection.
 */
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

// ---------------------------------------------------------------------------
// OAuth 2.0 PKCE flow
// ---------------------------------------------------------------------------

/**
 * Builds the Twitter authorization URL for OAuth 2.0 PKCE flow.
 */
export function buildAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(TWITTER_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", TWITTER_SCOPES.join(" "));
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

/**
 * Exchanges an authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<TwitterTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
    client_id: params.clientId,
  });

  const credentials = btoa(`${params.clientId}:${params.clientSecret}`);

  const response = await fetch(TWITTER_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new TwitterApiError(
      `Token exchange failed: ${errorBody}`,
      response.status,
      "token_exchange_failed",
    );
  }

  return (await response.json()) as TwitterTokenResponse;
}

/**
 * Refreshes an expired access token using a refresh token.
 */
export async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<TwitterTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
  });

  const credentials = btoa(`${params.clientId}:${params.clientSecret}`);

  const response = await fetch(TWITTER_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new TwitterApiError(
      `Token refresh failed: ${errorBody}`,
      response.status,
      "token_refresh_failed",
    );
  }

  return (await response.json()) as TwitterTokenResponse;
}

// ---------------------------------------------------------------------------
// User info
// ---------------------------------------------------------------------------

/**
 * Fetches the authenticated user's profile from Twitter.
 */
export async function getTwitterUserInfo(
  accessToken: string,
): Promise<TwitterUserInfo> {
  const response = await fetch(TWITTER_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new TwitterApiError(
      `Failed to get user info: ${errorBody}`,
      response.status,
      "userinfo_failed",
    );
  }

  const json = (await response.json()) as { data: TwitterUserInfo };
  return json.data;
}

// ---------------------------------------------------------------------------
// Tweet posting (v2 API)
// ---------------------------------------------------------------------------

/**
 * Creates a single tweet. Optionally a reply or with media.
 */
export async function createTweet(
  accessToken: string,
  text: string,
  options?: {
    replyToTweetId?: string;
    mediaIds?: string[];
  },
): Promise<PostResult> {
  const body: Record<string, unknown> = { text };

  if (options?.replyToTweetId) {
    body.reply = { in_reply_to_tweet_id: options.replyToTweetId };
  }

  if (options?.mediaIds && options.mediaIds.length > 0) {
    body.media = { media_ids: options.mediaIds };
  }

  return withRetry(async () => {
    const response = await fetch(TWITTER_TWEETS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const retryable = RETRYABLE_STATUS_CODES.has(response.status);
      throw new TwitterApiError(
        `Tweet creation failed: ${errorBody}`,
        response.status,
        "tweet_create_failed",
        retryable,
      );
    }

    const json = (await response.json()) as TwitterTweetResponse;
    return {
      success: true,
      platformPostId: json.data.id,
    };
  });
}

/**
 * Creates a thread (sequence of tweets as reply chain).
 *
 * 1. Post first tweet, get tweet_id
 * 2. Post each subsequent tweet as reply to previous tweet_id
 * 3. Return array of all tweet_ids
 */
export async function createThread(
  accessToken: string,
  tweets: string[],
  options?: {
    mediaIds?: (string | undefined)[];
  },
): Promise<{ postIds: string[]; firstPostId: string }> {
  if (tweets.length === 0) {
    throw new Error("Thread must contain at least one tweet");
  }

  const postIds: string[] = [];
  let previousTweetId: string | undefined;

  for (let i = 0; i < tweets.length; i++) {
    const tweetText = tweets[i]!;
    const mediaId = options?.mediaIds?.[i];

    const result = await createTweet(accessToken, tweetText, {
      replyToTweetId: previousTweetId,
      mediaIds: mediaId ? [mediaId] : undefined,
    });

    if (!result.platformPostId) {
      throw new TwitterApiError(
        `Thread creation failed at tweet ${i + 1}: no post ID returned`,
        500,
        "thread_create_failed",
      );
    }

    postIds.push(result.platformPostId);
    previousTweetId = result.platformPostId;
  }

  return {
    postIds,
    firstPostId: postIds[0]!,
  };
}

// ---------------------------------------------------------------------------
// Media upload (v1.1 — still required)
// ---------------------------------------------------------------------------

/**
 * Uploads media (image) to Twitter for use in tweets.
 * Uses the v1.1 media/upload endpoint with multipart form data.
 *
 * Note: The v1.1 media upload requires OAuth 1.0a or app-only auth.
 * With OAuth 2.0, we use the media_data approach with base64 encoding.
 */
export async function uploadMedia(
  accessToken: string,
  imageBuffer: Buffer,
  mimeType: string = "image/png",
): Promise<string> {
  const base64Data = imageBuffer.toString("base64");

  const formData = new URLSearchParams({
    media_data: base64Data,
    media_category: mimeType.startsWith("video/") ? "tweet_video" : "tweet_image",
  });

  return withRetry(async () => {
    const response = await fetch(TWITTER_MEDIA_UPLOAD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const retryable = RETRYABLE_STATUS_CODES.has(response.status);
      throw new TwitterApiError(
        `Media upload failed: ${errorBody}`,
        response.status,
        "media_upload_failed",
        retryable,
      );
    }

    const json = (await response.json()) as TwitterMediaUploadResponse;
    return json.media_id_string;
  });
}

// ---------------------------------------------------------------------------
// Rate limit tracking
// ---------------------------------------------------------------------------

/**
 * Returns the current month string in YYYY-MM format.
 */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Checks if the user has exceeded their monthly post limit.
 * Returns rate limit info.
 */
export async function checkRateLimit(
  userId: string,
): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
}> {
  const { db } = await import("@/server/db");
  const { usageTracking } = await import("@/server/db/schema");
  const { eq, and } = await import("drizzle-orm");

  const month = getCurrentMonth();

  const rows = await db
    .select({ crossPostsCount: usageTracking.crossPostsCount })
    .from(usageTracking)
    .where(
      and(eq(usageTracking.userId, userId), eq(usageTracking.month, month)),
    )
    .limit(1);

  const currentCount = rows[0]?.crossPostsCount ?? 0;
  const remaining = Math.max(0, TWITTER_MONTHLY_POST_LIMIT - currentCount);

  return {
    allowed: currentCount < TWITTER_MONTHLY_POST_LIMIT,
    currentCount,
    limit: TWITTER_MONTHLY_POST_LIMIT,
    remaining,
  };
}

/**
 * Increments the monthly cross-post count for a user.
 * Creates the tracking row if it doesn't exist (upsert).
 */
export async function incrementPostCount(
  userId: string,
  count: number = 1,
): Promise<void> {
  const { db } = await import("@/server/db");
  const { usageTracking } = await import("@/server/db/schema");
  const { eq, and, sql } = await import("drizzle-orm");

  const month = getCurrentMonth();

  // Try to update existing row
  const updated = await db
    .update(usageTracking)
    .set({
      crossPostsCount: sql`${usageTracking.crossPostsCount} + ${count}`,
      updatedAt: new Date(),
    })
    .where(
      and(eq(usageTracking.userId, userId), eq(usageTracking.month, month)),
    )
    .returning({ id: usageTracking.id });

  // If no row existed, insert one
  if (updated.length === 0) {
    await db.insert(usageTracking).values({
      userId,
      month,
      crossPostsCount: count,
    });
  }
}
