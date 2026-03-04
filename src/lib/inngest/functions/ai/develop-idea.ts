import { inngest } from "@/lib/inngest/client";

interface DevelopIdeaEvent {
  data: {
    contentId: string;
    userId: string;
    channelId: string | null;
  };
}

export const developIdea = inngest.createFunction(
  {
    id: "ai/develop-idea",
    retries: 2,
  },
  { event: "ai/content.develop-idea" },
  async ({ event, step }) => {
    const { contentId, userId, channelId } = (event as DevelopIdeaEvent).data;

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
        title: row.title,
        content: row.content,
        sourceType: row.sourceType,
        channelId: row.channelId,
      };
    });

    await step.run("check-quota", async () => {
      const { enforceAiQuota } = await import("@/lib/billing/ai-quota");

      const result = await enforceAiQuota(userId);
      if (!result.allowed) {
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

    const _recentDraftTitles = await step.run("load-recent-drafts", async () => {
      const resolvedChannelId = channelId ?? content.channelId;
      if (!resolvedChannelId) return [];

      const { db } = await import("@/server/db");
      const { contentLibrary } = await import("@/server/db/schema");
      const { eq, and, desc } = await import("drizzle-orm");

      const rows = await db
        .select({ id: contentLibrary.id, title: contentLibrary.title })
        .from(contentLibrary)
        .where(
          and(eq(contentLibrary.channelId, resolvedChannelId), eq(contentLibrary.status, "draft")),
        )
        .orderBy(desc(contentLibrary.createdAt))
        .limit(5);

      return rows.map((r) => r.title).filter((t): t is string => t != null);
    });

    const generationResult = await step.run("generate", async () => {
      const { OpenRouterClient } = await import("@/lib/ai/openrouter");
      const { GenerationEngine } = await import("@/lib/ai/generation-engine");

      const client = new OpenRouterClient();
      const engine = new GenerationEngine(client);

      return engine.generate({
        type: "idea_to_draft",
        sourceContent: content.content ?? "",
        channelProfile: channelProfile ?? undefined,
        options: {},
      });
    });

    await step.run("update-content", async () => {
      const { db } = await import("@/server/db");
      const { contentLibrary } = await import("@/server/db/schema");
      const { eq } = await import("drizzle-orm");

      const generatedText = Array.isArray(generationResult.content)
        ? generationResult.content.join("\n\n")
        : generationResult.content;

      await db
        .update(contentLibrary)
        .set({
          content: generatedText,
          sourceType: "ai_generated",
          status: "draft",
          updatedAt: new Date(),
        })
        .where(eq(contentLibrary.id, contentId));
    });

    await step.run("track-usage", async () => {
      const { incrementAiUsage } = await import("@/lib/billing/ai-quota");
      await incrementAiUsage(userId);
    });

    return {
      status: "completed",
      contentId,
      modelUsed: generationResult.modelUsed,
      tokenUsage: generationResult.tokenUsage,
    };
  },
);
