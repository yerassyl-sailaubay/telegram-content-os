import { inngest } from "@/lib/inngest/client";

interface TelegramInboxReceivedEvent {
  data: {
    contentId: string;
    userId: string;
    telegramUserId: string;
    telegramChatId: string;
    messageId: number;
    captureType?: "text" | "voice";
  };
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildTitleFromText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Voice note draft";
  }

  if (normalized.length <= 80) {
    return normalized;
  }

  return `${normalized.slice(0, 77).trimEnd()}...`;
}

function getVoiceReadyText(): string {
  return "Done. I saved both the polished draft and the raw transcription in the app.";
}

function getAiQuotaExceededText(): string {
  return "AI quota reached for this month. Upgrade in billing to process more voice notes.";
}

export const telegramInboxReceived = inngest.createFunction(
  {
    id: "telegram/inbox-received",
    retries: 1,
  },
  { event: "telegram/inbox.received" },
  async ({ event, step }) => {
    const { contentId, userId, telegramUserId, telegramChatId, messageId } =
      event.data as TelegramInboxReceivedEvent["data"];

    const content = await step.run("load-inbox-content", async () => {
      const { db } = await import("@/server/db");
      const { contentLibrary } = await import("@/server/db/schema");
      const { and, eq } = await import("drizzle-orm");

      const rows = await db
        .select({
          id: contentLibrary.id,
          sourceType: contentLibrary.sourceType,
          sourceMetadata: contentLibrary.sourceMetadata,
          title: contentLibrary.title,
          content: contentLibrary.content,
        })
        .from(contentLibrary)
        .where(
          and(
            eq(contentLibrary.id, contentId),
            eq(contentLibrary.userId, userId),
            eq(contentLibrary.sourceType, "idea"),
          ),
        )
        .limit(1);

      return rows[0] ?? null;
    });

    if (!content) {
      return {
        status: "skipped",
        reason: "Inbox content not found",
        contentId,
      };
    }

    const metadata = (content.sourceMetadata ?? {}) as Record<string, unknown>;
    const isBotInboxIdea = metadata.telegramCaptureType === "bot_inbox";
    const isVoiceCapture = metadata.telegramCaptureType === "bot_inbox_voice";

    if (!isVoiceCapture) {
      return {
        status: "completed",
        contentId,
        userId,
        telegramUserId,
        telegramChatId,
        messageId,
        isBotInboxIdea,
      };
    }

    if (toNonEmptyString(metadata.voiceDraftReadyAt)) {
      return {
        status: "completed",
        contentId,
        userId,
        telegramUserId,
        telegramChatId,
        messageId,
        isBotInboxIdea,
        voiceProcessed: true,
        alreadyProcessed: true,
      };
    }

    const voiceFileId = toNonEmptyString(metadata.telegramVoiceFileId);
    if (!voiceFileId) {
      return {
        status: "skipped",
        reason: "Voice inbox content missing telegramVoiceFileId",
        contentId,
      };
    }

    const quotaCheck = await step.run("check-ai-quota", async () => {
      const { enforceAiQuota } = await import("@/lib/billing/ai-quota");
      return enforceAiQuota(userId);
    });

    if (!quotaCheck.allowed) {
      await step.run("notify-ai-quota-exceeded", async () => {
        const { getTelegramClient } = await import("@/lib/telegram/client");
        const client = getTelegramClient();
        await client.sendMessage(telegramChatId, getAiQuotaExceededText());
      });

      return {
        status: "skipped",
        reason: "AI quota exceeded",
        contentId,
      };
    }

    const voiceResult = await step.run("transcribe-and-polish-voice", async () => {
      const { downloadTelegramVoiceFileById } = await import("@/lib/telegram/voice-notes");
      const { transcribeVoiceNoteToPost } = await import("@/lib/ai/voice-to-post");

      const voiceFile = await downloadTelegramVoiceFileById(voiceFileId, {
        fallbackMimeType: toNonEmptyString(metadata.telegramVoiceMimeType) ?? "audio/ogg",
      });

      const result = await transcribeVoiceNoteToPost({
        audioBuffer: voiceFile.bytes,
        mimeType: voiceFile.mimeType,
        caption: toNonEmptyString(content.content),
      });

      return {
        ...result,
        filePath: voiceFile.filePath,
      };
    });

    const draftTitle = buildTitleFromText(voiceResult.title || voiceResult.polishedPost);

    await step.run("save-voice-draft", async () => {
      const { db } = await import("@/server/db");
      const { contentLibrary } = await import("@/server/db/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(contentLibrary)
        .set({
          title: draftTitle,
          content: voiceResult.polishedPost || voiceResult.transcript,
          sourceType: "ai_generated",
          sourceMetadata: {
            ...metadata,
            voiceTranscript: voiceResult.transcript,
            voicePolishedPost: voiceResult.polishedPost,
            voiceModelUsed: voiceResult.modelUsed,
            voiceTokenUsage: voiceResult.tokenUsage,
            voiceFilePath: voiceResult.filePath,
            voiceDraftReadyAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(contentLibrary.id, contentId));
    });

    await step.run("track-voice-ai-usage", async () => {
      const { incrementAiUsage } = await import("@/lib/billing/ai-quota");
      const { recordAiTelemetry } = await import("@/lib/ai/telemetry");

      await incrementAiUsage(userId);
      await recordAiTelemetry({
        userId,
        contentId,
        feature: "voice_note_to_post",
        modelId: voiceResult.modelUsed,
        tokenUsage: voiceResult.tokenUsage,
        metadata: {
          telegramMessageId: messageId,
          telegramChatId,
          voiceFileId,
        },
      });
    });

    await step.run("notify-voice-ready", async () => {
      const { getTelegramClient } = await import("@/lib/telegram/client");
      const client = getTelegramClient();
      await client.sendMessage(telegramChatId, getVoiceReadyText());
    });

    return {
      status: "completed",
      contentId,
      userId,
      telegramUserId,
      telegramChatId,
      messageId,
      isBotInboxIdea,
      voiceProcessed: true,
    };
  },
);
