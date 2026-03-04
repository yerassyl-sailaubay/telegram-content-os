"use server";

import { db } from "@/server/db";
import { contentLibrary, schedules, telegramChannels } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { eq, and } from "drizzle-orm";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

const PUBLISHABLE_STATUSES = new Set(["draft", "scheduled"]);

export async function publishToTelegram(
  contentId: string,
  channelId: string,
  scheduledAt?: string,
  timezone?: string,
): Promise<ActionResult<{ message: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const [content] = await db
      .select()
      .from(contentLibrary)
      .where(and(eq(contentLibrary.id, contentId), eq(contentLibrary.userId, user.id)))
      .limit(1);

    if (!content) {
      return { success: false, error: "Content not found" };
    }

    if (!PUBLISHABLE_STATUSES.has(content.status ?? "")) {
      return {
        success: false,
        error: `Content with status '${content.status}' cannot be published`,
      };
    }

    const [channel] = await db
      .select()
      .from(telegramChannels)
      .where(and(eq(telegramChannels.id, channelId), eq(telegramChannels.userId, user.id)))
      .limit(1);

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    const eventData = {
      contentId,
      userId: user.id,
      channelId,
    };

    if (scheduledAt) {
      const scheduledTime = new Date(scheduledAt);
      if (scheduledTime.getTime() < Date.now()) {
        return { success: false, error: "Cannot schedule in the past" };
      }

      await db.insert(schedules).values({
        userId: user.id,
        contentLibraryId: contentId,
        targetType: "telegram_publish",
        channelId,
        scheduledAt: scheduledTime,
        timezone: timezone ?? "UTC",
        status: "pending",
      });

      await inngest.send({
        name: "telegram/post.publish",
        data: eventData,
        ts: scheduledTime.getTime(),
      });

      await db
        .update(contentLibrary)
        .set({ status: "scheduled", updatedAt: new Date() })
        .where(and(eq(contentLibrary.id, contentId), eq(contentLibrary.userId, user.id)));

      return { success: true, data: { message: "Post scheduled" } };
    }

    await inngest.send({
      name: "telegram/post.publish",
      data: eventData,
    });

    return { success: true, data: { message: "Publishing started" } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish to Telegram";
    return { success: false, error: message };
  }
}
