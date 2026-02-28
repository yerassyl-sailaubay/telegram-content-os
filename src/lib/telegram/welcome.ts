/**
 * Welcome message handler for Telegram new_chat_members events.
 *
 * - Renders templates with variable substitution ({name}, {channel_name}, {member_count})
 * - Rate limits: max 1 welcome per member per channel per 24h (in-memory TTL map)
 * - Sends rendered messages via TelegramClient.sendMessage
 */

import type { TelegramMessage, TelegramUser } from "./types";

// ---------------------------------------------------------------------------
// Template rendering
// ---------------------------------------------------------------------------

/**
 * Substitute template variables with actual values.
 * Supported variables: {name}, {channel_name}, {member_count}
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

/**
 * Build template variables from a Telegram user and chat context.
 */
export function buildTemplateVars(
  user: TelegramUser,
  channelName: string,
  memberCount: number,
): Record<string, string> {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return {
    name: name || "New Member",
    channel_name: channelName || "this channel",
    member_count: String(memberCount),
  };
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory with TTL)
// ---------------------------------------------------------------------------

const RATE_LIMIT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * In-memory map for rate limiting: "channelId:userId" → timestamp.
 * Exported for testing purposes.
 */
export const rateLimitMap = new Map<string, number>();

function rateLimitKey(channelTelegramChatId: string, userId: number): string {
  return `${channelTelegramChatId}:${userId}`;
}

/**
 * Check if a welcome message was already sent for this member recently.
 * Returns true if rate-limited (should NOT send).
 */
export function isRateLimited(
  channelTelegramChatId: string,
  userId: number,
): boolean {
  const key = rateLimitKey(channelTelegramChatId, userId);
  const lastSent = rateLimitMap.get(key);
  if (lastSent && Date.now() - lastSent < RATE_LIMIT_TTL_MS) {
    return true;
  }
  return false;
}

/**
 * Record that a welcome message was sent for this member.
 */
export function recordWelcomeSent(
  channelTelegramChatId: string,
  userId: number,
): void {
  const key = rateLimitKey(channelTelegramChatId, userId);
  rateLimitMap.set(key, Date.now());

  // Lazy cleanup: remove expired entries when map grows large
  if (rateLimitMap.size > 10_000) {
    const now = Date.now();
    for (const [k, v] of rateLimitMap) {
      if (now - v >= RATE_LIMIT_TTL_MS) {
        rateLimitMap.delete(k);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// New chat member handler
// ---------------------------------------------------------------------------

export interface WelcomeHandlerDeps {
  /** Look up enabled welcome template for a chat ID */
  getTemplate: (telegramChatId: string) => Promise<{
    templateText: string;
    channelTitle: string;
    memberCount: number;
    botToken: string | null;
  } | null>;
  /** Send a message via Telegram API */
  sendMessage: (
    botToken: string,
    chatId: string | number,
    text: string,
    options?: { parse_mode?: "HTML" | "MarkdownV2" },
  ) => Promise<void>;
}

/**
 * Handle a message containing new_chat_members.
 * Looks up the template, renders it for each new member, rate-limits, and sends.
 */
export async function handleNewChatMember(
  message: TelegramMessage & { new_chat_members?: TelegramUser[] },
  deps: WelcomeHandlerDeps,
): Promise<void> {
  const newMembers = message.new_chat_members;
  if (!newMembers || newMembers.length === 0) return;

  const chatId = String(message.chat.id);

  // Fetch template for this chat
  const templateData = await deps.getTemplate(chatId);
  if (!templateData) return; // No enabled template

  const { templateText, channelTitle, memberCount, botToken } = templateData;
  if (!botToken) return; // No bot token available

  for (const member of newMembers) {
    // Skip bots
    if (member.is_bot) continue;

    // Rate limit check
    if (isRateLimited(chatId, member.id)) continue;

    // Render template
    const vars = buildTemplateVars(member, channelTitle, memberCount);
    const text = renderTemplate(templateText, vars);

    try {
      await deps.sendMessage(botToken, message.chat.id, text, {
        parse_mode: "MarkdownV2",
      });
      recordWelcomeSent(chatId, member.id);
    } catch (error) {
      // Log but don't throw — other members should still get welcomed
      console.error(
        `Failed to send welcome message to ${member.id} in ${chatId}:`,
        error,
      );
    }
  }
}
