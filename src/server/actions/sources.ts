"use server";

import { db } from "@/server/db";
import { externalSources, telegramChannels } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { parseUrl } from "@/lib/sources/url-parser";
import { enforceAiQuota } from "@/lib/billing/ai-quota";
import { inngest } from "@/lib/inngest/client";
import { eq, and, desc } from "drizzle-orm";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };
export type ExternalSourceJob = {
  id: string;
  sourceUrl: string;
  sourceType: "youtube" | "article" | "podcast";
  processingStatus: "pending" | "extracting" | "extracted" | "generating" | "completed" | "failed";
  title: string | null;
  linkedDraftId: string | null;
  errorMessage: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export async function createFromUrl(
  url: string,
  channelId: string,
): Promise<ActionResult<{ message: string; sourceId: string }>> {
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

    const sourceType = parsed.type === "youtube" ? "youtube" : "article";

    const [source] = await db
      .insert(externalSources)
      .values({
        userId: user.id,
        sourceUrl: parsed.url,
        sourceType,
        processingStatus: "pending",
      })
      .returning({ id: externalSources.id });

    if (!source) {
      return { success: false, error: "Failed to create source record" };
    }

    await inngest.send({
      name: "sources/url.submitted",
      data: {
        url: parsed.url,
        userId: user.id,
        channelId,
        sourceId: source.id,
      },
    });

    return {
      success: true,
      data: {
        message: "Processing started",
        sourceId: source.id,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process URL";
    return { success: false, error: message };
  }
}

export async function listExternalSourceJobs(
  limit = 20,
): Promise<ActionResult<ExternalSourceJob[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const rows = await db
      .select()
      .from(externalSources)
      .where(eq(externalSources.userId, user.id))
      .orderBy(desc(externalSources.createdAt))
      .limit(limit);

    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        sourceUrl: row.sourceUrl,
        sourceType: row.sourceType,
        processingStatus: row.processingStatus ?? "pending",
        title: row.title ?? null,
        linkedDraftId: row.linkedDraftId ?? null,
        errorMessage: row.errorMessage ?? null,
        createdAt: row.createdAt ?? null,
        updatedAt: row.updatedAt ?? null,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list source jobs";
    return { success: false, error: message };
  }
}
