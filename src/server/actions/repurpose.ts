"use server";

import { db } from "@/server/db";
import { contentLibrary } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { enforceAiQuota } from "@/lib/billing/ai-quota";
import { inngest } from "@/lib/inngest/client";
import { eq, and } from "drizzle-orm";
import type { RepurposeMode } from "@/lib/ai/types";

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

export async function repurposePost(
  contentId: string,
  mode: RepurposeMode,
  options?: { numVariations?: number },
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

    const quotaResult = await enforceAiQuota(user.id);
    if (!quotaResult.allowed) {
      return { success: false, error: "Monthly AI quota exceeded. Upgrade at /dashboard/billing" };
    }

    await inngest.send({
      name: "ai/content.repurpose",
      data: {
        contentId,
        mode,
        numVariations: options?.numVariations ?? 1,
        userId: user.id,
        channelId: content.channelId,
      },
    });

    return { success: true, data: { message: "Repurposing started" } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start repurposing";
    return { success: false, error: message };
  }
}
