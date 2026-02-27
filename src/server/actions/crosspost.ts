"use server";

import { db } from "@/server/db";
import {
  crossPosts,
  telegramPosts,
  telegramChannels,
  usageTracking,
  platformConnections,
} from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createSchedule } from "@/lib/scheduling/engine";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CrossPost = typeof crossPosts.$inferSelect;
export type TelegramPost = typeof telegramPosts.$inferSelect;

export type TelegramPostWithChannel = TelegramPost & {
  channelTitle: string | null;
  channelUsername: string | null;
};

export type CrossPostUsage = {
  used: number;
  limit: number;
  month: string;
};

export type Platform = "linkedin" | "twitter";

export type AdaptContentInput = {
  postId: string;
  platform: Platform;
  channelId?: string;
};

export type CreateCrossPostInput = {
  sourcePostId: string;
  platform: Platform;
  adaptedContent: string;
  translatedContent?: string;
  aiModelUsed?: string;
};

export type PostNowInput = {
  crossPostId: string;
};

export type ScheduleCrossPostInput = {
  crossPostId: string;
  scheduledAt: Date;
  timezone: string;
};

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user.id;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Server Actions ──────────────────────────────────────────────────────────

/**
 * List Telegram posts available for cross-posting.
 * Supports search and filtering.
 */
export async function listTelegramPostsForCrosspost(input?: {
  search?: string;
  page?: number;
  perPage?: number;
}): Promise<
  ActionResult<{
    posts: TelegramPostWithChannel[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  }>
> {
  try {
    const userId = await getCurrentUserId();
    const page = input?.page ?? 1;
    const perPage = input?.perPage ?? 20;
    const offset = (page - 1) * perPage;

    // Get user's channels first
    const channels = await db
      .select()
      .from(telegramChannels)
      .where(eq(telegramChannels.userId, userId));

    if (channels.length === 0) {
      return {
        success: true,
        data: { posts: [], total: 0, page, perPage, totalPages: 0 },
      };
    }

    const channelIds = channels.map((c) => c.id);

    // Build where clause
    const whereConditions = [
      sql`${telegramPosts.channelId} = ANY(ARRAY[${sql.join(channelIds.map((id) => sql`${id}::uuid`), sql`, `)}])`,
    ];

    if (input?.search?.trim()) {
      whereConditions.push(
        ilike(telegramPosts.contentRaw, `%${input.search.trim()}%`),
      );
    }

    const whereClause =
      whereConditions.length === 1
        ? whereConditions[0]
        : and(...whereConditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(telegramPosts)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    const posts = await db
      .select()
      .from(telegramPosts)
      .where(whereClause)
      .orderBy(desc(telegramPosts.postedAt))
      .limit(perPage)
      .offset(offset);

    // Attach channel info
    const channelMap = new Map(channels.map((c) => [c.id, c]));

    const postsWithChannel: TelegramPostWithChannel[] = posts.map((post) => {
      const channel = channelMap.get(post.channelId);
      return {
        ...post,
        channelTitle: channel?.title ?? null,
        channelUsername: channel?.username ?? null,
      };
    });

    return {
      success: true,
      data: {
        posts: postsWithChannel,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list posts";
    return { success: false, error: message };
  }
}

/**
 * Get current month's cross-post usage for the user.
 */
export async function getCrossPostUsage(): Promise<
  ActionResult<CrossPostUsage>
> {
  try {
    const userId = await getCurrentUserId();
    const month = getCurrentMonth();

    const [usage] = await db
      .select()
      .from(usageTracking)
      .where(
        and(
          eq(usageTracking.userId, userId),
          eq(usageTracking.month, month),
        ),
      )
      .limit(1);

    return {
      success: true,
      data: {
        used: usage?.crossPostsCount ?? 0,
        limit: 50, // default limit; can be pulled from subscription
        month,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get usage";
    return { success: false, error: message };
  }
}

/**
 * Trigger AI adaptation for a Telegram post.
 * Sends an Inngest event and creates a draft cross-post record.
 */
export async function triggerAdaptContent(
  input: AdaptContentInput,
): Promise<ActionResult<{ crossPostId: string }>> {
  try {
    const userId = await getCurrentUserId();

    if (!input.postId) {
      return { success: false, error: "Post ID is required" };
    }

    // Verify post exists and belongs to user's channel
    const [post] = await db
      .select({ id: telegramPosts.id, channelId: telegramPosts.channelId })
      .from(telegramPosts)
      .where(eq(telegramPosts.id, input.postId))
      .limit(1);

    if (!post) {
      return { success: false, error: "Post not found" };
    }

    // Verify channel ownership
    const [channel] = await db
      .select({ id: telegramChannels.id })
      .from(telegramChannels)
      .where(
        and(
          eq(telegramChannels.id, post.channelId),
          eq(telegramChannels.userId, userId),
        ),
      )
      .limit(1);

    if (!channel) {
      return { success: false, error: "Access denied" };
    }

    // Check usage quota
    const usageResult = await getCrossPostUsage();
    if (usageResult.success && usageResult.data.used >= usageResult.data.limit) {
      return {
        success: false,
        error: `Cross-post quota exceeded (${usageResult.data.used}/${usageResult.data.limit} used this month)`,
      };
    }

    // Create draft cross-post record
    const [crossPost] = await db
      .insert(crossPosts)
      .values({
        userId,
        sourcePostId: input.postId,
        platform: input.platform,
        status: "draft",
      })
      .returning({ id: crossPosts.id });

    if (!crossPost) {
      return { success: false, error: "Failed to create cross-post record" };
    }

    // Trigger Inngest AI adaptation event
    const { inngest } = await import("@/lib/inngest/client");
    await inngest.send({
      name: "ai/content.adapt",
      data: {
        postId: input.postId,
        userId,
        platform: input.platform,
        channelId: input.channelId ?? post.channelId,
        crossPostId: crossPost.id,
      },
    });

    revalidatePath("/dashboard/crosspost");

    return { success: true, data: { crossPostId: crossPost.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to trigger adaptation";
    return { success: false, error: message };
  }
}

/**
 * Get a cross-post record by ID (polls for AI completion status).
 */
export async function getCrossPost(
  crossPostId: string,
): Promise<ActionResult<CrossPost>> {
  try {
    const userId = await getCurrentUserId();

    const [crossPost] = await db
      .select()
      .from(crossPosts)
      .where(
        and(
          eq(crossPosts.id, crossPostId),
          eq(crossPosts.userId, userId),
        ),
      )
      .limit(1);

    if (!crossPost) {
      return { success: false, error: "Cross-post not found" };
    }

    return { success: true, data: crossPost };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get cross-post";
    return { success: false, error: message };
  }
}

/**
 * Update adapted content (Step 3 editing).
 */
export async function updateAdaptedContent(input: {
  crossPostId: string;
  adaptedContent: string;
}): Promise<ActionResult<CrossPost>> {
  try {
    const userId = await getCurrentUserId();

    if (!input.crossPostId) {
      return { success: false, error: "Cross-post ID is required" };
    }

    const [updated] = await db
      .update(crossPosts)
      .set({
        adaptedContent: input.adaptedContent,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(crossPosts.id, input.crossPostId),
          eq(crossPosts.userId, userId),
        ),
      )
      .returning();

    if (!updated) {
      return { success: false, error: "Cross-post not found" };
    }

    return { success: true, data: updated };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update content";
    return { success: false, error: message };
  }
}

/**
 * Post Now — triggers the platform posting Inngest event immediately.
 */
export async function postCrossPostNow(
  input: PostNowInput,
): Promise<ActionResult<{ crossPostId: string }>> {
  try {
    const userId = await getCurrentUserId();

    if (!input.crossPostId) {
      return { success: false, error: "Cross-post ID is required" };
    }

    // Verify ownership and get platform
    const [crossPost] = await db
      .select()
      .from(crossPosts)
      .where(
        and(
          eq(crossPosts.id, input.crossPostId),
          eq(crossPosts.userId, userId),
        ),
      )
      .limit(1);

    if (!crossPost) {
      return { success: false, error: "Cross-post not found" };
    }

    if (!crossPost.adaptedContent) {
      return { success: false, error: "No adapted content to post" };
    }

    // Check platform connection exists
    const [platformConn] = await db
      .select({ id: platformConnections.id })
      .from(platformConnections)
      .where(
        and(
          eq(platformConnections.userId, userId),
          eq(platformConnections.platform, crossPost.platform),
        ),
      )
      .limit(1);

    if (!platformConn) {
      return {
        success: false,
        error: `No ${crossPost.platform} connection found. Please connect your account first.`,
      };
    }

    // Send platform-specific Inngest event
    const { inngest } = await import("@/lib/inngest/client");
    const eventName =
      crossPost.platform === "linkedin"
        ? "platform/linkedin.post"
        : "platform/twitter.post";

    await inngest.send({
      name: eventName,
      data: { crossPostId: input.crossPostId, userId },
    });

    // Update status to indicate it's being processed
    await db
      .update(crossPosts)
      .set({ status: "scheduled", updatedAt: new Date() })
      .where(eq(crossPosts.id, input.crossPostId));

    revalidatePath("/dashboard/crosspost");

    return { success: true, data: { crossPostId: input.crossPostId } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to post";
    return { success: false, error: message };
  }
}

/**
 * Schedule a cross-post for later.
 */
export async function scheduleCrossPost(
  input: ScheduleCrossPostInput,
): Promise<ActionResult<{ scheduleId: string }>> {
  try {
    const userId = await getCurrentUserId();

    if (!input.crossPostId) {
      return { success: false, error: "Cross-post ID is required" };
    }

    // Verify ownership
    const [crossPost] = await db
      .select({ id: crossPosts.id, adaptedContent: crossPosts.adaptedContent })
      .from(crossPosts)
      .where(
        and(
          eq(crossPosts.id, input.crossPostId),
          eq(crossPosts.userId, userId),
        ),
      )
      .limit(1);

    if (!crossPost) {
      return { success: false, error: "Cross-post not found" };
    }

    if (!crossPost.adaptedContent) {
      return { success: false, error: "No adapted content to schedule" };
    }

    // Use scheduling engine
    const result = await createSchedule({
      userId,
      crossPostId: input.crossPostId,
      scheduledAt: input.scheduledAt,
      timezone: input.timezone,
    });

    if (!result.success) {
      return { success: false, error: result.error ?? "Failed to schedule" };
    }

    // Update cross-post status
    await db
      .update(crossPosts)
      .set({
        status: "scheduled",
        scheduledFor: input.scheduledAt,
        updatedAt: new Date(),
      })
      .where(eq(crossPosts.id, input.crossPostId));

    revalidatePath("/dashboard/crosspost");

    return { success: true, data: { scheduleId: result.scheduleId! } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to schedule";
    return { success: false, error: message };
  }
}

/**
 * Get connected platforms for the current user.
 */
export async function getConnectedPlatforms(): Promise<
  ActionResult<Platform[]>
> {
  try {
    const userId = await getCurrentUserId();

    const connections = await db
      .select({ platform: platformConnections.platform })
      .from(platformConnections)
      .where(eq(platformConnections.userId, userId));

    const platforms = connections.map((c) => c.platform as Platform);

    return { success: true, data: platforms };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get platforms";
    return { success: false, error: message };
  }
}
