"use server";

import { db } from "@/server/db";
import { contentLibrary } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { enforceAiQuota } from "@/lib/billing/ai-quota";
import { inngest } from "@/lib/inngest/client";
import { eq, and } from "drizzle-orm";

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

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

export async function developIdea(contentId: string): Promise<ActionResult<{ message: string }>> {
  try {
    const userId = await getCurrentUserId();

    const [content] = await db
      .select()
      .from(contentLibrary)
      .where(and(eq(contentLibrary.id, contentId), eq(contentLibrary.userId, userId)))
      .limit(1);

    if (!content) {
      return { success: false, error: "Content not found" };
    }

    if (content.sourceType !== "idea") {
      return { success: false, error: "Only ideas can be developed into drafts" };
    }

    const quotaResult = await enforceAiQuota(userId);
    if (!quotaResult.allowed) {
      return { success: false, error: "Monthly AI quota exceeded. Upgrade at /dashboard/billing" };
    }

    await inngest.send({
      name: "ai/content.develop-idea",
      data: {
        contentId,
        userId,
        channelId: content.channelId,
      },
    });

    return { success: true, data: { message: "Developing idea" } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to develop idea";
    return { success: false, error: message };
  }
}
