"use server";

import { db } from "@/server/db";
import { contentLibrary, telegramChannels, telegramPosts } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getTelegramClient } from "@/lib/telegram/client";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { publishToTelegram } from "./publish-telegram";

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

export interface SaveTelegramDraftInput {
  contentId?: string;
  channelId?: string;
  content: string;
  parseMode?: "HTML" | "MarkdownV2";
  imageUrl?: string;
}

export interface SaveTelegramDraftResult {
  id: string;
  status: "draft" | "scheduled";
}

export interface ScheduleTelegramPostInput extends SaveTelegramDraftInput {
  channelId: string;
  scheduledAt: string;
  timezone?: string;
}

export interface ScheduleTelegramPostResult {
  id: string;
  status: "scheduled";
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

function buildDraftTitle(content: string, imageUrl?: string): string {
  const collapsedContent = content.trim().replace(/\s+/g, " ");
  if (collapsedContent.length > 0) {
    return collapsedContent.slice(0, 80);
  }
  if (imageUrl) {
    return "Image post draft";
  }
  return "Untitled draft";
}

function normalizeSourceMetadata(
  existingMetadata: unknown,
  input: SaveTelegramDraftInput,
): Record<string, unknown> {
  const base =
    existingMetadata && typeof existingMetadata === "object" && !Array.isArray(existingMetadata)
      ? ({ ...existingMetadata } as Record<string, unknown>)
      : {};

  const existingTelegramComposer =
    base.telegramComposer &&
    typeof base.telegramComposer === "object" &&
    !Array.isArray(base.telegramComposer)
      ? ({ ...base.telegramComposer } as Record<string, unknown>)
      : {};

  return {
    ...base,
    telegramComposer: {
      ...existingTelegramComposer,
      parseMode: input.parseMode ?? null,
      imageUrl: input.imageUrl ?? null,
    },
  };
}

async function ensureOwnedChannel(userId: string, channelId?: string) {
  if (!channelId) {
    return null;
  }

  const [channel] = await db
    .select({
      id: telegramChannels.id,
    })
    .from(telegramChannels)
    .where(and(eq(telegramChannels.id, channelId), eq(telegramChannels.userId, userId)))
    .limit(1);

  if (!channel) {
    return null;
  }

  return channel;
}

function revalidateContentPaths(contentId?: string) {
  revalidatePath("/ru/dashboard/posts");
  revalidatePath("/en/dashboard/posts");
  revalidatePath("/ru/dashboard/telegram-post");
  revalidatePath("/en/dashboard/telegram-post");

  if (contentId) {
    revalidatePath(`/ru/dashboard/posts/${contentId}/edit`);
    revalidatePath(`/en/dashboard/posts/${contentId}/edit`);
  }
}

export async function saveTelegramDraft(
  input: SaveTelegramDraftInput,
): Promise<ActionResult<SaveTelegramDraftResult>> {
  try {
    const userId = await getCurrentUserId();
    const normalizedContent = input.content?.trim() ?? "";

    if (!normalizedContent && !input.imageUrl) {
      return { success: false, error: "Content or image is required" };
    }

    if (input.channelId) {
      const channel = await ensureOwnedChannel(userId, input.channelId);
      if (!channel) {
        return { success: false, error: "Channel not found" };
      }
    }

    const title = buildDraftTitle(normalizedContent, input.imageUrl);

    if (input.contentId) {
      const [existing] = await db
        .select({
          id: contentLibrary.id,
          sourceMetadata: contentLibrary.sourceMetadata,
          status: contentLibrary.status,
        })
        .from(contentLibrary)
        .where(and(eq(contentLibrary.id, input.contentId), eq(contentLibrary.userId, userId)))
        .limit(1);

      if (!existing) {
        return { success: false, error: "Content not found" };
      }

      const metadata = normalizeSourceMetadata(existing.sourceMetadata, input);

      const [updated] = await db
        .update(contentLibrary)
        .set({
          title,
          content: normalizedContent,
          channelId: input.channelId ?? null,
          status: existing.status === "scheduled" ? "scheduled" : "draft",
          sourceMetadata: metadata,
          updatedAt: new Date(),
        })
        .where(and(eq(contentLibrary.id, input.contentId), eq(contentLibrary.userId, userId)))
        .returning({
          id: contentLibrary.id,
          status: contentLibrary.status,
        });

      if (!updated) {
        return { success: false, error: "Failed to update draft" };
      }

      revalidateContentPaths(updated.id);
      return {
        success: true,
        data: {
          id: updated.id,
          status: updated.status === "scheduled" ? "scheduled" : "draft",
        },
      };
    }

    const metadata = normalizeSourceMetadata(null, input);

    const [created] = await db
      .insert(contentLibrary)
      .values({
        userId,
        title,
        content: normalizedContent,
        status: "draft",
        channelId: input.channelId ?? null,
        sourceMetadata: metadata,
      })
      .returning({
        id: contentLibrary.id,
        status: contentLibrary.status,
      });

    if (!created) {
      return { success: false, error: "Failed to save draft" };
    }

    revalidateContentPaths(created.id);
    return {
      success: true,
      data: { id: created.id, status: "draft" },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save draft";
    return { success: false, error: message };
  }
}

export async function scheduleTelegramPost(
  input: ScheduleTelegramPostInput,
): Promise<ActionResult<ScheduleTelegramPostResult>> {
  try {
    if (!input.channelId) {
      return { success: false, error: "Channel ID is required" };
    }

    if (!input.scheduledAt) {
      return { success: false, error: "Scheduled time is required" };
    }

    const draftResult = await saveTelegramDraft({
      contentId: input.contentId,
      channelId: input.channelId,
      content: input.content,
      parseMode: input.parseMode,
      imageUrl: input.imageUrl,
    });

    if (!draftResult.success) {
      return draftResult;
    }

    const publishResult = await publishToTelegram(
      draftResult.data.id,
      input.channelId,
      input.scheduledAt,
      input.timezone ?? "UTC",
    );

    if (!publishResult.success) {
      return { success: false, error: publishResult.error };
    }

    revalidateContentPaths(draftResult.data.id);
    return {
      success: true,
      data: {
        id: draftResult.data.id,
        status: "scheduled",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to schedule post";
    return { success: false, error: message };
  }
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
