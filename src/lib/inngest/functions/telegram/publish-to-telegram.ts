import { inngest } from "@/lib/inngest/client";

interface PublishToTelegramEvent {
  data: {
    contentId: string;
    userId: string;
    channelId: string;
    scheduledAt?: string;
  };
}

type ContentFormat = "text" | "photo" | "media_group" | "poll";

const IMAGE_URL_RE = /https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp)(?:\?\S*)?/gi;
const POLL_PREFIX = "POLL:";

const MARKDOWN_V2_ESCAPE_RE = /([_*\[\]()~`>#+\-=|{}.!\\])/g;

export function escapeMarkdownV2(text: string): string {
  return text.replace(MARKDOWN_V2_ESCAPE_RE, "\\$1");
}

function detectFormat(content: string): {
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

  const imageUrls = content.match(IMAGE_URL_RE) ?? [];

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
    const { contentId, channelId } = (event as PublishToTelegramEvent).data;

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

      return { id: row.id, text: row.content ?? "", status: row.status };
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
      return {
        chatId: row.telegramChatId,
        botToken: row.botTokenEncrypted as string,
      };
    });

    const detected = await step.run("detect-format", async () => {
      return detectFormat(content.text);
    });

    await step.run("publish", async () => {
      const { TelegramClient } = await import("@/lib/telegram/client");

      const client = new TelegramClient(channel.botToken);
      const chatId = channel.chatId;

      switch (detected.format) {
        case "text": {
          const escaped = escapeMarkdownV2(content.text);
          await client.sendMessage(chatId, escaped, { parse_mode: "MarkdownV2" });
          break;
        }
        case "photo": {
          const caption = stripImageUrls(content.text, detected.imageUrls);
          const escaped = escapeMarkdownV2(caption);
          await client.sendPhoto(chatId, detected.imageUrls[0]!, {
            caption: escaped,
            parse_mode: "MarkdownV2",
          });
          break;
        }
        case "media_group": {
          const caption = stripImageUrls(content.text, detected.imageUrls);
          const escaped = escapeMarkdownV2(caption);
          const media = detected.imageUrls.map((url, i) => ({
            type: "photo" as const,
            media: url,
            ...(i === 0 ? { caption: escaped, parse_mode: "MarkdownV2" as const } : {}),
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

    await step.run("update-status", async () => {
      const { db } = await import("@/server/db");
      const { contentLibrary } = await import("@/server/db/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(contentLibrary)
        .set({ status: "published", updatedAt: new Date() })
        .where(eq(contentLibrary.id, contentId));
    });

    return {
      status: "published",
      contentId,
      channelId,
      format: detected.format,
    };
  },
);
