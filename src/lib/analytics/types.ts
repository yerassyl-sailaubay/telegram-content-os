/**
 * Analytics types for cross-post performance tracking.
 *
 * Covers engagement data collection from LinkedIn, Twitter, and Telegram.
 */

// ---------------------------------------------------------------------------
// Platform engagement data
// ---------------------------------------------------------------------------

/** Engagement metrics from a single platform for a single post. */
export interface PlatformEngagement {
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
}

/** Full analytics record for a cross-post. */
export interface PostAnalytics {
  crossPostId: string;
  platform: "linkedin" | "twitter";
  engagement: PlatformEngagement;
  characterCount: number | null;
  hasMedia: boolean | null;
  fetchedAt: Date;
}

/** Aggregated channel metrics for a given date. */
export interface ChannelMetrics {
  channelId: string;
  platform: "linkedin" | "twitter";
  date: string;
  totalPosts: number;
  totalEngagement: number;
  followerCountSnapshot: number | null;
}

// ---------------------------------------------------------------------------
// Sync tracking
// ---------------------------------------------------------------------------

/** Tracks the last sync window per user/platform to avoid re-fetching. */
export interface SyncWindow {
  userId: string;
  platform: "linkedin" | "twitter";
  syncWindowStart: Date;
  syncWindowEnd: Date;
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

/** Simple in-memory rate limiter state. */
export interface RateLimiter {
  /** Maximum requests allowed in the window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
  /** Timestamps of recent requests. */
  timestamps: number[];
}

/** Platform-specific rate limit configuration. */
export const RATE_LIMITS = {
  /** LinkedIn: 100 API requests per day. */
  linkedin: { maxRequests: 100, windowMs: 24 * 60 * 60 * 1000 },
  /** Telegram Bot API: 30 messages per second. */
  telegram: { maxRequests: 30, windowMs: 1000 },
} as const;

// ---------------------------------------------------------------------------
// LinkedIn API response types (analytics-specific)
// ---------------------------------------------------------------------------

/** LinkedIn organization page statistics element. */
export interface LinkedInShareStatistic {
  totalShareStatistics: {
    impressionCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    clickCount: number;
    engagement: number;
  };
  share?: string;
}

/** LinkedIn shares API response. */
export interface LinkedInSharesResponse {
  elements: LinkedInShareStatistic[];
  paging?: {
    count: number;
    start: number;
    total: number;
  };
}

// ---------------------------------------------------------------------------
// Telegram API response types (analytics-specific)
// ---------------------------------------------------------------------------

/** Telegram message with reaction data from Bot API. */
export interface TelegramMessageReactions {
  message_id: number;
  chat: {
    id: number;
    type: string;
  };
  reactions?: Array<{
    type: { emoji: string } | { custom_emoji_id: string };
    total_count: number;
  }>;
  views?: number;
  forwards?: number;
}

// ---------------------------------------------------------------------------
// Collector results
// ---------------------------------------------------------------------------

/** Result from a single analytics collection run. */
export interface CollectionResult {
  platform: "linkedin" | "twitter" | "telegram";
  postsProcessed: number;
  errors: string[];
  syncWindow: {
    start: Date;
    end: Date;
  };
}

/** Error that occurred during analytics collection. */
export class AnalyticsCollectionError extends Error {
  constructor(
    message: string,
    public readonly platform: "linkedin" | "twitter" | "telegram",
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "AnalyticsCollectionError";
  }
}
