"use server";

import { db } from "@/server/db";
import { welcomeTemplates, telegramChannels } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getTelegramClient } from "@/lib/telegram/client";
import { renderTemplate, buildTemplateVars } from "@/lib/telegram/welcome";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────────────────────────────

export type WelcomeTemplate = typeof welcomeTemplates.$inferSelect;

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

/**
 * Verify user owns the channel. Returns channel or null.
 */
async function verifyChannelOwnership(
  channelId: string,
  userId: string,
): Promise<typeof telegramChannels.$inferSelect | null> {
  const [channel] = await db
    .select()
    .from(telegramChannels)
    .where(
      and(
        eq(telegramChannels.id, channelId),
        eq(telegramChannels.userId, userId),
      ),
    )
    .limit(1);

  return channel ?? null;
}

// ─── Server Actions ──────────────────────────────────────────────────────────

/**
 * Get the welcome template for a channel.
 */
export async function getWelcomeTemplate(
  channelId: string,
): Promise<ActionResult<WelcomeTemplate | null>> {
  try {
    const userId = await getCurrentUserId();

    if (!channelId) {
      return { success: false, error: "Channel ID is required" };
    }

    // Verify ownership
    const channel = await verifyChannelOwnership(channelId, userId);
    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    const [template] = await db
      .select()
      .from(welcomeTemplates)
      .where(eq(welcomeTemplates.channelId, channelId))
      .limit(1);

    return { success: true, data: template ?? null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get welcome template";
    return { success: false, error: message };
  }
}

/**
 * Save (upsert) a welcome template for a channel.
 */
export async function saveWelcomeTemplate(
  channelId: string,
  templateText: string,
  isEnabled: boolean,
): Promise<ActionResult<WelcomeTemplate>> {
  try {
    const userId = await getCurrentUserId();

    if (!channelId) {
      return { success: false, error: "Channel ID is required" };
    }

    if (!templateText.trim()) {
      return { success: false, error: "Template text is required" };
    }

    // Verify ownership
    const channel = await verifyChannelOwnership(channelId, userId);
    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    // Check if template already exists
    const [existing] = await db
      .select()
      .from(welcomeTemplates)
      .where(eq(welcomeTemplates.channelId, channelId))
      .limit(1);

    let template: WelcomeTemplate;

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(welcomeTemplates)
        .set({
          templateText: templateText.trim(),
          isEnabled,
          updatedAt: new Date(),
        })
        .where(eq(welcomeTemplates.id, existing.id))
        .returning();
      template = updated;
    } else {
      // Insert new
      const [inserted] = await db
        .insert(welcomeTemplates)
        .values({
          channelId,
          userId,
          templateText: templateText.trim(),
          isEnabled,
        })
        .returning();
      template = inserted;
    }

    revalidatePath(`/dashboard/channels/${channelId}/welcome`);

    return { success: true, data: template };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to save welcome template";
    return { success: false, error: message };
  }
}

/**
 * Test the welcome message by rendering with sample data and sending to the channel.
 */
export async function testWelcomeMessage(
  channelId: string,
): Promise<ActionResult<{ preview: string }>> {
  try {
    const userId = await getCurrentUserId();

    if (!channelId) {
      return { success: false, error: "Channel ID is required" };
    }

    // Verify ownership
    const channel = await verifyChannelOwnership(channelId, userId);
    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    // Get template
    const [template] = await db
      .select()
      .from(welcomeTemplates)
      .where(eq(welcomeTemplates.channelId, channelId))
      .limit(1);

    if (!template) {
      return { success: false, error: "No welcome template found" };
    }

    // Render with sample data
    const sampleVars = buildTemplateVars(
      {
        id: 0,
        is_bot: false,
        first_name: "John",
        last_name: "Doe",
      },
      channel.title ?? channel.username ?? "My Channel",
      channel.memberCount ?? 1234,
    );

    const preview = renderTemplate(template.templateText, sampleVars);

    // Send to channel
    const tgClient = getTelegramClient();
    await tgClient.sendMessage(channel.telegramChatId, preview);

    return { success: true, data: { preview } };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to test welcome message";
    return { success: false, error: message };
  }
}
