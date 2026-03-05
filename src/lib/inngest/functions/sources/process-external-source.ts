import { inngest } from "@/lib/inngest/client";
import type { ExtractionResult } from "@/lib/sources/types";

interface UrlSubmittedEvent {
  data: {
    url: string;
    userId: string;
    channelId: string;
  };
}

export const processExternalSource = inngest.createFunction(
  {
    id: "sources/process-external-source",
    retries: 2,
  },
  { event: "sources/url.submitted" },
  async ({ event, step }) => {
    const { url, userId, channelId } = (event as UrlSubmittedEvent).data;

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

    await step.sendEvent("emit-generate", {
      name: "ai/content.generate-from-source",
      data: {
        contentItemId,
        userId,
        channelId,
      },
    });

    return {
      status: "completed",
      contentItemId,
      sourceType: parsed.type,
    };
  },
);
