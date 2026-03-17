import { inngest } from "@/lib/inngest/client";
import type { CalendarFillSuggestion } from "@/lib/ai/types";

function parseJsonArray(content: string): unknown[] {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
  const normalized = fenceMatch ? fenceMatch[1]!.trim() : trimmed;
  const parsed = JSON.parse(normalized);
  return Array.isArray(parsed) ? parsed : [];
}

function normalizeSuggestions(raw: unknown[]): CalendarFillSuggestion[] {
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const sourceType = item.sourceType;
      const normalizedSourceType: CalendarFillSuggestion["sourceType"] =
        sourceType === "draft" || sourceType === "idea" || sourceType === "repurpose"
          ? sourceType
          : "idea";

      return {
        date: typeof item.date === "string" ? item.date : "",
        suggestedContent: typeof item.suggestedContent === "string" ? item.suggestedContent : "",
        sourceType: normalizedSourceType,
        confidence:
          typeof item.confidence === "number" ? Math.max(0, Math.min(1, item.confidence)) : 0.5,
      };
    })
    .filter((item) => item.date.length > 0 && item.suggestedContent.length > 0);
}

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

    const recentTopics = existingContent
      .slice(0, 10)
      .flatMap((title) =>
        title
          .toLowerCase()
          .split(/[^a-zA-Zа-яА-Я0-9+#]+/)
          .map((chunk) => chunk.trim())
          .filter((chunk) => chunk.length >= 4),
      )
      .filter((value, index, all) => all.indexOf(value) === index)
      .slice(0, 20);

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

    const cacheKey = await step.run("build-cache-key", async () => {
      const { createPromptCacheKey } = await import("@/lib/ai/prompt-cache");
      return createPromptCacheKey({
        channelId,
        startDate,
        endDate,
        gapDates,
        existingContent,
        recentTopics,
        channelProfile,
      });
    });

    const cachedSuggestions = await step.run("load-cache", async () => {
      const { readPromptCache } = await import("@/lib/ai/prompt-cache");
      return readPromptCache<CalendarFillSuggestion[]>({
        userId,
        feature: "calendar_fill",
        cacheKey,
      });
    });

    if (!cachedSuggestions) {
      await step.run("check-quota", async () => {
        const { enforceAiQuota } = await import("@/lib/billing/ai-quota");
        const result = await enforceAiQuota(userId);
        if (!result.allowed) {
          throw new Error(`AI quota exceeded: ${result.used}/${result.limit}`);
        }
      });
    }

    const generation = await step.run("generate-suggestions", async () => {
      if (cachedSuggestions) {
        return {
          suggestions: cachedSuggestions,
          cacheHit: true,
          modelUsed: null,
          tokenUsage: null,
        };
      }

      const { GoogleClient } = await import("@/lib/ai/google");
      const { GenerationEngine } = await import("@/lib/ai/generation-engine");
      const { writePromptCache } = await import("@/lib/ai/prompt-cache");

      const client = new GoogleClient();
      const engine = new GenerationEngine(client);

      const result = await engine.generate({
        type: "calendar_fill",
        sourceContent: JSON.stringify({
          gapDates,
          existingContent,
          recentTopics,
        }),
        channelProfile: channelProfile ?? undefined,
      });

      const content = typeof result.content === "string" ? result.content : result.content[0];
      let suggestions: CalendarFillSuggestion[] = [];
      try {
        const parsed = parseJsonArray(content ?? "[]");
        suggestions = normalizeSuggestions(parsed);
      } catch {
        suggestions = [];
      }

      if (suggestions.length > 0) {
        await writePromptCache({
          userId,
          feature: "calendar_fill",
          cacheKey,
          modelId: result.modelUsed,
          response: suggestions,
          ttlSeconds: 6 * 60 * 60,
        });
      }

      return {
        suggestions,
        cacheHit: false,
        modelUsed: result.modelUsed,
        tokenUsage: result.tokenUsage,
      };
    });

    const normalizedGenerationSuggestions = normalizeSuggestions(
      Array.isArray(generation.suggestions) ? generation.suggestions : [],
    );

    await step.run("store-suggestions", async () => {
      const { db } = await import("@/server/db");
      const { contentLibrary } = await import("@/server/db/schema");

      for (const suggestion of normalizedGenerationSuggestions) {
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
      if (generation.cacheHit) {
        return;
      }

      const { incrementAiUsage } = await import("@/lib/billing/ai-quota");
      const { recordAiTelemetry } = await import("@/lib/ai/telemetry");

      await incrementAiUsage(userId);
      if (generation.modelUsed && generation.tokenUsage) {
        await recordAiTelemetry({
          userId,
          channelId,
          feature: "calendar_fill",
          modelId: generation.modelUsed,
          tokenUsage: generation.tokenUsage,
          metadata: {
            gapCount: gapDates.length,
            cached: false,
          },
        });
      }
    });

    return {
      status: "completed",
      suggestionsCount: normalizedGenerationSuggestions.length,
      gapDates,
      cacheHit: generation.cacheHit,
    };
  },
);
