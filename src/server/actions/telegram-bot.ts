"use server";

import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { telegramLinkTokens } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getTelegramClient } from "@/lib/telegram/client";

export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

export type TelegramBotLinkData = {
  botUsername: string;
  token: string;
  deepLinkUrl: string;
  expiresAt: string;
};

const TELEGRAM_BOT_LINK_TTL_MS = 15 * 60 * 1000;

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

function buildDeepLink(botUsername: string, token: string): string {
  return `https://t.me/${botUsername}?start=${token}`;
}

function generateLinkToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createTelegramBotLink(): Promise<ActionResult<TelegramBotLinkData>> {
  try {
    const user = await getCurrentUser();
    const token = generateLinkToken();
    const expiresAt = new Date(Date.now() + TELEGRAM_BOT_LINK_TTL_MS);

    const tgClient = getTelegramClient();
    const bot = await tgClient.getMe();

    if (!bot.username) {
      return { success: false, error: "Telegram bot username is not configured" };
    }

    await db
      .insert(telegramLinkTokens)
      .values({
        userId: user.id,
        token,
        expiresAt,
      })
      .returning({ id: telegramLinkTokens.id });

    return {
      success: true,
      data: {
        botUsername: bot.username,
        token,
        deepLinkUrl: buildDeepLink(bot.username, token),
        expiresAt: expiresAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Telegram bot link";
    return { success: false, error: message };
  }
}
