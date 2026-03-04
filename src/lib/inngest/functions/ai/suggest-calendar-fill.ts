import { inngest } from "@/lib/inngest/client";
import type { CalendarFillSuggestion } from "@/lib/ai/types";

interface SuggestCalendarFillEvent {
  data: {
    channelId: string;
    userId: string;
    startDate: string;
    endDate: string;
  };
}

export const suggestCalendarFill = inngest.createFunction(
  {
    id: "ai/suggest-calendar-fill",
    retries: 2,
  },
  { event: "ai/calendar.suggest-fill" },
  async ({ event, step }) => {
    const { channelId, userId, startDate, endDate } = (event as SuggestCalendarFillEvent).data;

    const gapDates = await step.run("detect-gaps", async () => {
      const { detectCalendarGaps } = await import("@/lib/scheduling/calendar-gaps");
      return detectCalendarGaps(channelId, startDate, endDate);
    });

    if (gapDates.length === 0) {
      return { status: "completed", suggestionsCount: 0, gapDates: [] };
    }

    const existingContent = await step.run("load-existing-content", async () => {
      const { db } = await import("@/server/db");
      const { contentLibrary } = await import("@/server/db/schema");
      const { eq, and, desc } = await import("drizzle-orm");

      const items = await db
        .select({ title: contentLibrary.title })
        .from(contentLibrary)
        .where(and(eq(contentLibrary.channelId, channelId)))
        .orderBy(desc(contentLibrary.createdAt))
        .limit(20);

      return items.map((i) => i.title).filter(Boolean) as string[];
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

    await step.run("check-quota", async () => {
      const { enforceAiQuota } = await import("@/lib/billing/ai-quota");
      const result = await enforceAiQuota(userId);
      if (!result.allowed) {
        throw new Error(`AI quota exceeded: ${result.used}/${result.limit}`);
      }
    });

    const suggestions = await step.run("generate-suggestions", async () => {
      const { GoogleClient } = await import("@/lib/ai/google");
      const { GenerationEngine } = await import("@/lib/ai/generation-engine");

      const client = new GoogleClient();
      const engine = new GenerationEngine(client);

      const result = await engine.generate({
        type: "calendar_fill",
        sourceContent: JSON.stringify({
          gapDates,
          existingContent,
          recentTopics: [],
        }),
        channelProfile: channelProfile ?? undefined,
      });

      const content = typeof result.content === "string" ? result.content : result.content[0];
      return JSON.parse(content ?? "[]") as CalendarFillSuggestion[];
    });

    await step.run("store-suggestions", async () => {
      const { db } = await import("@/server/db");
      const { contentLibrary } = await import("@/server/db/schema");

      for (const suggestion of suggestions) {
        await db.insert(contentLibrary).values({
          userId,
          title: suggestion.suggestedContent,
          content: suggestion.suggestedContent,
          sourceType: "idea",
          status: "draft",
          channelId,
          sourceMetadata: {
            date: suggestion.date,
            confidence: suggestion.confidence,
            generatedBy: "calendar-fill",
          },
        });
      }
    });

    await step.run("track-usage", async () => {
      const { incrementAiUsage } = await import("@/lib/billing/ai-quota");
      await incrementAiUsage(userId);
    });

    return {
      status: "completed",
      suggestionsCount: suggestions.length,
      gapDates,
    };
  },
);
