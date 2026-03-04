import { inngest } from "@/lib/inngest/client";
import type { RepurposeMode } from "@/lib/ai/types";

interface RepurposeContentEvent {
  data: {
    contentId: string;
    mode: RepurposeMode;
    numVariations: number;
    userId: string;
    channelId: string | null;
  };
}

export const repurposeContent = inngest.createFunction(
  {
    id: "ai/repurpose-content",
    retries: 2,
  },
  { event: "ai/content.repurpose" },
  async ({ event, step }) => {
    const { contentId, mode, numVariations, userId, channelId } = (event as RepurposeContentEvent)
      .data;

    const content = await step.run("load-content", async () => {
      const { db } = await import("@/server/db");
      const { contentLibrary } = await import("@/server/db/schema");
      const { eq } = await import("drizzle-orm");

      const rows = await db
        .select()
        .from(contentLibrary)
        .where(eq(contentLibrary.id, contentId))
        .limit(1);

      if (rows.length === 0) {
        throw new Error(`Content ${contentId} not found`);
      }

      const row = rows[0]!;
      return {
        id: row.id,
        content: row.content,
        title: row.title,
        channelId: row.channelId,
        userId: row.userId,
      };
    });

    await step.run("check-quota", async () => {
      const { enforceAiQuota } = await import("@/lib/billing/ai-quota");

      const quotaResult = await enforceAiQuota(userId);
      if (!quotaResult.allowed) {
        throw new Error("Monthly AI quota exceeded");
      }
    });

    const channelProfile = await step.run("load-channel-profile", async () => {
      const resolvedChannelId = channelId ?? content.channelId;
      if (!resolvedChannelId) return null;

      const { db } = await import("@/server/db");
      const { channelProfiles } = await import("@/server/db/schema");
      const { eq } = await import("drizzle-orm");

      const rows = await db
        .select()
        .from(channelProfiles)
        .where(eq(channelProfiles.channelId, resolvedChannelId))
        .limit(1);

      if (rows.length === 0) return null;

      const row = rows[0]!;
      return {
        niche: row.niche,
        tone: row.tone,
        topTopics: (row.topTopics ?? []) as string[],
        language: row.language ?? "ru",
      };
    });

    const result = await step.run("generate", async () => {
      const { OpenRouterClient } = await import("@/lib/ai/openrouter");
      const { GenerationEngine } = await import("@/lib/ai/generation-engine");

      const client = new OpenRouterClient();
      const engine = new GenerationEngine(client);

      return engine.generate({
        type: "repurpose",
        sourceContent: content.content ?? "",
        channelProfile: channelProfile ?? undefined,
        options: {
          repurposeMode: mode,
          numVariations,
        },
      });
    });

    const newContentIds = await step.run("store-results", async () => {
      const { db } = await import("@/server/db");
      const { contentLibrary } = await import("@/server/db/schema");

      const variations = Array.isArray(result.content) ? result.content : [result.content];
      const ids: string[] = [];

      for (let i = 0; i < variations.length; i++) {
        const variation = variations[i]!;
        const title = `${content.title ?? "Untitled"} (${mode}${variations.length > 1 ? ` ${i + 1}` : ""})`;

        const inserted = await db
          .insert(contentLibrary)
          .values({
            userId,
            title,
            content: variation,
            sourceType: "repurposed",
            status: "draft",
            channelId: content.channelId,
            sourceUrl: contentId,
          })
          .returning({ id: contentLibrary.id });

        ids.push(inserted[0]!.id);
      }

      return ids;
    });

    await step.run("track-usage", async () => {
      const { incrementAiUsage } = await import("@/lib/billing/ai-quota");
      await incrementAiUsage(userId);
    });

    return {
      status: "completed",
      newContentIds,
      mode,
      modelUsed: result.modelUsed,
      tokenUsage: result.tokenUsage,
    };
  },
);
