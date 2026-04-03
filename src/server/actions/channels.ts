"use server";

import { db } from "@/server/db";
import { telegramChannels, telegramPosts } from "@/server/db/schema";
import { getTelegramClient } from "@/lib/telegram/client";
import { eq, and, desc, sql, getTableColumns } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import {
  elapsedMs,
  logHotRoutePerf,
  measurePerfStep,
  type PerfTimings,
} from "@/lib/perf/hot-routes";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Channel = typeof telegramChannels.$inferSelect;
export type Post = typeof telegramPosts.$inferSelect;

export type ChannelWithPostCount = Channel & {
  postCount: number;
  lastPostAt: Date | null;
};

export type ConnectChannelInput = {
  username: string;
};

export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeUsername(username: string): string {
  return username.trim().replace(/^@/, "");
}

function resolveWebhookRegistrationConfig(): { url: string; secretToken: string } {
  const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!webhookBaseUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  }

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET is not configured");
  }

  return {
    url: `${webhookBaseUrl}/api/telegram/webhook`,
    secretToken: webhookSecret,
  };
}

async function registerTelegramWebhook(client: ReturnType<typeof getTelegramClient>): Promise<void> {
  const { url, secretToken } = resolveWebhookRegistrationConfig();
  const registered = await client.setWebhook(url, {
    allowed_updates: ["message", "channel_post", "edited_channel_post"],
    secret_token: secretToken,
  });

  if (!registered) {
    throw new Error("Telegram API returned unsuccessful webhook registration");
  }
}

// ─── Server Actions ──────────────────────────────────────────────────────────

export async function listChannels(): Promise<ActionResult<ChannelWithPostCount[]>> {
  const startedAt = performance.now();
  const timings: PerfTimings = {};

  try {
    const userId = await measurePerfStep(timings, "authMs", () => getCurrentUserId());

    const channelColumns = getTableColumns(telegramChannels);

    const channelsWithCounts = await measurePerfStep(timings, "channelsWithStatsMs", () =>
      db
        .select({
          ...channelColumns,
          postCount: sql<number>`(
            select count(*)::int
            from ${telegramPosts}
            where ${telegramPosts.channelId} = ${telegramChannels.id}
          )`,
          lastPostAt: sql<Date | null>`(
            select max(${telegramPosts.postedAt})
            from ${telegramPosts}
            where ${telegramPosts.channelId} = ${telegramChannels.id}
          )`,
        })
        .from(telegramChannels)
        .where(eq(telegramChannels.userId, userId))
        .orderBy(desc(telegramChannels.connectedAt)),
    );

    if (channelsWithCounts.length === 0) {
      logHotRoutePerf("channels-data", {
        totalMs: elapsedMs(startedAt),
        timings,
        channels: 0,
      });
      return { success: true, data: [] };
    }

    logHotRoutePerf("channels-data", {
      totalMs: elapsedMs(startedAt),
      timings,
      channels: channelsWithCounts.length,
      channelsWithPosts: channelsWithCounts.filter((channel) => channel.postCount > 0).length,
    });

    return { success: true, data: channelsWithCounts };
  } catch (error) {
    logHotRoutePerf("channels-data", {
      totalMs: elapsedMs(startedAt),
      timings,
      error: error instanceof Error ? error.message : "unknown",
    });

    const message = error instanceof Error ? error.message : "Failed to list channels";
    return { success: false, error: message };
  }
}

export async function getChannelDetails(
  id: string,
): Promise<ActionResult<ChannelWithPostCount & { recentPosts: Post[] }>> {
  try {
    const userId = await getCurrentUserId();

    if (!id) {
      return { success: false, error: "Channel ID is required" };
    }

    const [channel] = await db
      .select()
      .from(telegramChannels)
      .where(and(eq(telegramChannels.id, id), eq(telegramChannels.userId, userId)))
      .limit(1);

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    const [postStats] = await db
      .select({
        count: sql<number>`count(*)::int`,
        lastPostAt: sql<Date | null>`max(${telegramPosts.postedAt})`,
      })
      .from(telegramPosts)
      .where(eq(telegramPosts.channelId, channel.id));

    const recentPosts = await db
      .select()
      .from(telegramPosts)
      .where(eq(telegramPosts.channelId, channel.id))
      .orderBy(desc(telegramPosts.postedAt))
      .limit(10);

    return {
      success: true,
      data: {
        ...channel,
        postCount: postStats?.count ?? 0,
        lastPostAt: postStats?.lastPostAt ?? null,
        recentPosts,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get channel details";
    return { success: false, error: message };
  }
}

export async function connectChannel(input: ConnectChannelInput): Promise<ActionResult<Channel>> {
  try {
    const userId = await getCurrentUserId();

    const rawUsername = input.username?.trim();
    if (!rawUsername) {
      return { success: false, error: "Channel username is required" };
    }

    const username = normalizeUsername(rawUsername);

    if (!username) {
      return { success: false, error: "Channel username is required" };
    }

    // Verify bot has access to the channel via Telegram API
    const tgClient = getTelegramClient();
    let chatInfo;
    try {
      chatInfo = await tgClient.getChat(`@${username}`);
    } catch {
      return {
        success: false,
        error: "Bot is not an admin of this channel. Please add the bot as an admin first.",
      };
    }

    // Verify the chat is a channel (not a group)
    if (chatInfo.type !== "channel") {
      return {
        success: false,
        error: "The provided username is not a channel.",
      };
    }

    try {
      await registerTelegramWebhook(tgClient);
    } catch (error) {
      const details = error instanceof Error ? error.message : "Unknown Telegram API error";
      return {
        success: false,
        error: `Failed to register Telegram webhook. ${details}`,
      };
    }

    const telegramChatId = String(chatInfo.id);

    // Check if channel is already connected by this user
    const existing = await db
      .select()
      .from(telegramChannels)
      .where(
        and(
          eq(telegramChannels.telegramChatId, telegramChatId),
          eq(telegramChannels.userId, userId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Channel already connected — update its info (reconnect flow)
      const existingChannel = existing[0];
      let memberCount = 0;
      try {
        memberCount = await tgClient.getChatMemberCount(`@${username}`);
      } catch {
        // Non-critical
      }

      const [updated] = await db
        .update(telegramChannels)
        .set({
          title: chatInfo.title ?? existingChannel.title,
          username: chatInfo.username ?? username,
          description: chatInfo.description ?? existingChannel.description,
          memberCount,
          updatedAt: new Date(),
        })
        .where(eq(telegramChannels.id, existingChannel.id))
        .returning();

      revalidatePath("/ru/dashboard/channels");
      revalidatePath("/en/dashboard/channels");
      revalidatePath(`/ru/dashboard/channels/${existingChannel.id}`);
      revalidatePath(`/en/dashboard/channels/${existingChannel.id}`);

      return { success: true, data: updated };
    }

    // Get member count (non-critical)
    let memberCount = 0;
    try {
      memberCount = await tgClient.getChatMemberCount(`@${username}`);
    } catch {
      // Non-critical — proceed with 0
    }

    // Store channel in DB
    const [channel] = await db
      .insert(telegramChannels)
      .values({
        userId,
        telegramChatId,
        title: chatInfo.title ?? null,
        username: chatInfo.username ?? username,
        description: chatInfo.description ?? null,
        memberCount,
        connectedAt: new Date(),
      })
      .returning();

    revalidatePath("/ru/dashboard/channels");
    revalidatePath("/en/dashboard/channels");

    return { success: true, data: channel };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to connect channel";
    return { success: false, error: message };
  }
}

export async function disconnectChannel(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getCurrentUserId();

    if (!id) {
      return { success: false, error: "Channel ID is required" };
    }

    // Verify ownership
    const [channel] = await db
      .select()
      .from(telegramChannels)
      .where(and(eq(telegramChannels.id, id), eq(telegramChannels.userId, userId)))
      .limit(1);

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    // NOTE: We do NOT call deleteWebhook() here because the bot uses a single
    // global webhook URL shared across all channels. Deleting it would break
    // webhook delivery for all other connected channels.

    const deleted = await db
      .delete(telegramChannels)
      .where(and(eq(telegramChannels.id, id), eq(telegramChannels.userId, userId)))
      .returning({ id: telegramChannels.id });

    if (deleted.length === 0) {
      return { success: false, error: "Channel not found" };
    }

    revalidatePath("/ru/dashboard/channels");
    revalidatePath("/en/dashboard/channels");

    return { success: true, data: { id: deleted[0].id } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disconnect channel";
    return { success: false, error: message };
  }
}

export async function updateChannelSettings(input: { id: string }): Promise<ActionResult<Channel>> {
  try {
    const userId = await getCurrentUserId();

    if (!input.id) {
      return { success: false, error: "Channel ID is required" };
    }

    const [channel] = await db
      .select()
      .from(telegramChannels)
      .where(and(eq(telegramChannels.id, input.id), eq(telegramChannels.userId, userId)))
      .limit(1);

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    const [updated] = await db
      .update(telegramChannels)
      .set({ updatedAt: new Date() })
      .where(and(eq(telegramChannels.id, input.id), eq(telegramChannels.userId, userId)))
      .returning();

    revalidatePath("/ru/dashboard/channels");
    revalidatePath("/en/dashboard/channels");
    revalidatePath(`/ru/dashboard/channels/${input.id}`);
    revalidatePath(`/en/dashboard/channels/${input.id}`);

    return { success: true, data: updated };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update channel settings";
    return { success: false, error: message };
  }
}

export async function refreshChannelProfile(channelId: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId();

    if (!channelId) {
      return { success: false, error: "Channel ID is required" };
    }

    // Verify ownership
    const [channel] = await db
      .select({ id: telegramChannels.id })
      .from(telegramChannels)
      .where(and(eq(telegramChannels.id, channelId), eq(telegramChannels.userId, userId)))
      .limit(1);

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    // Send Inngest event to trigger profile generation
    const { inngest } = await import("@/lib/inngest/client");
    await inngest.send({
      name: "ai/profile-channel",
      data: { channelId, userId, mode: "full" },
    });

    return { success: true, data: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to refresh channel profile";
    return { success: false, error: message };
  }
}
