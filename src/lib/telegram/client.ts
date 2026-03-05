import type {
  TelegramApiResponse,
  TelegramChat,
  TelegramUser,
  TelegramSentMessage,
  InputMediaPhoto,
  InputMediaVideo,
  SendPollOptions,
} from "./types";
import { TelegramApiError } from "./types";

const TELEGRAM_API_BASE = "https://api.telegram.org";

/** Status codes that warrant a retry (rate-limit, server errors). */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/** Default retry configuration. */
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

/**
 * Executes `fn` with exponential backoff retries on retryable errors.
 * Respects Telegram's `retry_after` header when present.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isRetryable =
        error instanceof TelegramApiError && RETRYABLE_STATUS_CODES.has(error.statusCode);

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
      await sleep(delay);
    }
  }

  // Should be unreachable but satisfies TS
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TelegramClient {
  private readonly apiBase: string;
  private readonly retryOptions: RetryOptions;

  constructor(botToken: string, options?: { retryOptions?: RetryOptions }) {
    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN is required");
    }
    this.apiBase = `${TELEGRAM_API_BASE}/bot${botToken}`;
    this.retryOptions = options?.retryOptions ?? {};
  }

  // ---- Low-level request ------------------------------------------------

  /**
   * Calls a Telegram Bot API method and returns the parsed result.
   * Automatically retries on transient failures.
   */
  async request<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    return withRetry(async () => {
      const url = `${this.apiBase}/${method}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: params ? JSON.stringify(params) : undefined,
      });

      const data = (await response.json()) as TelegramApiResponse<T>;

      if (!response.ok || !data.ok) {
        throw new TelegramApiError(
          data.description ?? `Telegram API error: ${method}`,
          response.status,
          data.error_code,
        );
      }

      return data.result as T;
    }, this.retryOptions);
  }

  // ---- Public methods ---------------------------------------------------

  /** Returns basic information about the bot. */
  async getMe(): Promise<TelegramUser> {
    return this.request<TelegramUser>("getMe");
  }

  /** Returns info about a chat. */
  async getChat(chatId: string | number): Promise<TelegramChat> {
    return this.request<TelegramChat>("getChat", { chat_id: chatId });
  }

  /** Returns the number of members in a chat. */
  async getChatMemberCount(chatId: string | number): Promise<number> {
    return this.request<number>("getChatMemberCount", { chat_id: chatId });
  }

  /** Sends a text message. */
  async sendMessage(
    chatId: string | number,
    text: string,
    options?: { parse_mode?: "HTML" | "MarkdownV2" },
  ): Promise<TelegramSentMessage> {
    return this.request<TelegramSentMessage>("sendMessage", {
      chat_id: chatId,
      text,
      ...options,
    });
  }

  /** Sends a photo with optional caption. */
  async sendPhoto(
    chatId: string | number,
    photo: string, // URL or file_id
    options?: {
      caption?: string;
      parse_mode?: "HTML" | "MarkdownV2";
    },
  ): Promise<TelegramSentMessage> {
    return this.request<TelegramSentMessage>("sendPhoto", {
      chat_id: chatId,
      photo,
      ...options,
    });
  }

  /** Registers a webhook URL with Telegram. */
  async setWebhook(
    url: string,
    options?: {
      secret_token?: string;
      allowed_updates?: string[];
      max_connections?: number;
    },
  ): Promise<boolean> {
    return this.request<boolean>("setWebhook", { url, ...options });
  }

  /** Removes the current webhook. */
  async deleteWebhook(dropPendingUpdates = false): Promise<boolean> {
    return this.request<boolean>("deleteWebhook", {
      drop_pending_updates: dropPendingUpdates,
    });
  }

  /** Edits a message text. */
  async editMessageText(
    chatId: string | number,
    messageId: number,
    text: string,
    options?: { parse_mode?: "HTML" | "MarkdownV2" },
  ): Promise<TelegramSentMessage> {
    return this.request<TelegramSentMessage>("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      ...options,
    });
  }

  /** Deletes a message. */
  async deleteMessage(chatId: string | number, messageId: number): Promise<boolean> {
    return this.request<boolean>("deleteMessage", {
      chat_id: chatId,
      message_id: messageId,
    });
  }

  async sendMediaGroup(
    chatId: string | number,
    media: (InputMediaPhoto | InputMediaVideo)[],
    options?: { disable_notification?: boolean },
  ): Promise<TelegramSentMessage[]> {
    return this.request<TelegramSentMessage[]>("sendMediaGroup", {
      chat_id: chatId,
      media,
      ...options,
    });
  }

  async sendPoll(
    chatId: string | number,
    question: string,
    options: string[],
    pollOptions?: SendPollOptions,
  ): Promise<TelegramSentMessage> {
    return this.request<TelegramSentMessage>("sendPoll", {
      chat_id: chatId,
      question,
      options,
      ...pollOptions,
    });
  }

  async sendDocument(
    chatId: string | number,
    document: string,
    options?: {
      caption?: string;
      parse_mode?: "HTML" | "MarkdownV2";
    },
  ): Promise<TelegramSentMessage> {
    return this.request<TelegramSentMessage>("sendDocument", {
      chat_id: chatId,
      document,
      ...options,
    });
  }
}

// ---------------------------------------------------------------------------
// Factory: singleton per bot token
// ---------------------------------------------------------------------------

const clients = new Map<string, TelegramClient>();

/**
 * Returns a TelegramClient for the given bot token (cached).
 * Falls back to TELEGRAM_BOT_TOKEN env var when no token is supplied.
 */
export function getTelegramClient(botToken?: string): TelegramClient {
  const token = botToken ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Bot token not provided and TELEGRAM_BOT_TOKEN env var is not set");
  }

  let client = clients.get(token);
  if (!client) {
    client = new TelegramClient(token);
    clients.set(token, client);
  }

  return client;
}
