/**
 * Shared types for platform integrations (LinkedIn, Twitter, etc.).
 */

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface EncryptedTokenPair {
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  expiresAt: Date;
}

// ---------------------------------------------------------------------------
// Platform connection
// ---------------------------------------------------------------------------

export interface PlatformConnection {
  id: string;
  userId: string;
  platform: "linkedin" | "twitter";
  platformUserId: string | null;
  platformUsername: string | null;
  accessTokenEncrypted: string | null;
  refreshTokenEncrypted: string | null;
  tokenExpiresAt: Date | null;
  connectedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// ---------------------------------------------------------------------------
// Post results
// ---------------------------------------------------------------------------

export interface PostResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// LinkedIn-specific types
// ---------------------------------------------------------------------------

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
  scope: string;
}

export interface LinkedInUserInfo {
  sub: string;
  name: string;
  email?: string;
}

export interface LinkedInImageUploadResponse {
  value: {
    uploadUrlExpiresAt: number;
    uploadUrl: string;
    image: string;
  };
}

export interface LinkedInPostBody {
  author: string;
  commentary: string;
  visibility: "PUBLIC" | "CONNECTIONS";
  distribution: {
    feedDistribution: "MAIN_FEED";
    targetEntities: never[];
    thirdPartyDistributionChannels: never[];
  };
  lifecycleState: "PUBLISHED";
  content?: {
    media: {
      altText?: string;
      id: string;
    };
  };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class LinkedInApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "LinkedInApiError";
  }
}

// ---------------------------------------------------------------------------
// Twitter-specific types
// ---------------------------------------------------------------------------

export interface TwitterTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface TwitterUserInfo {
  id: string;
  name: string;
  username: string;
}

export interface TwitterTweetResponse {
  data: {
    id: string;
    text: string;
  };
}

export interface TwitterMediaUploadResponse {
  media_id_string: string;
  size: number;
  expires_after_secs: number;
  image?: {
    image_type: string;
    w: number;
    h: number;
  };
}

export class TwitterApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "TwitterApiError";
  }
}
