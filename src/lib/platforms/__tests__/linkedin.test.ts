import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  LinkedInTokenResponse,
  LinkedInUserInfo,
  LinkedInImageUploadResponse,
} from "../types";
import { LinkedInApiError } from "../types";

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  vi.stubEnv("ENCRYPTION_KEY", "a]3Fj!9Kz@mP7qR#wY2sN&vB5xT8dL0c");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// Helper to create mock Response
// ---------------------------------------------------------------------------

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(),
  } as unknown as Response;
}

function mockBinaryResponse(status = 201): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    headers: new Headers(),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// PKCE helper tests
// ---------------------------------------------------------------------------

describe("PKCE helpers", () => {
  it("generateCodeVerifier returns a string of valid length", async () => {
    const { generateCodeVerifier } = await import("../linkedin");
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    // Should only contain URL-safe characters
    expect(verifier).toMatch(/^[A-Za-z0-9_~.-]+$/);
  });

  it("generateCodeChallenge creates S256 hash of verifier", async () => {
    const { generateCodeVerifier, generateCodeChallenge } = await import(
      "../linkedin"
    );
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);

    // Base64url encoded SHA-256 hash should be 43 chars
    expect(challenge.length).toBe(43);
    // Should be base64url (no +, /, or =)
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("same verifier always produces same challenge", async () => {
    const { generateCodeChallenge } = await import("../linkedin");
    const verifier = "test-verifier-123456789012345678901234567890";
    const challenge1 = await generateCodeChallenge(verifier);
    const challenge2 = await generateCodeChallenge(verifier);
    expect(challenge1).toBe(challenge2);
  });
});

// ---------------------------------------------------------------------------
// Encryption tests
// ---------------------------------------------------------------------------

describe("Token encryption", () => {
  it("encrypts and decrypts a token round-trip", async () => {
    const { encrypt, decrypt } = await import("../encryption");
    const originalToken = "my-secret-access-token-12345";
    const encrypted = encrypt(originalToken);

    // Encrypted should be different from original
    expect(encrypted).not.toBe(originalToken);
    // Shared encrypt outputs base64 (iv + authTag + ciphertext packed)
    expect(typeof encrypted).toBe("string");
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(originalToken);
  });

  it("different encryptions of same token produce different ciphertexts", async () => {
    const { encrypt } = await import("../encryption");
    const token = "same-token";
    const enc1 = encrypt(token);
    const enc2 = encrypt(token);
    // Due to random IV, these should differ
    expect(enc1).not.toBe(enc2);
  });

  it("decrypt throws on tampered ciphertext", async () => {
    const { encrypt, decrypt } = await import("../encryption");
    const encrypted = encrypt("test-token");
    const tampered = encrypted.slice(0, -5) + "XXXXX";
    expect(() => decrypt(tampered)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildAuthorizationUrl tests
// ---------------------------------------------------------------------------

describe("buildAuthorizationUrl", () => {
  it("constructs correct LinkedIn OAuth URL with PKCE params", async () => {
    const { buildAuthorizationUrl } = await import("../linkedin");
    const codeChallenge = "test-challenge-abc123";
    const state = "random-state-xyz";
    const redirectUri = "https://example.com/api/auth/linkedin/callback";
    const clientId = "test-client-id";

    const url = buildAuthorizationUrl({
      clientId,
      redirectUri,
      codeChallenge,
      state,
    });

    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://www.linkedin.com");
    expect(parsed.pathname).toBe("/oauth/v2/authorization");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe(clientId);
    expect(parsed.searchParams.get("redirect_uri")).toBe(redirectUri);
    expect(parsed.searchParams.get("state")).toBe(state);
    expect(parsed.searchParams.get("code_challenge")).toBe(codeChallenge);
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("scope")).toContain("openid");
    expect(parsed.searchParams.get("scope")).toContain("w_member_social");
  });
});

// ---------------------------------------------------------------------------
// exchangeCodeForTokens tests
// ---------------------------------------------------------------------------

describe("exchangeCodeForTokens", () => {
  it("exchanges authorization code for tokens", async () => {
    const { exchangeCodeForTokens } = await import("../linkedin");

    const tokenResponse: LinkedInTokenResponse = {
      access_token: "AQV...",
      expires_in: 5184000,
      refresh_token: "AQT...",
      refresh_token_expires_in: 31536000,
      scope: "openid profile w_member_social",
    };

    mockFetch.mockResolvedValueOnce(mockResponse(tokenResponse));

    const result = await exchangeCodeForTokens({
      code: "auth-code-123",
      redirectUri: "https://example.com/api/auth/linkedin/callback",
      clientId: "client-id",
      clientSecret: "client-secret",
      codeVerifier: "code-verifier-abc",
    });

    expect(result.accessToken).toBe("AQV...");
    expect(result.refreshToken).toBe("AQT...");
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Verify correct fetch call
    expect(mockFetch).toHaveBeenCalledWith(
      "https://www.linkedin.com/oauth/v2/accessToken",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/x-www-form-urlencoded",
        }),
      }),
    );

    // Verify body contains correct params
    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = callArgs[1].body as string;
    expect(body).toContain("grant_type=authorization_code");
    expect(body).toContain("code=auth-code-123");
    expect(body).toContain("code_verifier=code-verifier-abc");
  });

  it("throws LinkedInApiError on token exchange failure", async () => {
    const { exchangeCodeForTokens } = await import("../linkedin");

    mockFetch.mockResolvedValueOnce(
      mockResponse(
        { error: "invalid_grant", error_description: "Bad code" },
        400,
      ),
    );

    await expect(
      exchangeCodeForTokens({
        code: "bad-code",
        redirectUri: "https://example.com/callback",
        clientId: "id",
        clientSecret: "secret",
        codeVerifier: "verifier",
      }),
    ).rejects.toThrow(LinkedInApiError);
  });
});

// ---------------------------------------------------------------------------
// refreshAccessToken tests
// ---------------------------------------------------------------------------

describe("refreshAccessToken", () => {
  it("refreshes token using refresh_token grant", async () => {
    const { refreshAccessToken } = await import("../linkedin");

    const tokenResponse: LinkedInTokenResponse = {
      access_token: "new-access-token",
      expires_in: 5184000,
      refresh_token: "new-refresh-token",
      refresh_token_expires_in: 31536000,
      scope: "openid profile w_member_social",
    };

    mockFetch.mockResolvedValueOnce(mockResponse(tokenResponse));

    const result = await refreshAccessToken({
      refreshToken: "old-refresh-token",
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    expect(result.accessToken).toBe("new-access-token");
    expect(result.refreshToken).toBe("new-refresh-token");

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = callArgs[1].body as string;
    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain("refresh_token=old-refresh-token");
  });

  it("throws on refresh failure", async () => {
    const { refreshAccessToken } = await import("../linkedin");

    mockFetch.mockResolvedValueOnce(
      mockResponse({ error: "invalid_grant" }, 400),
    );

    await expect(
      refreshAccessToken({
        refreshToken: "expired-token",
        clientId: "id",
        clientSecret: "secret",
      }),
    ).rejects.toThrow(LinkedInApiError);
  });
});

// ---------------------------------------------------------------------------
// getUserInfo tests
// ---------------------------------------------------------------------------

describe("getUserInfo", () => {
  it("fetches LinkedIn user profile", async () => {
    const { getUserInfo } = await import("../linkedin");

    const userInfo: LinkedInUserInfo = {
      sub: "abc123",
      name: "Test User",
      email: "test@example.com",
    };

    mockFetch.mockResolvedValueOnce(mockResponse(userInfo));

    const result = await getUserInfo("access-token");

    expect(result.sub).toBe("abc123");
    expect(result.name).toBe("Test User");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.linkedin.com/v2/userinfo",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
        }),
      }),
    );
  });

  it("throws on 401", async () => {
    const { getUserInfo } = await import("../linkedin");

    mockFetch.mockResolvedValueOnce(
      mockResponse({ message: "Unauthorized" }, 401),
    );

    await expect(getUserInfo("bad-token")).rejects.toThrow(LinkedInApiError);
  });
});

// ---------------------------------------------------------------------------
// createPost tests
// ---------------------------------------------------------------------------

describe("createPost", () => {
  it("creates a text-only LinkedIn post", async () => {
    const { createPost } = await import("../linkedin");

    // LinkedIn Posts API returns 201 with x-restli-id header
    const postResponse = {
      ok: true,
      status: 201,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
      headers: new Headers({
        "x-restli-id": "urn:li:share:1234567890",
      }),
    } as unknown as Response;

    mockFetch.mockResolvedValueOnce(postResponse);

    const result = await createPost({
      accessToken: "access-token",
      personUrn: "urn:li:person:abc123",
      content: "Hello LinkedIn!",
    });

    expect(result.success).toBe(true);
    expect(result.platformPostId).toBe("urn:li:share:1234567890");

    // Verify request body
    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(callArgs[1].body as string);
    expect(body.author).toBe("urn:li:person:abc123");
    expect(body.commentary).toBe("Hello LinkedIn!");
    expect(body.visibility).toBe("PUBLIC");
    expect(body.lifecycleState).toBe("PUBLISHED");

    // Verify headers include LinkedIn-specific ones
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers["LinkedIn-Version"]).toBe("202401");
    expect(headers["X-Restli-Protocol-Version"]).toBe("2.0.0");
  });

  it("creates a post with image", async () => {
    const { createPost } = await import("../linkedin");

    const postResponse = {
      ok: true,
      status: 201,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
      headers: new Headers({
        "x-restli-id": "urn:li:share:9876",
      }),
    } as unknown as Response;

    mockFetch.mockResolvedValueOnce(postResponse);

    const result = await createPost({
      accessToken: "access-token",
      personUrn: "urn:li:person:abc123",
      content: "Post with image",
      imageUrn: "urn:li:image:12345",
    });

    expect(result.success).toBe(true);

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(callArgs[1].body as string);
    expect(body.content).toBeDefined();
    expect(body.content.media.id).toBe("urn:li:image:12345");
  });

  it("returns failure result on API error", async () => {
    const { createPost } = await import("../linkedin");

    mockFetch.mockResolvedValueOnce(
      mockResponse({ message: "Forbidden", status: 403 }, 403),
    );

    const result = await createPost({
      accessToken: "bad-token",
      personUrn: "urn:li:person:abc123",
      content: "test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// uploadImage tests
// ---------------------------------------------------------------------------

describe("uploadImage", () => {
  it("completes 2-step image upload (init + upload)", async () => {
    const { uploadImage } = await import("../linkedin");

    // Step 1: Initialize upload
    const initResponse: LinkedInImageUploadResponse = {
      value: {
        uploadUrlExpiresAt: Date.now() + 60000,
        uploadUrl: "https://api.linkedin.com/mediaUpload/xxx",
        image: "urn:li:image:98765",
      },
    };

    mockFetch
      .mockResolvedValueOnce(mockResponse(initResponse)) // init
      .mockResolvedValueOnce(mockBinaryResponse(201)); // binary upload

    const imageBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer;

    const result = await uploadImage({
      accessToken: "access-token",
      personUrn: "urn:li:person:abc123",
      imageBuffer,
    });

    expect(result).toBe("urn:li:image:98765");

    // Verify init request
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const initCallArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(initCallArgs[0]).toBe(
      "https://api.linkedin.com/rest/images?action=initializeUpload",
    );
    const initBody = JSON.parse(initCallArgs[1].body as string);
    expect(initBody.initializeUploadRequest.owner).toBe(
      "urn:li:person:abc123",
    );

    // Verify binary upload
    const uploadCallArgs = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(uploadCallArgs[0]).toBe(
      "https://api.linkedin.com/mediaUpload/xxx",
    );
    expect(uploadCallArgs[1].method).toBe("PUT");
  });

  it("throws on init failure", async () => {
    const { uploadImage } = await import("../linkedin");

    mockFetch.mockResolvedValueOnce(
      mockResponse({ message: "Unauthorized" }, 401),
    );

    await expect(
      uploadImage({
        accessToken: "bad-token",
        personUrn: "urn:li:person:abc",
        imageBuffer: new ArrayBuffer(10),
      }),
    ).rejects.toThrow(LinkedInApiError);
  });

  it("throws on upload failure", async () => {
    const { uploadImage } = await import("../linkedin");

    const initResponse: LinkedInImageUploadResponse = {
      value: {
        uploadUrlExpiresAt: Date.now() + 60000,
        uploadUrl: "https://api.linkedin.com/mediaUpload/xxx",
        image: "urn:li:image:98765",
      },
    };

    mockFetch
      .mockResolvedValueOnce(mockResponse(initResponse))
      .mockResolvedValueOnce(mockResponse({ message: "Failed" }, 500));

    await expect(
      uploadImage({
        accessToken: "token",
        personUrn: "urn:li:person:abc",
        imageBuffer: new ArrayBuffer(10),
      }),
    ).rejects.toThrow(LinkedInApiError);
  });
});

// ---------------------------------------------------------------------------
// withLinkedInRetry tests (retry with 401 → refresh → retry)
// ---------------------------------------------------------------------------

describe("withLinkedInRetry", () => {
  it("retries on 429 with exponential backoff", async () => {
    const { withLinkedInRetry } = await import("../linkedin");

    vi.useFakeTimers();

    const fn = vi
      .fn()
      .mockRejectedValueOnce(new LinkedInApiError("Rate limited", 429))
      .mockResolvedValueOnce("ok");

    const promise = withLinkedInRetry(fn, { maxRetries: 3, baseDelayMs: 10 });

    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("retries on 500 server errors", async () => {
    const { withLinkedInRetry } = await import("../linkedin");

    vi.useFakeTimers();

    const fn = vi
      .fn()
      .mockRejectedValueOnce(new LinkedInApiError("Server error", 500))
      .mockResolvedValueOnce("ok");

    const promise = withLinkedInRetry(fn, { maxRetries: 3, baseDelayMs: 10 });

    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("does not retry non-retryable errors (400)", async () => {
    const { withLinkedInRetry } = await import("../linkedin");

    const fn = vi
      .fn()
      .mockRejectedValueOnce(new LinkedInApiError("Bad Request", 400));

    await expect(
      withLinkedInRetry(fn, { maxRetries: 3, baseDelayMs: 10 }),
    ).rejects.toThrow("Bad Request");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting retries", async () => {
    const { withLinkedInRetry } = await import("../linkedin");

    const fn = vi
      .fn()
      .mockRejectedValue(new LinkedInApiError("Rate limited", 429));

    await expect(
      withLinkedInRetry(fn, { maxRetries: 2, baseDelayMs: 1 }),
    ).rejects.toThrow("Rate limited");

    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});

// ---------------------------------------------------------------------------
// LinkedIn API header tests
// ---------------------------------------------------------------------------

describe("LinkedIn API headers", () => {
  it("includes required headers on Posts API call", async () => {
    const { createPost } = await import("../linkedin");

    const postResponse = {
      ok: true,
      status: 201,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
      headers: new Headers({ "x-restli-id": "urn:li:share:123" }),
    } as unknown as Response;

    mockFetch.mockResolvedValueOnce(postResponse);

    await createPost({
      accessToken: "token",
      personUrn: "urn:li:person:abc",
      content: "test",
    });

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1].headers as Record<string, string>;

    expect(headers["Authorization"]).toBe("Bearer token");
    expect(headers["LinkedIn-Version"]).toBe("202401");
    expect(headers["X-Restli-Protocol-Version"]).toBe("2.0.0");
    expect(headers["Content-Type"]).toBe("application/json");
  });
});
