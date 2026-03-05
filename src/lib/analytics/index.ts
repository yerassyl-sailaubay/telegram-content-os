/**
 * Analytics module — cross-post performance tracking.
 *
 * Provides data collection services for LinkedIn engagement metrics,
 * Twitter post metadata, and Telegram reaction counts.
 */

export type {
  PostAnalytics,
  ChannelMetrics,
  PlatformEngagement,
  SyncWindow,
  RateLimiter,
  CollectionResult,
  LinkedInShareStatistic,
  LinkedInSharesResponse,
  TelegramMessageReactions,
} from "./types";

export { RATE_LIMITS, AnalyticsCollectionError } from "./types";

export {
  createRateLimiter,
  tryAcquire,
  getWaitTime,
  hasSyncedWindow,
  recordSyncWindow,
  fetchLinkedInPostAnalytics,
  collectTwitterMetadata,
  fetchTelegramReactions,
  computeTotalEngagement,
  aggregateChannelMetrics,
} from "./collector";
