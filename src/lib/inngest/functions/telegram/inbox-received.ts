import { inngest } from "@/lib/inngest/client";

interface TelegramInboxReceivedEvent {
  data: {
    contentId: string;
    userId: string;
    telegramUserId: string;
    telegramChatId: string;
    messageId: number;
  };
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

    return {
      status: "completed",
      contentId,
      userId,
      telegramUserId,
      telegramChatId,
      messageId,
      isBotInboxIdea,
    };
  },
);
