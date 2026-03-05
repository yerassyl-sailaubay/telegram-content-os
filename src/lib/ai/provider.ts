/**
 * AI content provider interface.
 *
 * Defines the contract for adapting Telegram content to other platforms.
 * Implementations must support the 2-step pipeline: translate → adapt.
 */

import type {
  AdaptationRequest,
  AdaptationOptions,
  AdaptedContent,
  ChannelProfileRequest,
  ChannelProfileResult,
} from "./types";

/** Contract for an AI content adaptation provider. */
export interface AIProvider {
  /**
   * Adapts content through the 2-step pipeline:
   * 1. Literal translation (RU → EN)
   * 2. Platform-specific adaptation
   *
   * @param request - Content and platform target
   * @param options - Model tier, timeout, retry config
   * @returns Adapted content with token usage
   */
  adaptContent(
    request: AdaptationRequest,
    options?: AdaptationOptions,
  ): Promise<AdaptedContent>;

  /**
   * Analyzes a channel's posts to extract profile information
   * (niche, tone, topics, language).
   *
   * @param request - Sample posts and channel name
   * @param options - Model tier, timeout, retry config
   * @returns Channel profile analysis with token usage
   */
  analyzeChannelProfile(
    request: ChannelProfileRequest,
    options?: AdaptationOptions,
  ): Promise<ChannelProfileResult>;
}
