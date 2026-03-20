export type TelegramComposerParseMode = "HTML" | "MarkdownV2";

export interface TelegramComposerMetadata {
  parseMode?: TelegramComposerParseMode;
  imageUrl: string | null;
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "tg:", "mailto:"]);

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

function sanitizeTelegramLink(url: string): string | null {
  try {
    const parsed = new URL(url);
    return SAFE_LINK_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Reads formatter metadata persisted in content_library.source_metadata.telegramComposer.
 */
export function readTelegramComposerMetadata(sourceMetadata: unknown): TelegramComposerMetadata {
  if (!sourceMetadata || typeof sourceMetadata !== "object" || Array.isArray(sourceMetadata)) {
    return { parseMode: undefined, imageUrl: null };
  }

  const metadata = sourceMetadata as Record<string, unknown>;
  const composer = metadata.telegramComposer;

  if (!composer || typeof composer !== "object" || Array.isArray(composer)) {
    return { parseMode: undefined, imageUrl: null };
  }

  const parsedComposer = composer as Record<string, unknown>;
  const parseModeRaw = parsedComposer.parseMode;
  const imageUrlRaw = parsedComposer.imageUrl;

  const parseMode =
    parseModeRaw === "HTML" || parseModeRaw === "MarkdownV2" ? parseModeRaw : undefined;

  return {
    parseMode,
    imageUrl: typeof imageUrlRaw === "string" && imageUrlRaw.length > 0 ? imageUrlRaw : null,
  };
}

/**
 * Converts Telegram-style markdown text to Telegram-safe HTML.
 * Supported markers: *bold*, _italic_, __underline__, ~strike~, ||spoiler||, `code`, ```code```.
 */
export function renderTelegramMarkdownToHtml(markdown: string): string {
  const placeholders: string[] = [];
  const addPlaceholder = (value: string) => {
    const token = `%%TGPH${placeholders.length}%%`;
    placeholders.push(value);
    return token;
  };

  let processed = markdown;

  processed = processed.replace(
    /```([a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g,
    (_match, language, code) => {
      const languageClass =
        typeof language === "string" && language ? ` class="language-${escapeHtml(language)}"` : "";
      return addPlaceholder(`<pre><code${languageClass}>${escapeHtml(code)}</code></pre>`);
    },
  );

  processed = processed.replace(/`([^`\n]+)`/g, (_match, code) => {
    return addPlaceholder(`<code>${escapeHtml(code)}</code>`);
  });

  processed = processed.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
    const safeUrl = sanitizeTelegramLink(url);
    if (!safeUrl) {
      return match;
    }
    return addPlaceholder(`<a href="${escapeHtml(safeUrl)}">${escapeHtml(label)}</a>`);
  });

  processed = escapeHtml(processed);

  processed = processed.replace(/\|\|([^|\n]+?)\|\|/g, "<tg-spoiler>$1</tg-spoiler>");
  processed = processed.replace(/__([^_\n]+?)__/g, "<u>$1</u>");
  processed = processed.replace(/\*([^*\n]+?)\*/g, "<b>$1</b>");
  processed = processed.replace(/_([^_\n]+?)_/g, "<i>$1</i>");
  processed = processed.replace(/~([^~\n]+?)~/g, "<s>$1</s>");

  processed = processed.replace(/%%TGPH(\d+)%%/g, (_match, index) => {
    const value = placeholders[Number(index)];
    return value ?? "";
  });

  return processed;
}

/**
 * Normalizes outbound text for Telegram API calls.
 * For MarkdownV2 mode we convert markdown markers into HTML and send as parse_mode=HTML
 * to avoid Telegram MarkdownV2 escaping pitfalls.
 */
export function prepareTelegramTextForSend(
  text: string,
  parseMode?: TelegramComposerParseMode,
): { text: string; parseMode?: TelegramComposerParseMode } {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return { text: "", parseMode };
  }

  if (parseMode === "MarkdownV2") {
    return {
      text: renderTelegramMarkdownToHtml(trimmedText),
      parseMode: "HTML",
    };
  }

  return { text: trimmedText, parseMode };
}
