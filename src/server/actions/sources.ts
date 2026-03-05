"use server";

import { db } from "@/server/db";
import { telegramChannels } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { parseUrl } from "@/lib/sources/url-parser";
import { enforceAiQuota } from "@/lib/billing/ai-quota";
import { inngest } from "@/lib/inngest/client";
import { eq, and } from "drizzle-orm";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export async function createFromUrl(
  url: string,
  channelId: string,
): Promise<ActionResult<{ message: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    if (!url?.trim()) {
      return { success: false, error: "URL is required" };
    }

    const parsed = parseUrl(url);

    if (parsed.type === "unknown") {
      return { success: false, error: "Unsupported URL type. Provide a YouTube or article URL." };
    }

    const quotaCheck = await enforceAiQuota(user.id);

    if (!quotaCheck.allowed) {
      return {
        success: false,
        error: "Monthly AI quota exceeded. Upgrade your plan to continue.",
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

    await inngest.send({
      name: "sources/url.submitted",
      data: {
        url: parsed.url,
        userId: user.id,
        channelId,
      },
    });

    return { success: true, data: { message: "Processing started" } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process URL";
    return { success: false, error: message };
  }
}
