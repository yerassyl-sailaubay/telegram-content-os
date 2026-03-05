/**
 * Broadcast orchestrator.
 *
 * Takes a BroadcastRequest and:
 * 1. Generates a unique broadcast ID
 * 2. Creates cross_post records for each platform
 * 3. Sends a single Inngest event that runs parallel adaptation + posting
 *
 * The broadcast_id is stored in the cross_post's `engagementData` jsonb
 * field (as { broadcastId: "..." }) to group related cross-posts without
 * requiring a schema migration.
 */

import type { BroadcastRequest, BroadcastResult, PlatformTarget } from "./types";

// ---------------------------------------------------------------------------
// Broadcast ID generation
// ---------------------------------------------------------------------------

/** Generate a unique broadcast ID (prefixed for easy identification). */
export function generateBroadcastId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `bcast_${timestamp}_${random}`;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface BroadcastValidationError {
  field: string;
  message: string;
}

/** Validate a broadcast request before processing. */
export function validateBroadcastRequest(request: BroadcastRequest): BroadcastValidationError[] {
  const errors: BroadcastValidationError[] = [];

  if (!request.postId) {
    errors.push({ field: "postId", message: "Post ID is required" });
  }

  if (!request.userId) {
    errors.push({ field: "userId", message: "User ID is required" });
  }

  if (!request.platforms || request.platforms.length === 0) {
    errors.push({
      field: "platforms",
      message: "At least one platform must be selected",
    });
  }

  const validPlatforms = new Set(["linkedin", "twitter"]);
  for (const platform of request.platforms ?? []) {
    if (!validPlatforms.has(platform)) {
      errors.push({
        field: "platforms",
        message: `Invalid platform: ${platform}`,
      });
    }
  }

  // Deduplicate check
  const unique = new Set(request.platforms);
  if (unique.size !== request.platforms?.length) {
    errors.push({
      field: "platforms",
      message: "Duplicate platforms are not allowed",
    });
  }

  if (request.scheduledAt && request.scheduledAt <= new Date()) {
    errors.push({
      field: "scheduledAt",
      message: "Scheduled time must be in the future",
    });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/** Dependencies injected into the orchestrator for testability. */
export interface BroadcastDeps {
  /** Insert a cross_post record, return its ID. */
  createCrossPost: (params: {
    userId: string;
    sourcePostId: string;
    platform: "linkedin" | "twitter";
    broadcastId: string;
  }) => Promise<string>;

  /** Send the broadcast Inngest event. */
  sendBroadcastEvent: (params: {
    broadcastId: string;
    postId: string;
    userId: string;
    platforms: ("linkedin" | "twitter")[];
    channelId?: string;
    crossPostIds: Record<string, string>;
  }) => Promise<void>;
}

/**
 * Create a broadcast: validate, create cross_posts, and trigger Inngest.
 *
 * Returns a BroadcastResult with initial "pending" statuses.
 */
export async function createBroadcast(
  request: BroadcastRequest,
  deps: BroadcastDeps,
): Promise<BroadcastResult> {
  const errors = validateBroadcastRequest(request);
  if (errors.length > 0) {
    throw new Error(`Invalid broadcast request: ${errors.map((e) => e.message).join(", ")}`);
  }

  const broadcastId = generateBroadcastId();

  // Create cross_post records in parallel for each platform
  const crossPostIds: Record<string, string> = {};
  const targets: PlatformTarget[] = [];

  await Promise.all(
    request.platforms.map(async (platform) => {
      const crossPostId = await deps.createCrossPost({
        userId: request.userId,
        sourcePostId: request.postId,
        platform,
        broadcastId,
      });

      crossPostIds[platform] = crossPostId;
      targets.push({
        platform,
        crossPostId,
        status: "pending",
      });
    }),
  );

  // Send Inngest event to trigger parallel adaptation + posting
  await deps.sendBroadcastEvent({
    broadcastId,
    postId: request.postId,
    userId: request.userId,
    platforms: request.platforms,
    channelId: request.channelId,
    crossPostIds,
  });

  return {
    broadcastId,
    targets,
    status: "pending",
  };
}

// ---------------------------------------------------------------------------
// Default deps factory (uses real DB and Inngest)
// ---------------------------------------------------------------------------

/** Create real dependencies for production use. */
export async function createDefaultDeps(): Promise<BroadcastDeps> {
  const { db } = await import("@/server/db");
  const { crossPosts } = await import("@/server/db/schema");
  const { inngest } = await import("@/lib/inngest/client");

  return {
    createCrossPost: async (params) => {
      const [row] = await db
        .insert(crossPosts)
        .values({
          userId: params.userId,
          sourcePostId: params.sourcePostId,
          platform: params.platform,
          status: "draft",
          engagementData: { broadcastId: params.broadcastId },
        })
        .returning({ id: crossPosts.id });

      if (!row) {
        throw new Error("Failed to create cross-post record");
      }

      return row.id;
    },

    sendBroadcastEvent: async (params) => {
      await inngest.send({
        name: "broadcast/execute",
        data: params,
      });
    },
  };
}
