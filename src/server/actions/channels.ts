"use server";

import { db } from "@/server/db";
import { telegramChannels, telegramPosts } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getTelegramClient } from "@/lib/telegram/client";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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

function normalizeUsername(username: string): string {
  return username.trim().replace(/^@/, "");
}

// ─── Server Actions ──────────────────────────────────────────────────────────

export async function listChannels(): Promise<
  ActionResult<ChannelWithPostCount[]>
> {
  try {
    const userId = await getCurrentUserId();

    const channels = await db
      .select()
      .from(telegramChannels)
      .where(eq(telegramChannels.userId, userId))
      .orderBy(desc(telegramChannels.connectedAt));

    const channelsWithCounts = await Promise.all(
      channels.map(async (channel) => {
        const [postStats] = await db
          .select({
            count: sql<number>`count(*)::int`,
            lastPostAt: sql<Date | null>`max(${telegramPosts.postedAt})`,
          })
          .from(telegramPosts)
          .where(eq(telegramPosts.channelId, channel.id));

        return {
          ...channel,
          postCount: postStats?.count ?? 0,
          lastPostAt: postStats?.lastPostAt ?? null,
        };
      }),
    );

    return { success: true, data: channelsWithCounts };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list channels";
    return { success: false, error: message };
  }
}

export async function getChannelDetails(
  id: string,
): Promise<
  ActionResult<ChannelWithPostCount & { recentPosts: Post[] }>
> {
  try {
    const userId = await getCurrentUserId();

    if (!id) {
      return { success: false, error: "Channel ID is required" };
    }

    const [channel] = await db
      .select()
      .from(telegramChannels)
      .where(
        and(eq(telegramChannels.id, id), eq(telegramChannels.userId, userId)),
      )
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
    const message =
      error instanceof Error ? error.message : "Failed to get channel details";
    return { success: false, error: message };
  }
}

export async function connectChannel(
  input: ConnectChannelInput,
): Promise<ActionResult<Channel>> {
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
        error:
          "Bot is not an admin of this channel. Please add the bot as an admin first.",
      };
    }

    // Verify the chat is a channel (not a group)
    if (chatInfo.type !== "channel") {
      return {
        success: false,
        error: "The provided username is not a channel.",
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
      return {
        success: false,
        error: "This channel is already connected to your account.",
      };
    }

    // Get member count (non-critical)
    let memberCount = 0;
    try {
      memberCount = await tgClient.getChatMemberCount(`@${username}`);
    } catch {
      // Non-critical — proceed with 0
    }

    // Set webhook (non-critical)
    const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (webhookBaseUrl) {
      try {
        await tgClient.setWebhook(`${webhookBaseUrl}/api/telegram/webhook`, {
          allowed_updates: ["channel_post", "edited_channel_post"],
        });
      } catch {
        // Non-critical — channel will still be stored
      }
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

    revalidatePath("/dashboard/channels");

    return { success: true, data: channel };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect channel";
    return { success: false, error: message };
  }
}

export async function disconnectChannel(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getCurrentUserId();

    if (!id) {
      return { success: false, error: "Channel ID is required" };
    }

    // Verify ownership
    const [channel] = await db
      .select()
      .from(telegramChannels)
      .where(
        and(eq(telegramChannels.id, id), eq(telegramChannels.userId, userId)),
      )
      .limit(1);

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    // Remove webhook (non-critical)
    try {
      const tgClient = getTelegramClient();
      await tgClient.deleteWebhook();
    } catch {
      // Non-critical — proceed with deletion
    }

    const deleted = await db
      .delete(telegramChannels)
      .where(
        and(eq(telegramChannels.id, id), eq(telegramChannels.userId, userId)),
      )
      .returning({ id: telegramChannels.id });

    if (deleted.length === 0) {
      return { success: false, error: "Channel not found" };
    }

    revalidatePath("/dashboard/channels");

    return { success: true, data: { id: deleted[0].id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to disconnect channel";
    return { success: false, error: message };
  }
}

export async function updateChannelSettings(input: {
  id: string;
}): Promise<ActionResult<Channel>> {
  try {
    const userId = await getCurrentUserId();

    if (!input.id) {
      return { success: false, error: "Channel ID is required" };
    }

    const [channel] = await db
      .select()
      .from(telegramChannels)
      .where(
        and(
          eq(telegramChannels.id, input.id),
          eq(telegramChannels.userId, userId),
        ),
      )
      .limit(1);

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    const [updated] = await db
      .update(telegramChannels)
      .set({ updatedAt: new Date() })
      .where(
        and(
          eq(telegramChannels.id, input.id),
          eq(telegramChannels.userId, userId),
        ),
      )
      .returning();

    revalidatePath("/dashboard/channels");
    revalidatePath(`/dashboard/channels/${input.id}`);

    return { success: true, data: updated };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update channel settings";
    return { success: false, error: message };
  }
}
