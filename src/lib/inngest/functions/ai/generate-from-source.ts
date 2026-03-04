import { inngest } from "@/lib/inngest/client";

interface GenerateFromSourceEvent {
  data: {
    contentItemId: string;
    userId: string;
    channelId: string;
  };
}

export const generateFromSource = inngest.createFunction(
  {
    id: "ai/generate-from-source",
    retries: 2,
  },
  { event: "ai/content.generate-from-source" },
  async ({ event, step }) => {
    const { contentItemId, userId, channelId } = (event as GenerateFromSourceEvent).data;

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
      const { OpenRouterClient } = await import("@/lib/ai/openrouter");
      const { GenerationEngine } = await import("@/lib/ai/generation-engine");

      const client = new OpenRouterClient();
      const engine = new GenerationEngine(client);

      return engine.generate({
        type: "source_to_telegram",
        sourceContent: contentItem.content ?? "",
        channelProfile: channelProfile ?? undefined,
        options: {},
      });
    });

    await step.run("store-result", async () => {
      const { db } = await import("@/server/db");
      const { contentLibrary } = await import("@/server/db/schema");
      const { eq } = await import("drizzle-orm");

      const generatedContent = Array.isArray(result.content)
        ? result.content.join("\n\n")
        : result.content;

      await db
        .update(contentLibrary)
        .set({
          content: generatedContent,
          status: "draft",
          updatedAt: new Date(),
        })
        .where(eq(contentLibrary.id, contentItemId))
        .returning({ id: contentLibrary.id });
    });

    await step.run("track-usage", async () => {
      const { incrementAiUsage } = await import("@/lib/billing/ai-quota");
      await incrementAiUsage(userId);
    });

    return {
      status: "completed",
      contentItemId,
      modelUsed: result.modelUsed,
      tokenUsage: result.tokenUsage,
    };
  },
);
