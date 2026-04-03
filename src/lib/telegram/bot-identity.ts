import { unstable_cache } from "next/cache";
import { getTelegramClient } from "@/lib/telegram/client";

const BOT_USERNAME_FALLBACK = "bot";
const BOT_USERNAME_LOOKUP_TIMEOUT_MS = 8000;
const BOT_USERNAME_CACHE_TTL_SECONDS = 6 * 60 * 60;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function resolveTelegramBotUsernameUncached(): Promise<string> {
  if (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME) {
    return process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  }

  try {
    const tgClient = getTelegramClient();
    const me = await withTimeout(tgClient.getMe(), BOT_USERNAME_LOOKUP_TIMEOUT_MS);
    return me.username ?? BOT_USERNAME_FALLBACK;
  } catch {
    return BOT_USERNAME_FALLBACK;
  }
}

const resolveTelegramBotUsernameCached = unstable_cache(
  resolveTelegramBotUsernameUncached,
  ["telegram-bot-username"],
  { revalidate: BOT_USERNAME_CACHE_TTL_SECONDS },
);

export async function resolveTelegramBotUsername(): Promise<string> {
  return resolveTelegramBotUsernameCached();
}
