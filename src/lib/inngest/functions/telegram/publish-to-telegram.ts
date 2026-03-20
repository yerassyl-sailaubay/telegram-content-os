import { inngest } from "@/lib/inngest/client";
import {
  prepareTelegramTextForSend,
  readTelegramComposerMetadata,
} from "@/lib/telegram/formatting";

interface PublishToTelegramEvent {
  data: {
    contentId: string;
    userId: string;
    channelId: string;
    scheduleId?: string;
    scheduledAt?: string;
  };
}

type ContentFormat = "text" | "photo" | "media_group" | "poll";

const IMAGE_URL_RE = /https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp)(?:\?\S*)?/gi;
const POLL_PREFIX = "POLL:";

function detectFormat(
  content: string,
  imageUrlFromMetadata: string | null,
): {
  format: ContentFormat;
  imageUrls: string[];
  pollData: { question: string; options: string[] } | null;
} {
  if (content.startsWith(POLL_PREFIX)) {
    try {
      const json = JSON.parse(content.slice(POLL_PREFIX.length));
      if (json.question && Array.isArray(json.options)) {
        return { format: "poll", imageUrls: [], pollData: json };
      }
    } catch {
      /* invalid poll JSON — treat as regular text */
    }
  }

  const imageUrlsFromContent = content.match(IMAGE_URL_RE) ?? [];
  const mergedImageUrls = new Set(imageUrlsFromContent);
  if (imageUrlFromMetadata) {
    mergedImageUrls.add(imageUrlFromMetadata);
  }
  const imageUrls = [...mergedImageUrls];

  if (imageUrls.length > 1) {
    return { format: "media_group", imageUrls, pollData: null };
  }
  if (imageUrls.length === 1) {
    return { format: "photo", imageUrls, pollData: null };
  }

  return { format: "text", imageUrls: [], pollData: null };
}

function stripImageUrls(text: string, imageUrls: string[]): string {
  let cleaned = text;
  for (const url of imageUrls) {
    cleaned = cleaned.replace(url, "");
  }
  return cleaned.trim();
}

const PUBLISHABLE_STATUSES = new Set(["draft", "scheduled"]);

export const publishToTelegram = inngest.createFunction(
  {
    id: "telegram/publish-to-telegram",
    retries: 2,
  },
  { event: "telegram/post.publish" },
  async ({ event, step }) => {
    const { contentId, channelId, scheduleId } = (event as PublishToTelegramEvent).data;

    try {
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
        if (!PUBLISHABLE_STATUSES.has(row.status ?? "")) {
          throw new Error(`Cannot publish content with status '${row.status}'`);
        }

        const composerMetadata = readTelegramComposerMetadata(row.sourceMetadata);

        return {
          id: row.id,
          text: row.content ?? "",
          status: row.status,
          parseMode: composerMetadata.parseMode,
          imageUrl: composerMetadata.imageUrl,
        };
      });

      const channel = await step.run("load-channel", async () => {
        const { db } = await import("@/server/db");
        const { telegramChannels } = await import("@/server/db/schema");
        const { eq } = await import("drizzle-orm");

        const rows = await db
          .select()
          .from(telegramChannels)
          .where(eq(telegramChannels.id, channelId))
          .limit(1);

        if (rows.length === 0) {
          throw new Error(`Telegram channel ${channelId} not found`);
        }

        const row = rows[0]!;
        let botToken: string | undefined;

        if (row.botTokenEncrypted) {
          try {
            const { decrypt } = await import("@/lib/platforms/encryption");
            botToken = decrypt(row.botTokenEncrypted);
          } catch {
            // Backward compatibility for older plaintext values.
            botToken = row.botTokenEncrypted;
          }
        }

        if (!botToken) {
          botToken = process.env.TELEGRAM_BOT_TOKEN;
        }

        if (!botToken) {
          throw new Error("Telegram bot token is not configured");
        }

        return {
          chatId: row.telegramChatId,
          botToken,
        };
      });

      if (scheduleId) {
        await step.run("mark-schedule-processing", async () => {
          const { db } = await import("@/server/db");
          const { schedules } = await import("@/server/db/schema");
          const { eq } = await import("drizzle-orm");

          await db
            .update(schedules)
            .set({ status: "processing", updatedAt: new Date() })
            .where(eq(schedules.id, scheduleId));
        });
      }

      const detected = await step.run("detect-format", async () => {
        return detectFormat(content.text, content.imageUrl);
      });

      await step.run("publish", async () => {
        const { getTelegramClient } = await import("@/lib/telegram/client");

        const client = getTelegramClient(channel.botToken);
        const chatId = channel.chatId;

        switch (detected.format) {
          case "text": {
            const preparedText = prepareTelegramTextForSend(content.text, content.parseMode);
            if (preparedText.parseMode) {
              await client.sendMessage(chatId, preparedText.text, {
                parse_mode: preparedText.parseMode,
              });
            } else {
              await client.sendMessage(chatId, preparedText.text);
            }
            break;
          }
          case "photo": {
            const caption = stripImageUrls(content.text, detected.imageUrls);
            const preparedCaption = prepareTelegramTextForSend(caption, content.parseMode);
            const photoOptions: { caption?: string; parse_mode?: "HTML" | "MarkdownV2" } = {};
            if (preparedCaption.text) {
              photoOptions.caption = preparedCaption.text;
              if (preparedCaption.parseMode) {
                photoOptions.parse_mode = preparedCaption.parseMode;
              }
            }

            await client.sendPhoto(
              chatId,
              detected.imageUrls[0]!,
              Object.keys(photoOptions).length > 0 ? photoOptions : undefined,
            );
            break;
          }
          case "media_group": {
            const caption = stripImageUrls(content.text, detected.imageUrls);
            const preparedCaption = prepareTelegramTextForSend(caption, content.parseMode);
            const media = detected.imageUrls.map((url, i) => ({
              type: "photo" as const,
              media: url,
              ...(i === 0 && preparedCaption.text
                ? {
                    caption: preparedCaption.text,
                    ...(preparedCaption.parseMode ? { parse_mode: preparedCaption.parseMode } : {}),
                  }
                : {}),
            }));
            await client.sendMediaGroup(chatId, media);
            break;
          }
          case "poll": {
            const { question, options } = detected.pollData!;
            await client.sendPoll(chatId, question, options);
            break;
          }
        }
      });

      await step.run("update-content-status", async () => {
        const { db } = await import("@/server/db");
        const { contentLibrary } = await import("@/server/db/schema");
        const { eq } = await import("drizzle-orm");

        await db
          .update(contentLibrary)
          .set({ status: "published", updatedAt: new Date() })
          .where(eq(contentLibrary.id, contentId));
      });

      if (scheduleId) {
        await step.run("mark-schedule-completed", async () => {
          const { db } = await import("@/server/db");
          const { schedules } = await import("@/server/db/schema");
          const { eq } = await import("drizzle-orm");

          await db
            .update(schedules)
            .set({
              status: "completed",
              processedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(schedules.id, scheduleId));
        });
      }

      return {
        status: "published",
        contentId,
        channelId,
        scheduleId,
        format: detected.format,
      };
    } catch (error) {
      if (scheduleId) {
        await step.run("mark-schedule-failed", async () => {
          const { db } = await import("@/server/db");
          const { schedules } = await import("@/server/db/schema");
          const { eq } = await import("drizzle-orm");

          await db
            .update(schedules)
            .set({ status: "failed", updatedAt: new Date() })
            .where(eq(schedules.id, scheduleId));
        });
      }

      throw error;
    }
  },
);
