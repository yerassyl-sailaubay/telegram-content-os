import { inngest } from "@/lib/inngest/client";
import type { ExtractionResult } from "@/lib/sources/types";

interface UrlSubmittedEvent {
  data: {
    url: string;
    userId: string;
    channelId: string;
    sourceId?: string;
  };
}

export const processExternalSource = inngest.createFunction(
  {
    id: "sources/process-external-source",
    retries: 2,
  },
  { event: "sources/url.submitted" },
  async ({ event, step }) => {
    const { url, userId, channelId, sourceId } = (event as UrlSubmittedEvent).data;

    await step.run("mark-extracting", async () => {
      if (!sourceId) return;

      const { db } = await import("@/server/db");
      const { externalSources } = await import("@/server/db/schema");
      const { and, eq } = await import("drizzle-orm");

      await db
        .update(externalSources)
        .set({
          processingStatus: "extracting",
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(and(eq(externalSources.id, sourceId), eq(externalSources.userId, userId)));
    });

    try {
      const parsed = await step.run("parse-url", async () => {
        const { parseUrl } = await import("@/lib/sources/url-parser");
        return parseUrl(url);
      });

      const extraction: ExtractionResult = await step.run("extract-content", async () => {
        if (parsed.type === "youtube") {
          if (!parsed.videoId) {
            throw new Error(`Could not extract video ID from YouTube URL: ${url}`);
          }
          const { extractYouTubeTranscript } = await import("@/lib/sources/youtube");
          return extractYouTubeTranscript(parsed.videoId);
        }

        if (parsed.type === "article") {
          const { extractArticle } = await import("@/lib/sources/article");
          return extractArticle(parsed.url);
        }

        throw new Error(`Unsupported source type: unknown for URL ${url}`);
      });

      const contentItemId = await step.run("store-content", async () => {
        const { createContentItem } = await import("@/server/actions/content");

        const result = await createContentItem({
          title: (extraction.metadata.title as string) ?? "Untitled",
          content: extraction.content,
          sourceType: "external_source",
          status: "draft",
          channelId,
          sourceUrl: parsed.url,
          sourceMetadata: extraction.metadata as Record<string, unknown>,
        });

        if (!result.success) {
          throw new Error(`Failed to store content: ${result.error}`);
        }

        return result.data.id;
      });

      await step.run("mark-extracted", async () => {
        if (!sourceId) return;

        const { db } = await import("@/server/db");
        const { externalSources } = await import("@/server/db/schema");
        const { and, eq } = await import("drizzle-orm");

        await db
          .update(externalSources)
          .set({
            processingStatus: "extracted",
            title: (extraction.metadata.title as string) ?? null,
            extractedText: extraction.content,
            extractedMetadata: extraction.metadata as Record<string, unknown>,
            linkedDraftId: contentItemId,
            errorMessage: null,
            updatedAt: new Date(),
          })
          .where(and(eq(externalSources.id, sourceId), eq(externalSources.userId, userId)));
      });

      await step.run("mark-generating", async () => {
        if (!sourceId) return;

        const { db } = await import("@/server/db");
        const { externalSources } = await import("@/server/db/schema");
        const { and, eq } = await import("drizzle-orm");

        await db
          .update(externalSources)
          .set({
            processingStatus: "generating",
            errorMessage: null,
            updatedAt: new Date(),
          })
          .where(and(eq(externalSources.id, sourceId), eq(externalSources.userId, userId)));
      });

      await step.sendEvent("emit-generate", {
        name: "ai/content.generate-from-source",
        data: {
          contentItemId,
          userId,
          channelId,
          ...(sourceId ? { sourceId } : {}),
        },
      });

      return {
        status: "completed",
        contentItemId,
        sourceType: parsed.type,
      };
    } catch (error) {
      await step.run("mark-failed", async () => {
        if (!sourceId) return;

        const { db } = await import("@/server/db");
        const { externalSources } = await import("@/server/db/schema");
        const { and, eq } = await import("drizzle-orm");

        await db
          .update(externalSources)
          .set({
            processingStatus: "failed",
            errorMessage: error instanceof Error ? error.message : "Failed to process source",
            updatedAt: new Date(),
          })
          .where(and(eq(externalSources.id, sourceId), eq(externalSources.userId, userId)));
      });

      throw error;
    }
  },
);
