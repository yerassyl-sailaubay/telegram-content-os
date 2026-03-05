import { inngest } from "@/lib/inngest/client";
import { POSTS_PER_SOURCE } from "@/lib/ai/prompts/generate-from-source";

interface GenerateFromSourceEvent {
  data: {
    contentItemId: string;
    userId: string;
    channelId: string;
    sourceId?: string;
  };
}

export const generateFromSource = inngest.createFunction(
  {
    id: "ai/generate-from-source",
    retries: 2,
  },
  { event: "ai/content.generate-from-source" },
  async ({ event, step }) => {
    const { contentItemId, userId, channelId, sourceId } = (event as GenerateFromSourceEvent).data;

    try {
      const contentItem = await step.run("load-content", async () => {
        const { db } = await import("@/server/db");
        const { contentLibrary } = await import("@/server/db/schema");
        const { eq } = await import("drizzle-orm");

        const rows = await db
          .select()
          .from(contentLibrary)
          .where(eq(contentLibrary.id, contentItemId))
          .limit(1);

        if (rows.length === 0) {
          throw new Error(`Content item ${contentItemId} not found`);
        }

        const row = rows[0]!;
        return {
          id: row.id,
          content: row.content,
          title: row.title,
          channelId: row.channelId,
          sourceUrl: row.sourceUrl,
        };
      });

      await step.run("check-quota", async () => {
        const { enforceAiQuota, AiQuotaExceededError } = await import("@/lib/billing/ai-quota");

        const quotaResult = await enforceAiQuota(userId);

        if (!quotaResult.allowed) {
          throw new AiQuotaExceededError(quotaResult.used, quotaResult.limit);
        }
      });

      const channelProfile = await step.run("load-channel-profile", async () => {
        const { db } = await import("@/server/db");
        const { channelProfiles } = await import("@/server/db/schema");
        const { eq } = await import("drizzle-orm");

        const rows = await db
          .select()
          .from(channelProfiles)
          .where(eq(channelProfiles.channelId, channelId))
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
        const { GoogleClient } = await import("@/lib/ai/google");
        const { GenerationEngine } = await import("@/lib/ai/generation-engine");
        const { parseUrl } = await import("@/lib/sources/url-parser");

        const client = new GoogleClient();
        const engine = new GenerationEngine(client);

        const sourceType = contentItem.sourceUrl ? parseUrl(contentItem.sourceUrl).type : "article";

        return engine.generate({
          type: "source_to_telegram",
          sourceContent: contentItem.content ?? "",
          channelProfile: channelProfile ?? undefined,
          options: { sourceType, numVariations: POSTS_PER_SOURCE },
        });
      });

      const childIds = await step.run("store-children", async () => {
        const { db } = await import("@/server/db");
        const { contentLibrary } = await import("@/server/db/schema");
        const { eq } = await import("drizzle-orm");

        const posts = Array.isArray(result.content) ? result.content : [result.content];

        const childRows = posts.map((postContent, index) => ({
          userId,
          parentId: contentItemId,
          title: `${contentItem.title ?? "Generated"} #${index + 1}`,
          content: postContent,
          sourceType: "ai_generated" as const,
          status: "draft" as const,
          channelId: contentItem.channelId,
          sourceUrl: contentItem.sourceUrl,
        }));

        const inserted = await db.insert(contentLibrary).values(childRows).returning({
          id: contentLibrary.id,
        });

        await db
          .update(contentLibrary)
          .set({
            status: "archived",
            updatedAt: new Date(),
          })
          .where(eq(contentLibrary.id, contentItemId));

        return inserted.map((row) => row.id);
      });

      await step.run("track-usage", async () => {
        const { incrementAiUsage } = await import("@/lib/billing/ai-quota");
        await incrementAiUsage(userId);
      });

      await step.run("mark-source-completed", async () => {
        if (!sourceId) return;

        const { db } = await import("@/server/db");
        const { externalSources } = await import("@/server/db/schema");
        const { and, eq } = await import("drizzle-orm");

        await db
          .update(externalSources)
          .set({
            processingStatus: "completed",
            errorMessage: null,
            updatedAt: new Date(),
          })
          .where(and(eq(externalSources.id, sourceId), eq(externalSources.userId, userId)));
      });

      return {
        status: "completed",
        contentItemId,
        childIds,
        modelUsed: result.modelUsed,
        tokenUsage: result.tokenUsage,
      };
    } catch (error) {
      await step.run("mark-source-failed", async () => {
        if (!sourceId) return;

        const { db } = await import("@/server/db");
        const { externalSources } = await import("@/server/db/schema");
        const { and, eq } = await import("drizzle-orm");

        await db
          .update(externalSources)
          .set({
            processingStatus: "failed",
            errorMessage: error instanceof Error ? error.message : "Failed to generate from source",
            updatedAt: new Date(),
          })
          .where(and(eq(externalSources.id, sourceId), eq(externalSources.userId, userId)));
      });

      throw error;
    }
  },
);
