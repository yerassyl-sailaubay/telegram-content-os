/**
 * Multi-platform broadcast types.
 *
 * A "broadcast" is a single action that creates cross-posts for
 * multiple platforms simultaneously. Each platform target runs
 * independently — partial failures are tracked per-platform.
 */

// ---------------------------------------------------------------------------
// Platform target
// ---------------------------------------------------------------------------

/** A single platform target within a broadcast. */
export interface PlatformTarget {
  /** Target platform. */
  platform: "linkedin" | "twitter";
  /** Per-platform adapted content (set after AI adaptation). */
  adaptedContent?: string;
  /** Per-platform tweets for Twitter threads. */
  tweets?: string[];
  /** The cross_post ID created for this target. */
  crossPostId?: string;
  /** Current status of this target within the broadcast. */
  status: "pending" | "adapting" | "adapted" | "posting" | "posted" | "failed";
  /** Error message if this target failed. */
  error?: string;
  /** Platform post ID after successful posting. */
  platformPostId?: string;
}

// ---------------------------------------------------------------------------
// Broadcast request / result
// ---------------------------------------------------------------------------

/** Input to create a new broadcast. */
export interface BroadcastRequest {
  /** Source Telegram post ID. */
  postId: string;
  /** User ID requesting the broadcast. */
  userId: string;
  /** Platforms to broadcast to. Must have at least one. */
  platforms: ("linkedin" | "twitter")[];
  /** Optional channel ID for tone-matching. */
  channelId?: string;
  /** Optional scheduled time (same for all platforms in V1). */
  scheduledAt?: Date;
  /** Timezone for scheduling. */
  timezone?: string;
}

/** Result of a broadcast operation. */
export interface BroadcastResult {
  /** Unique broadcast ID grouping all cross-posts. */
  broadcastId: string;
  /** Per-platform targets with their statuses. */
  targets: PlatformTarget[];
  /** Overall broadcast status derived from individual targets. */
  status: "pending" | "partial" | "completed" | "failed";
}

/** Event data sent to the broadcast Inngest function. */
export interface BroadcastEventData {
  /** Unique broadcast ID. */
  broadcastId: string;
  /** Source Telegram post ID. */
  postId: string;
  /** User ID. */
  userId: string;
  /** Platforms to adapt and post to. */
  platforms: ("linkedin" | "twitter")[];
  /** Optional channel ID for tone-matching. */
  channelId?: string;
  /** Cross-post IDs keyed by platform. */
  crossPostIds: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive overall broadcast status from individual target statuses. */
export function deriveBroadcastStatus(targets: PlatformTarget[]): BroadcastResult["status"] {
  if (targets.length === 0) return "pending";

  const allPosted = targets.every((t) => t.status === "posted");
  if (allPosted) return "completed";

  const allFailed = targets.every((t) => t.status === "failed");
  if (allFailed) return "failed";

  const anyPosted = targets.some((t) => t.status === "posted");
  const anyFailed = targets.some((t) => t.status === "failed");
  if (anyPosted && anyFailed) return "partial";
  if (anyPosted || anyFailed) return "partial";

  return "pending";
}
