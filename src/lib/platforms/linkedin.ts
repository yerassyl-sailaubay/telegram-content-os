/**
 * LinkedIn platform integration service.
 *
 * Handles OAuth 2.0 PKCE flow, Posts API for content publishing,
 * image upload, token refresh, and retry logic.
 *
 * Uses native fetch — no external HTTP dependencies.
 * Uses native crypto — no external encryption dependencies.
 */

import * as crypto from "crypto";

import type {
  TokenPair,
  PostResult,
  LinkedInTokenResponse,
  LinkedInUserInfo,
  LinkedInImageUploadResponse,
  LinkedInPostBody,
} from "./types";
import { LinkedInApiError } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LINKEDIN_AUTH_BASE = "https://www.linkedin.com/oauth/v2";
const LINKEDIN_API_BASE = "https://api.linkedin.com";

/** LinkedIn API version header (YYYYMM format). */
const LINKEDIN_API_VERSION = "202401";

/** Status codes that warrant a retry (rate-limit, server errors). */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/** Default retry configuration. */
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

/** OAuth scopes needed for personal profile posting. */
const LINKEDIN_SCOPES = [
  "openid",
  "profile",
  "email",
  "w_member_social",
].join(" ");

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

/**
 * Generates a cryptographically random code verifier for PKCE.
 * Returns a URL-safe string between 43-128 characters.
 */
export function generateCodeVerifier(): string {
  const buffer = crypto.randomBytes(32);
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Generates the S256 code challenge from a code verifier.
 * Uses SHA-256 hash, base64url-encoded without padding.
 */
export async function generateCodeChallenge(
  codeVerifier: string,
): Promise<string> {
  const hash = crypto.createHash("sha256").update(codeVerifier).digest();
  return hash
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}


// ---------------------------------------------------------------------------
// Retry logic
// ---------------------------------------------------------------------------

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes `fn` with exponential backoff retries on retryable LinkedIn errors.
 */
export async function withLinkedInRetry<T>(
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
        error instanceof LinkedInApiError &&
        RETRYABLE_STATUS_CODES.has(error.statusCode);

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
      await sleep(delay);
    }
  }

  // Should be unreachable but satisfies TS
  throw lastError;
}

// ---------------------------------------------------------------------------
// Standard LinkedIn API headers
// ---------------------------------------------------------------------------

function linkedInHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "LinkedIn-Version": LINKEDIN_API_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// OAuth flow
// ---------------------------------------------------------------------------

/**
 * Builds the LinkedIn OAuth 2.0 authorization URL with PKCE.
 */
export function buildAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
}): string {
  const url = new URL(`${LINKEDIN_AUTH_BASE}/authorization`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", LINKEDIN_SCOPES);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

/**
 * Exchanges an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  codeVerifier: string;
}): Promise<TokenPair> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code_verifier: params.codeVerifier,
  });

  const response = await fetch(`${LINKEDIN_AUTH_BASE}/accessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as Record<string, string>;
    throw new LinkedInApiError(
      errorData.error_description ?? errorData.error ?? "Token exchange failed",
      response.status,
      errorData.error,
    );
  }

  const data = (await response.json()) as LinkedInTokenResponse;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Refreshes an access token using a refresh token.
 */
export async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<TokenPair> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });

  const response = await fetch(`${LINKEDIN_AUTH_BASE}/accessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as Record<string, string>;
    throw new LinkedInApiError(
      errorData.error_description ?? errorData.error ?? "Token refresh failed",
      response.status,
      errorData.error,
    );
  }

  const data = (await response.json()) as LinkedInTokenResponse;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

// ---------------------------------------------------------------------------
// User info
// ---------------------------------------------------------------------------

/**
 * Fetches the LinkedIn user profile using the OpenID Connect userinfo endpoint.
 */
export async function getUserInfo(
  accessToken: string,
): Promise<LinkedInUserInfo> {
  const response = await fetch(`${LINKEDIN_API_BASE}/v2/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new LinkedInApiError(
      text || `Failed to get user info: ${response.status}`,
      response.status,
    );
  }

  return (await response.json()) as LinkedInUserInfo;
}

// ---------------------------------------------------------------------------
// Posts API
// ---------------------------------------------------------------------------

/**
 * Creates a LinkedIn post using the Posts API (not deprecated UGC API).
 *
 * POST https://api.linkedin.com/rest/posts
 */
export async function createPost(params: {
  accessToken: string;
  personUrn: string;
  content: string;
  imageUrn?: string;
}): Promise<PostResult> {
  const postBody: LinkedInPostBody = {
    author: params.personUrn,
    commentary: params.content,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
  };

  if (params.imageUrn) {
    postBody.content = {
      media: {
        id: params.imageUrn,
      },
    };
  }

  try {
    const response = await fetch(`${LINKEDIN_API_BASE}/rest/posts`, {
      method: "POST",
      headers: linkedInHeaders(params.accessToken),
      body: JSON.stringify(postBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new LinkedInApiError(
        errorText || `Post creation failed: ${response.status}`,
        response.status,
      );
    }

    // LinkedIn returns the post ID in x-restli-id header
    const postId = response.headers.get("x-restli-id") ?? undefined;

    return {
      success: true,
      platformPostId: postId,
    };
  } catch (error) {
    if (error instanceof LinkedInApiError) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ---------------------------------------------------------------------------
// Image upload (2-step process)
// ---------------------------------------------------------------------------

/**
 * Uploads an image to LinkedIn for use in a post.
 *
 * Two-step process:
 * 1. Initialize upload → get uploadUrl + image URN
 * 2. PUT binary data to uploadUrl
 *
 * Returns the image URN for use in createPost.
 */
export async function uploadImage(params: {
  accessToken: string;
  personUrn: string;
  imageBuffer: ArrayBuffer;
}): Promise<string> {
  // Step 1: Initialize upload
  const initBody = {
    initializeUploadRequest: {
      owner: params.personUrn,
    },
  };

  const initResponse = await fetch(
    `${LINKEDIN_API_BASE}/rest/images?action=initializeUpload`,
    {
      method: "POST",
      headers: linkedInHeaders(params.accessToken),
      body: JSON.stringify(initBody),
    },
  );

  if (!initResponse.ok) {
    const errorText = await initResponse.text();
    throw new LinkedInApiError(
      errorText || `Image upload init failed: ${initResponse.status}`,
      initResponse.status,
    );
  }

  const initData = (await initResponse.json()) as LinkedInImageUploadResponse;
  const { uploadUrl, image: imageUrn } = initData.value;

  // Step 2: Upload binary data
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: params.imageBuffer,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new LinkedInApiError(
      errorText || `Image binary upload failed: ${uploadResponse.status}`,
      uploadResponse.status,
    );
  }

  return imageUrn;
}
