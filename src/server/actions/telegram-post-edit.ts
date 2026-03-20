"use server";

import { db } from "@/server/db";
import { telegramChannels, telegramPosts } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getTelegramClient } from "@/lib/telegram/client";
import {
  prepareTelegramTextForSend,
  type TelegramComposerParseMode,
} from "@/lib/telegram/formatting";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

export interface EditPostInput {
  postId: string;
  content: string;
  parseMode?: TelegramComposerParseMode;
}

export interface EditPostResult {
  id: string;
  editedAt: Date;
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
 * Edit a Telegram post
 */
export async function editTelegramPost(
  input: EditPostInput,
): Promise<ActionResult<EditPostResult>> {
  try {
    const userId = await getCurrentUserId();

    // Validate input
    if (!input.postId) {
      return { success: false, error: "Post ID is required" };
    }

    if (!input.content?.trim()) {
      return { success: false, error: "Content is required" };
    }

    // Get the post and verify ownership
    const [post] = await db
      .select({
        id: telegramPosts.id,
        telegramMessageId: telegramPosts.telegramMessageId,
        channelId: telegramPosts.channelId,
      })
      .from(telegramPosts)
      .where(eq(telegramPosts.id, input.postId))
      .limit(1);

    if (!post) {
      return { success: false, error: "Post not found" };
    }

    // Verify channel ownership
    const [channel] = await db
      .select({
        id: telegramChannels.id,
        telegramChatId: telegramChannels.telegramChatId,
      })
      .from(telegramChannels)
      .where(and(eq(telegramChannels.id, post.channelId), eq(telegramChannels.userId, userId)))
      .limit(1);

    if (!channel) {
      return { success: false, error: "Channel not found or unauthorized" };
    }

    // Edit message on Telegram
    const tgClient = getTelegramClient();
    const telegramChatId = channel.telegramChatId;
    const messageId = post.telegramMessageId;
    const formatted = prepareTelegramTextForSend(input.content, input.parseMode);

    if (messageId == null) {
      return { success: false, error: "Invalid message ID" };
    }

    try {
      if (formatted.parseMode) {
        await tgClient.editMessageText(telegramChatId, messageId, formatted.text, {
          parse_mode: formatted.parseMode,
        });
      } else {
        await tgClient.editMessageText(telegramChatId, messageId, formatted.text);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to edit message on Telegram";
      return { success: false, error: errorMessage };
    }

    // Update post in database
    const [updatedPost] = await db
      .update(telegramPosts)
      .set({
        contentRaw: input.content.trim(),
      })
      .where(eq(telegramPosts.id, input.postId))
      .returning({
        id: telegramPosts.id,
      });

    revalidatePath("/ru/dashboard/posts");
    revalidatePath("/en/dashboard/posts");
    revalidatePath(`/ru/dashboard/channels/${post.channelId}`);
    revalidatePath(`/en/dashboard/channels/${post.channelId}`);

    return {
      success: true,
      data: {
        id: updatedPost.id,
        editedAt: new Date(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to edit post";
    return { success: false, error: message };
  }
}

/**
 * Delete a Telegram post
 */
export async function deleteTelegramPost(postId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getCurrentUserId();

    // Get the post and verify ownership
    const [post] = await db
      .select({
        id: telegramPosts.id,
        telegramMessageId: telegramPosts.telegramMessageId,
        channelId: telegramPosts.channelId,
      })
      .from(telegramPosts)
      .where(eq(telegramPosts.id, postId))
      .limit(1);

    if (!post) {
      return { success: false, error: "Post not found" };
    }

    // Verify channel ownership
    const [channel] = await db
      .select({
        id: telegramChannels.id,
        telegramChatId: telegramChannels.telegramChatId,
      })
      .from(telegramChannels)
      .where(and(eq(telegramChannels.id, post.channelId), eq(telegramChannels.userId, userId)))
      .limit(1);

    if (!channel) {
      return { success: false, error: "Channel not found or unauthorized" };
    }

    // Delete message from Telegram
    const tgClient = getTelegramClient();
    const telegramChatId = channel.telegramChatId;
    const messageId = post.telegramMessageId;

    if (messageId != null) {
      try {
        await tgClient.deleteMessage(telegramChatId, messageId);
      } catch (error) {
        // Log but continue - the post might already be deleted
        console.error("Failed to delete message from Telegram:", error);
      }
    }

    // Delete from database
    await db.delete(telegramPosts).where(eq(telegramPosts.id, postId));

    revalidatePath("/ru/dashboard/posts");
    revalidatePath("/en/dashboard/posts");
    revalidatePath(`/ru/dashboard/channels/${post.channelId}`);
    revalidatePath(`/en/dashboard/channels/${post.channelId}`);

    return {
      success: true,
      data: { id: postId },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete post";
    return { success: false, error: message };
  }
}
