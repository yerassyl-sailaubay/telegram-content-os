/**
 * POST /api/telegram/webhook
 *
 * Receives Telegram webhook updates, verifies the secret token,
 * stores incoming channel posts in the DB, and fires Inngest events.
 *
 * Media-group batching: Telegram sends album posts as separate messages
 * sharing the same `media_group_id`. We batch them within a 1-second
 * window into a single `telegram_posts` record.
 *
 * DB and Inngest imports are lazy (dynamic) so the module can be
 * evaluated at build time without requiring DATABASE_URL.
 */

import { NextRequest, NextResponse } from "next/server";
import type { TelegramUpdate, TelegramMessage } from "@/lib/telegram/types";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Lazy imports — avoid eager DB connection at build time
// ---------------------------------------------------------------------------

async function getDb() {
  const { db } = await import("@/server/db");
  return db;
}

async function getSchema() {
  const schema = await import("@/server/db/schema");
  return schema;
}

async function getInngest() {
  const { inngest } = await import("@/lib/inngest/client");
  return inngest;
}

async function getEq() {
  const { eq } = await import("drizzle-orm");
  return eq;
}

async function getDrizzleOps() {
  const { eq, and, gt, isNull } = await import("drizzle-orm");
  return { eq, and, gt, isNull };
}

// ---------------------------------------------------------------------------
// Media-group batching
// ---------------------------------------------------------------------------

/**
 * In-memory map: media_group_id → { timer, channelDbId, messages[] }.
 * After 1 s of inactivity for a group, we flush to DB.
 */
interface MediaGroupBatch {
  timer: ReturnType<typeof setTimeout>;
  channelDbId: string;
  telegramChatId: string;
  messages: TelegramMessage[];
}

const mediaGroupBatches = new Map<string, MediaGroupBatch>();

const MEDIA_GROUP_WINDOW_MS = 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Constant-time comparison of two strings.
 * Prevents timing attacks on webhook secret verification.
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to avoid leaking length via timing
    const encoder = new TextEncoder();
    const bufA = encoder.encode(a);
    const bufB = encoder.encode(a); // intentionally compare a with itself
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto") as typeof import("crypto");
    crypto.timingSafeEqual(bufA, bufB);
    return false;
  }

  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Extract media file IDs from a Telegram message for storage.
 */
function extractMediaUrls(message: TelegramMessage): string[] {
  const urls: string[] = [];

  if (message.photo && message.photo.length > 0) {
    // Take the largest photo (last in array)
    const largest = message.photo[message.photo.length - 1];
    if (largest) {
      urls.push(largest.file_id);
    }
  }

  if (message.video) {
    urls.push(message.video.file_id);
  }

  if (message.document) {
    urls.push(message.document.file_id);
  }

  if (message.audio) {
    urls.push(message.audio.file_id);
  }

  if (message.voice) {
    urls.push(message.voice.file_id);
  }

  if (message.animation) {
    urls.push(message.animation.file_id);
  }

  return urls;
}

/**
 * Build structured content_parsed from a message.
 */
function buildContentParsed(message: TelegramMessage): Record<string, unknown> {
  return {
    message_id: message.message_id,
    date: message.date,
    text: message.text ?? null,
    caption: message.caption ?? null,
    entities: message.entities ?? [],
    caption_entities: message.caption_entities ?? [],
    has_photo: Boolean(message.photo?.length),
    has_video: Boolean(message.video),
    has_document: Boolean(message.document),
    has_audio: Boolean(message.audio),
    has_voice: Boolean(message.voice),
    has_animation: Boolean(message.animation),
    voice_duration: message.voice?.duration ?? null,
    forward_date: message.forward_date ?? null,
  };
}

function extractStartToken(text?: string): string | null {
  if (!text) {
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed.startsWith("/start")) {
    return null;
  }

  const [, token] = trimmed.split(/\s+/, 2);
  return token?.trim() || null;
}

function extractInboxText(message: TelegramMessage): string {
  return (message.text ?? message.caption ?? "").trim();
}

function buildIdeaTitle(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 80) {
    return normalized;
  }

  return `${normalized.slice(0, 77).trimEnd()}...`;
}

function getTelegramUserId(message: TelegramMessage): string | null {
  return message.from ? String(message.from.id) : null;
}

function getLinkPromptText(): string {
  return "Link your account from the dashboard first, then send me ideas here.";
}

function getLinkSuccessText(): string {
  return "Telegram connected. Send me text ideas or voice notes and I will save them as drafts.";
}

function getExpiredLinkText(): string {
  return "This link is invalid or expired. Generate a fresh Telegram bot link in the dashboard.";
}

function getUnsupportedInboxText(): string {
  return "Send a text idea or a voice note and I will save it as a draft.";
}

function getSavedIdeaText(): string {
  return "Saved as an idea draft.";
}

function getVoiceIdeaQueuedText(): string {
  return "Voice note received. I am transcribing and polishing it into a draft now.";
}

async function sendBotReply(chatId: string | number, text: string): Promise<void> {
  const { getTelegramClient } = await import("@/lib/telegram/client");
  const client = getTelegramClient();
  await client.sendMessage(chatId, text);
}

async function claimTelegramLinkToken(token: string): Promise<{ userId: string } | undefined> {
  const db = await getDb();
  const { telegramLinkTokens } = await getSchema();
  const { eq, and, gt, isNull } = await getDrizzleOps();

  const rows = await db
    .update(telegramLinkTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(telegramLinkTokens.token, token),
        isNull(telegramLinkTokens.usedAt),
        gt(telegramLinkTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: telegramLinkTokens.userId });

  return rows[0];
}

async function findUserByTelegramUserId(
  telegramUserId: string,
): Promise<{ id: string } | undefined> {
  const db = await getDb();
  const { users } = await getSchema();
  const eq = await getEq();

  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.telegramUserId, telegramUserId))
    .limit(1);

  return rows[0];
}

async function linkTelegramUser(userId: string, telegramUserId: string): Promise<void> {
  const db = await getDb();
  const { users } = await getSchema();
  const eq = await getEq();

  await db
    .update(users)
    .set({
      telegramUserId,
      telegramLinkedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
}

async function findExistingInboxIdea(
  userId: string,
  telegramUserId: string,
  messageId: number,
): Promise<{ id: string } | undefined> {
  const db = await getDb();
  const { contentLibrary } = await getSchema();
  const { eq } = await getDrizzleOps();

  const rows = await db
    .select({ id: contentLibrary.id, sourceMetadata: contentLibrary.sourceMetadata })
    .from(contentLibrary)
    .where(eq(contentLibrary.userId, userId))
    .limit(50);

  return rows.find((row) => {
    const meta = row.sourceMetadata as Record<string, unknown> | null;
    const captureType = meta?.telegramCaptureType;
    const isInboxCapture = captureType === "bot_inbox" || captureType === "bot_inbox_voice";
    return (
      isInboxCapture &&
      meta?.telegramUserId === telegramUserId &&
      meta?.telegramMessageId === messageId
    );
  });
}

async function createInboxIdea(
  update: TelegramUpdate,
  message: TelegramMessage,
  userId: string,
): Promise<string | undefined> {
  const telegramUserId = getTelegramUserId(message);
  const text = extractInboxText(message);
  const isVoiceCapture = Boolean(message.voice?.file_id);

  if (!telegramUserId || (!text && !isVoiceCapture)) {
    return undefined;
  }

  const existing = await findExistingInboxIdea(userId, telegramUserId, message.message_id);
  if (existing) {
    return existing.id;
  }

  const db = await getDb();
  const { contentLibrary } = await getSchema();

  const rows = await db
    .insert(contentLibrary)
    .values({
      userId,
      title: buildIdeaTitle(text || "Voice note idea"),
      content: text || null,
      sourceType: "idea",
      status: "draft",
      sourceMetadata: {
        telegramCaptureType: isVoiceCapture ? "bot_inbox_voice" : "bot_inbox",
        telegramUpdateId: update.update_id,
        telegramMessageId: message.message_id,
        telegramUserId,
        telegramChatId: String(message.chat.id),
        telegramUsername: message.from?.username ?? null,
        telegramFirstName: message.from?.first_name ?? null,
        telegramVoiceFileId: message.voice?.file_id ?? null,
        telegramVoiceMimeType: message.voice?.mime_type ?? null,
        telegramVoiceDurationSec: message.voice?.duration ?? null,
        capturedAt: new Date(message.date * 1000).toISOString(),
      },
    })
    .returning({ id: contentLibrary.id });

  return rows[0]?.id;
}

async function handlePrivateMessage(
  update: TelegramUpdate,
  message: TelegramMessage,
): Promise<void> {
  const telegramUserId = getTelegramUserId(message);
  if (!telegramUserId) {
    return;
  }

  const startToken = extractStartToken(message.text);
  if (startToken) {
    const claimed = await claimTelegramLinkToken(startToken);
    if (!claimed) {
      await sendBotReply(message.chat.id, getExpiredLinkText());
      return;
    }

    const existingOwner = await findUserByTelegramUserId(telegramUserId);
    if (existingOwner && existingOwner.id !== claimed.userId) {
      await sendBotReply(message.chat.id, getExpiredLinkText());
      return;
    }

    await linkTelegramUser(claimed.userId, telegramUserId);
    await sendBotReply(message.chat.id, getLinkSuccessText());
    return;
  }

  const linkedUser = await findUserByTelegramUserId(telegramUserId);
  if (!linkedUser) {
    await sendBotReply(message.chat.id, getLinkPromptText());
    return;
  }

  const isVoiceCapture = Boolean(message.voice?.file_id);
  const text = extractInboxText(message);
  if (!text && !isVoiceCapture) {
    await sendBotReply(message.chat.id, getUnsupportedInboxText());
    return;
  }

  const contentId = await createInboxIdea(update, message, linkedUser.id);
  if (!contentId) {
    await sendBotReply(message.chat.id, getUnsupportedInboxText());
    return;
  }

  const inngest = await getInngest();
  await inngest.send({
    name: "telegram/inbox.received",
    data: {
      contentId,
      userId: linkedUser.id,
      telegramUserId,
      telegramChatId: String(message.chat.id),
      messageId: message.message_id,
      captureType: isVoiceCapture ? "voice" : "text",
    },
  });

  await sendBotReply(
    message.chat.id,
    isVoiceCapture ? getVoiceIdeaQueuedText() : getSavedIdeaText(),
  );
}

/**
 * Lookup the internal channel record for a Telegram chat ID.
 */
async function findChannelByTelegramChatId(
  telegramChatId: string,
): Promise<{ id: string; webhookSecret: string | null } | undefined> {
  const db = await getDb();
  const { telegramChannels } = await getSchema();
  const eq = await getEq();

  const rows = await db
    .select({
      id: telegramChannels.id,
      webhookSecret: telegramChannels.webhookSecret,
    })
    .from(telegramChannels)
    .where(eq(telegramChannels.telegramChatId, telegramChatId))
    .limit(1);

  return rows[0];
}

/**
 * Store a single (non-album) channel post.
 */
async function storeSinglePost(channelDbId: string, message: TelegramMessage): Promise<string> {
  const db = await getDb();
  const { telegramPosts } = await getSchema();

  const contentRaw = message.text ?? message.caption ?? "";
  const mediaUrls = extractMediaUrls(message);
  const contentParsed = buildContentParsed(message);

  const rows = await db
    .insert(telegramPosts)
    .values({
      channelId: channelDbId,
      telegramMessageId: message.message_id,
      contentRaw,
      contentParsed,
      mediaUrls,
      views: message.views ?? 0,
      forwards: message.forwards ?? 0,
      postedAt: new Date(message.date * 1000),
    })
    .returning({ id: telegramPosts.id });

  return rows[0]!.id;
}

/**
 * Flush a media-group batch into a single telegram_posts record.
 */
async function flushMediaGroup(groupId: string): Promise<void> {
  const batch = mediaGroupBatches.get(groupId);
  if (!batch || batch.messages.length === 0) {
    mediaGroupBatches.delete(groupId);
    return;
  }

  mediaGroupBatches.delete(groupId);

  const db = await getDb();
  const { telegramPosts } = await getSchema();
  const inngest = await getInngest();

  // Sort messages by message_id to preserve order
  const sorted = [...batch.messages].sort((a, b) => a.message_id - b.message_id);
  const first = sorted[0]!;

  // Merge text/captions — typically only one message has a caption
  const allText = sorted
    .map((m) => m.text ?? m.caption ?? "")
    .filter(Boolean)
    .join("\n");

  // Merge all media
  const allMedia = sorted.flatMap(extractMediaUrls);

  // Build merged content_parsed
  const contentParsed = {
    media_group_id: groupId,
    message_ids: sorted.map((m) => m.message_id),
    date: first.date,
    text: allText || null,
    messages: sorted.map(buildContentParsed),
  };

  const rows = await db
    .insert(telegramPosts)
    .values({
      channelId: batch.channelDbId,
      telegramMessageId: first.message_id,
      contentRaw: allText,
      contentParsed,
      mediaUrls: allMedia,
      views: first.views ?? 0,
      forwards: first.forwards ?? 0,
      postedAt: new Date(first.date * 1000),
    })
    .returning({ id: telegramPosts.id });

  const postId = rows[0]!.id;

  // Fire Inngest event for the batched post
  await inngest.send({
    name: "telegram/post.received",
    data: {
      postId,
      channelId: batch.channelDbId,
      telegramChatId: batch.telegramChatId,
      mediaGroupId: groupId,
      messageId: first.message_id,
    },
  });
}

/**
 * Process a channel_post message: either queue into a media-group batch
 * or store directly and fire an Inngest event.
 */
async function processChannelPost(message: TelegramMessage, channelDbId: string): Promise<void> {
  const telegramChatId = String(message.chat.id);

  // Media-group batching
  if (message.media_group_id) {
    const groupId = message.media_group_id;
    const existing = mediaGroupBatches.get(groupId);

    if (existing) {
      // Add to existing batch and reset the timer
      clearTimeout(existing.timer);
      existing.messages.push(message);
      existing.timer = setTimeout(() => void flushMediaGroup(groupId), MEDIA_GROUP_WINDOW_MS);
    } else {
      // Start new batch
      const timer = setTimeout(() => void flushMediaGroup(groupId), MEDIA_GROUP_WINDOW_MS);
      mediaGroupBatches.set(groupId, {
        timer,
        channelDbId,
        telegramChatId,
        messages: [message],
      });
    }
    return;
  }

  // Non-album post — store immediately
  const postId = await storeSinglePost(channelDbId, message);

  const inngest = await getInngest();
  await inngest.send({
    name: "telegram/post.received",
    data: {
      postId,
      channelId: channelDbId,
      telegramChatId,
      mediaGroupId: null,
      messageId: message.message_id,
    },
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Verify the secret token header
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expectedSecret) {
    console.error("TELEGRAM_WEBHOOK_SECRET env var is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (!secretHeader || !timingSafeCompare(secretHeader, expectedSecret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Parse the update
  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 3. Handle new_chat_members (welcome messages)
  const message = update.message;
  if (message?.new_chat_members && message.new_chat_members.length > 0) {
    try {
      const { handleNewChatMember } = await import("@/lib/telegram/welcome");
      const { getTelegramClient } = await import("@/lib/telegram/client");
      const db = await getDb();
      const { welcomeTemplates, telegramChannels } = await getSchema();
      const eq = await getEq();

      await handleNewChatMember(message, {
        getTemplate: async (telegramChatId: string) => {
          const { and: andOp } = await import("drizzle-orm");
          const rows = await db
            .select({
              templateText: welcomeTemplates.templateText,
              channelTitle: telegramChannels.title,
              memberCount: telegramChannels.memberCount,
              botToken: telegramChannels.botTokenEncrypted,
              telegramChatId: telegramChannels.telegramChatId,
            })
            .from(welcomeTemplates)
            .innerJoin(telegramChannels, eq(welcomeTemplates.channelId, telegramChannels.id))
            .where(
              andOp(
                eq(telegramChannels.telegramChatId, telegramChatId),
                eq(welcomeTemplates.isEnabled, true),
              ),
            )
            .limit(1);

          const row = rows[0];
          if (!row) return null;

          return {
            templateText: row.templateText,
            channelTitle: row.channelTitle ?? "",
            memberCount: row.memberCount ?? 0,
            botToken: row.botToken ?? process.env.TELEGRAM_BOT_TOKEN ?? null,
          };
        },
        sendMessage: async (botToken, chatId, text, options) => {
          const client = getTelegramClient(botToken);
          await client.sendMessage(chatId, text, options);
        },
      });
    } catch (error) {
      console.error("Error handling new chat members:", error);
    }
    return NextResponse.json({ ok: true });
  }

  if (message?.chat.type === "private") {
    try {
      await handlePrivateMessage(update, message);
    } catch (error) {
      console.error("Error handling private Telegram message:", error);
    }
    return NextResponse.json({ ok: true });
  }

  // 4. Handle edited channel posts (updates to existing posts)
  const editedChannelPost = update.edited_channel_post;
  if (editedChannelPost) {
    const telegramChatId = String(editedChannelPost.chat.id);

    try {
      const channel = await findChannelByTelegramChatId(telegramChatId);

      if (!channel) {
        console.warn(`Received edit webhook for unknown channel: ${telegramChatId}`);
        return NextResponse.json({ ok: true });
      }

      // Update the existing post
      await updateExistingPost(channel.id, editedChannelPost);

      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("Error processing edited post:", error);
      return NextResponse.json({ ok: true });
    }
  }

  // 5. We only care about channel_post (new posts in channels)
  const channelPost = update.channel_post;
  if (!channelPost) {
    // Acknowledge but ignore non-channel-post updates
    return NextResponse.json({ ok: true });
  }

  // 6. Look up the channel in our DB
  const telegramChatId = String(channelPost.chat.id);

  try {
    const channel = await findChannelByTelegramChatId(telegramChatId);

    if (!channel) {
      // Unknown channel — acknowledge to stop Telegram from retrying
      console.warn(`Received webhook for unknown channel: ${telegramChatId}`);
      return NextResponse.json({ ok: true });
    }

    // 6. Process the post (store + fire event)
    await processChannelPost(channelPost, channel.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    // Return 200 to prevent Telegram from retrying on app-level errors.
    // The error is logged and can be investigated asynchronously.
    return NextResponse.json({ ok: true });
  }
}

/**
 * Update an existing post when it's edited on Telegram.
 */
async function updateExistingPost(channelDbId: string, message: TelegramMessage): Promise<void> {
  const db = await getDb();
  const { telegramPosts } = await getSchema();
  const eq = await getEq();

  const contentRaw = message.text ?? message.caption ?? "";
  const mediaUrls = extractMediaUrls(message);
  const contentParsed = buildContentParsed(message);

  // Try to update existing post
  const result = await db
    .update(telegramPosts)
    .set({
      contentRaw,
      contentParsed,
      mediaUrls,
      views: message.views ?? 0,
      forwards: message.forwards ?? 0,
    })
    .where(eq(telegramPosts.telegramMessageId, message.message_id))
    .returning({ id: telegramPosts.id });

  // If no post was updated, it might be a new post we missed
  if (result.length === 0) {
    console.log(`Edited post not found, storing as new: ${message.message_id}`);
    await storeSinglePost(channelDbId, message);
  } else {
    console.log(`Updated edited post: ${result[0]!.id}`);
  }
}
