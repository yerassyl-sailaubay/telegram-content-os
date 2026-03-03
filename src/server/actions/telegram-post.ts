"use server";

import { db } from "@/server/db";
import { telegramChannels, telegramPosts } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getTelegramClient } from "@/lib/telegram/client";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

export interface TelegramPostInput {
  channelId: string;
  content: string;
  parseMode?: "HTML" | "MarkdownV2";
  imageUrl?: string;
}

export interface TelegramPostResult {
  id: string;
  telegramMessageId: number;
  postedAt: Date;
}

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

/**
 * Post a message to a Telegram channel
 */
export async function postToTelegram(
  input: TelegramPostInput,
): Promise<ActionResult<TelegramPostResult>> {
  try {
    const userId = await getCurrentUserId();

    // Validate input
    if (!input.channelId) {
      return { success: false, error: "Channel ID is required" };
    }

    if (!input.content?.trim() && !input.imageUrl) {
      return { success: false, error: "Content or image is required" };
    }

    // Verify channel ownership
    const [channel] = await db
      .select()
      .from(telegramChannels)
      .where(and(eq(telegramChannels.id, input.channelId), eq(telegramChannels.userId, userId)))
      .limit(1);

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    // Send message to Telegram
    const tgClient = getTelegramClient();
    const telegramChatId = channel.telegramChatId;

    let sentMessage;
    try {
      if (input.imageUrl) {
        // Send photo with caption
        sentMessage = await tgClient.sendPhoto(telegramChatId, input.imageUrl, {
          caption: input.content?.trim(),
          parse_mode: input.parseMode,
        });
      } else {
        // Send text only
        sentMessage = await tgClient.sendMessage(telegramChatId, input.content.trim(), {
          parse_mode: input.parseMode,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send message to Telegram";
      return { success: false, error: errorMessage };
    }

    // Store post in database
    const [post] = await db
      .insert(telegramPosts)
      .values({
        channelId: input.channelId,
        telegramMessageId: sentMessage.message_id,
        contentRaw: input.content?.trim() || "",
        postedAt: new Date(),
      })
      .returning();

    revalidatePath("/ru/dashboard/posts");
    revalidatePath("/en/dashboard/posts");
    revalidatePath(`/ru/dashboard/channels/${input.channelId}`);
    revalidatePath(`/en/dashboard/channels/${input.channelId}`);

    return {
      success: true,
      data: {
        id: post.id,
        telegramMessageId: sentMessage.message_id,
        postedAt: post.postedAt ?? new Date(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to post to Telegram";
    return { success: false, error: message };
  }
}

/**
 * Get all connected Telegram channels for the current user
 */
export async function getConnectedChannels(): Promise<
  ActionResult<
    Array<{
      id: string;
      title: string | null;
      username: string | null;
      memberCount: number | null;
    }>
  >
> {
  try {
    const userId = await getCurrentUserId();

    const channels = await db
      .select({
        id: telegramChannels.id,
        title: telegramChannels.title,
        username: telegramChannels.username,
        memberCount: telegramChannels.memberCount,
      })
      .from(telegramChannels)
      .where(eq(telegramChannels.userId, userId))
      .orderBy(telegramChannels.connectedAt);

    return { success: true, data: channels };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load connected channels";
    return { success: false, error: message };
  }
}

/**
 * Upload an image to Supabase storage for Telegram posting
 */
export async function uploadImageForPost(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  try {
    const userId = await getCurrentUserId();
    const file = formData.get("image") as File;

    if (!file) {
      return { success: false, error: "No image provided" };
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "File must be an image" };
    }

    // Max 10MB for Telegram
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: "Image must be less than 10MB" };
    }

    const supabase = await createClient();
    const path = `telegram-posts/${userId}/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage.from("media").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("media").getPublicUrl(path);

    return { success: true, data: { url: publicUrl } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload image";
    return { success: false, error: message };
  }
}
