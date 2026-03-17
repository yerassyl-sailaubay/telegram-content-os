/**
 * Channel Profiler — AI-powered channel analysis.
 *
 * Analyzes a channel's recent posts to extract its niche, tone,
 * top topics, and primary language. Uses the AIProvider interface
 * so the actual AI implementation is interchangeable.
 */

import type { AIProvider } from "./provider";
import type { ChannelProfileResult, ChannelProfile, ModelTier } from "./types";

/** Default maximum number of posts to analyze. */
const DEFAULT_MAX_POSTS = 50;
const DEFAULT_MAX_NEW_POSTS = 20;
const MAX_CHARS_PER_POST = 1200;

/** Minimum number of posts required for meaningful analysis. */
const MIN_POSTS_FOR_ANALYSIS = 1;

export class ChannelProfiler {
  constructor(private aiProvider: AIProvider) {}

  /**
   * Generates a profile from channel posts.
   *
   * Takes up to `maxPosts` most recent posts (default 50),
   * sends them to the AI provider for analysis, and validates
   * the returned profile.
   *
   * @param channelName - Display name of the channel
   * @param posts - Array of plain-text post contents (most recent first)
   * @param options - Optional model tier and post limit
   * @returns Validated channel profile result
   * @throws Error if posts array is empty or AI returns invalid data
   */
  async generateProfile(
    channelName: string,
    posts: string[],
    options?: { modelTier?: ModelTier; maxPosts?: number },
  ): Promise<ChannelProfileResult> {
    const maxPosts = options?.maxPosts ?? DEFAULT_MAX_POSTS;
    const validPosts = this.preparePosts(posts, maxPosts);

    if (validPosts.length < MIN_POSTS_FOR_ANALYSIS) {
      throw new Error(
        `Not enough posts to generate a profile. Need at least ${MIN_POSTS_FOR_ANALYSIS}, got ${validPosts.length}.`,
      );
    }

    const result = await this.aiProvider.analyzeChannelProfile(
      { posts: validPosts, channelName },
      { modelTier: options?.modelTier },
    );

    // Validate the result
    this.validateResult(result);

    return result;
  }

  async updateProfile(
    channelName: string,
    existingProfile: ChannelProfile,
    newPosts: string[],
    options?: { modelTier?: ModelTier; maxPosts?: number },
  ): Promise<ChannelProfileResult> {
    const maxPosts = options?.maxPosts ?? DEFAULT_MAX_NEW_POSTS;
    const validPosts = this.preparePosts(newPosts, maxPosts);

    if (validPosts.length < MIN_POSTS_FOR_ANALYSIS) {
      throw new Error(
        `Not enough new posts to update profile. Need at least ${MIN_POSTS_FOR_ANALYSIS}, got ${validPosts.length}.`,
      );
    }

    const result = await this.aiProvider.analyzeChannelProfile(
      {
        posts: validPosts,
        channelName,
        existingProfile,
      },
      { modelTier: options?.modelTier },
    );

    this.validateResult(result);
    return result;
  }

  private preparePosts(posts: string[], maxPosts: number): string[] {
    return posts
      .map((post) => post.replace(/\s+/g, " ").trim())
      .filter((post) => post.length > 0)
      .slice(0, maxPosts)
      .map((post) => {
        if (post.length <= MAX_CHARS_PER_POST) {
          return post;
        }

        return `${post.slice(0, MAX_CHARS_PER_POST).trimEnd()}...`;
      });
  }

  /**
   * Validates that the AI-generated profile has the required fields
   * with meaningful values.
   */
  private validateResult(result: ChannelProfileResult): void {
    if (!result.niche || result.niche.trim().length === 0) {
      throw new Error("AI returned an empty niche. The response may be malformed.");
    }

    if (!result.tone || result.tone.trim().length === 0) {
      throw new Error("AI returned an empty tone. The response may be malformed.");
    }

    if (!Array.isArray(result.topTopics)) {
      throw new Error("AI returned invalid topTopics (expected an array of strings).");
    }

    // Ensure topTopics are strings and cap at 10
    result.topTopics = result.topTopics
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .slice(0, 10);
  }
}
