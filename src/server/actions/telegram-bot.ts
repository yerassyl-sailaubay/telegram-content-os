"use server";

import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { telegramLinkTokens } from "@/server/db/schema";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { resolveTelegramBotUsername } from "@/lib/telegram/bot-identity";

export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

export type TelegramBotLinkData = {
  botUsername: string;
  token: string;
  deepLinkUrl: string;
  expiresAt: string;
};

const TELEGRAM_BOT_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function buildDeepLink(botUsername: string, token: string): string {
  return `https://t.me/${botUsername}?start=${token}`;
}

function generateLinkToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createTelegramBotLink(): Promise<ActionResult<TelegramBotLinkData>> {
  try {
    const userId = await getCurrentUserId();
    const token = generateLinkToken();
    const expiresAt = new Date(Date.now() + TELEGRAM_BOT_LINK_TTL_MS);

    const botUsername = await resolveTelegramBotUsername();
    if (!botUsername || botUsername === "bot") {
      return { success: false, error: "Telegram bot username is not configured" };
    }

    await db
      .insert(telegramLinkTokens)
      .values({
        userId,
        token,
        expiresAt,
      })
      .returning({ id: telegramLinkTokens.id });

    return {
      success: true,
      data: {
        botUsername,
        token,
        deepLinkUrl: buildDeepLink(botUsername, token),
        expiresAt: expiresAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Telegram bot link";
    return { success: false, error: message };
  }
}
