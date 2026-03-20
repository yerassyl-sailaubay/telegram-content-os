/**
 * Format Converters for Parsed Telegram Content
 *
 * Convert ParsedContent/ContentBlock structures to various output formats:
 * - Markdown: for content library storage and editing
 * - Plain Text: for AI adaptation input
 * - HTML: for web preview rendering (XSS-safe)
 *
 * All functions are pure — no side effects.
 */

import type { ParsedContent, ParsedMediaGroup, ContentBlock, FormattingMark } from "./parser.types";

// ─── HTML Escaping (XSS Prevention) ─────────────────────────────────────────

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

/**
 * Escape HTML special characters to prevent XSS.
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

/**
 * Sanitize a URL for safe use in HTML href attributes.
 * Blocks dangerous protocols like javascript:, data:, vbscript:.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:")
  ) {
    return "about:blank";
  }
  return url;
}

/**
 * Simple formatting application: for each contiguous run of characters
 * with the same set of active marks, emit the text wrapped in those marks.
 */
function applyFormattingSimple(
  text: string,
  formatting: FormattingMark[],
  wrapFn: (text: string, type: string) => string,
  escapeFn: (text: string) => string,
): string {
  if (!formatting || formatting.length === 0) {
    return escapeFn(text);
  }

  // Collect all boundary positions
  const boundaries = new Set<number>();
  boundaries.add(0);
  boundaries.add(text.length);
  for (const mark of formatting) {
    boundaries.add(Math.max(0, mark.start));
    boundaries.add(Math.min(text.length, mark.end));
  }

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);

  let result = "";

  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const segStart = sortedBoundaries[i];
    const segEnd = sortedBoundaries[i + 1];
    if (segStart >= segEnd) continue;

    const segment = text.slice(segStart, segEnd);
    const midpoint = segStart; // Check which marks are active at this segment start

    // Find active marks for this segment
    const activeMarks = formatting.filter((mark) => mark.start <= midpoint && mark.end > midpoint);

    // Apply marks from outermost to innermost
    // Order: bold, italic, underline, strikethrough, code, spoiler
    const markOrder = ["bold", "italic", "underline", "strikethrough", "spoiler", "code"];
    const sortedMarks = activeMarks.sort(
      (a, b) => markOrder.indexOf(a.type) - markOrder.indexOf(b.type),
    );

    let wrapped = escapeFn(segment);
    // Apply in reverse order so innermost wrapping happens first
    for (let j = sortedMarks.length - 1; j >= 0; j--) {
      wrapped = wrapFn(wrapped, sortedMarks[j].type);
    }

    result += wrapped;
  }

  return result;
}

// ─── Markdown Converter ─────────────────────────────────────────────────────

function wrapMarkdown(text: string, type: string): string {
  switch (type) {
    case "bold":
      return `**${text}**`;
    case "italic":
      return `_${text}_`;
    case "underline":
      // Markdown doesn't have native underline; use HTML
      return `<u>${text}</u>`;
    case "strikethrough":
      return `~~${text}~~`;
    case "code":
      return `\`${text}\``;
    case "spoiler":
      return `||${text}||`;
    default:
      return text;
  }
}

function blockToMarkdown(block: ContentBlock): string {
  switch (block.type) {
    case "text":
      return applyFormattingSimple(
        block.text,
        block.formatting ?? [],
        wrapMarkdown,
        (t) => t, // Don't escape markdown in markdown output — preserve raw text
      );

    case "code_block": {
      const lang = block.language ?? "";
      return `\`\`\`${lang}\n${block.text}\n\`\`\``;
    }

    case "blockquote": {
      const formatted = applyFormattingSimple(
        block.text,
        block.formatting ?? [],
        wrapMarkdown,
        (t) => t,
      );
      // Prefix each line with >
      return formatted
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    }

    case "link":
      if (block.url && block.url !== block.text) {
        return `[${block.text}](${block.url})`;
      }
      return block.text;

    case "mention":
      return block.text; // Already includes @

    case "hashtag":
      return block.text; // Already includes #

    case "bot_command":
      return `\`${block.text}\``;

    case "email":
      return `[${block.text}](mailto:${block.text})`;

    case "phone_number":
      return block.text;

    case "custom_emoji":
      return block.text; // Emit the text; custom emoji IDs are metadata

    case "media":
      return ""; // Media handled separately

    default:
      return block.text;
  }
}

/**
 * Convert parsed content to Markdown.
 */
export function toMarkdown(content: ParsedContent | ParsedMediaGroup): string {
  const parts: string[] = [];

  // Forward attribution
  if (content.forward) {
    const fwd = content.forward;
    let attribution = `*Forwarded from ${fwd.authorName}`;
    if (fwd.channelUsername) {
      attribution += ` (@${fwd.channelUsername})`;
    }
    attribution += "*";
    parts.push(attribution);
    parts.push("");
  }

  // Content blocks
  for (const block of content.blocks) {
    parts.push(blockToMarkdown(block));
  }

  // Media references
  if (content.media.length > 0) {
    if (parts.length > 0 && parts[parts.length - 1] !== "") {
      parts.push("");
    }
    for (const media of content.media) {
      const label = media.fileName ?? media.type;
      parts.push(`[${label}: ${media.fileId}]`);
    }
  }

  return parts.join("\n").trim();
}

// ─── Plain Text Converter ───────────────────────────────────────────────────

/**
 * Convert parsed content to plain text (no formatting).
 */
export function toPlainText(content: ParsedContent | ParsedMediaGroup): string {
  const parts: string[] = [];

  // Forward attribution
  if (content.forward) {
    const fwd = content.forward;
    let attribution = `Forwarded from ${fwd.authorName}`;
    if (fwd.channelUsername) {
      attribution += ` (@${fwd.channelUsername})`;
    }
    parts.push(attribution);
    parts.push("");
  }

  // Content blocks — just the text, no formatting
  for (const block of content.blocks) {
    switch (block.type) {
      case "code_block":
        parts.push(block.text);
        break;
      case "blockquote":
        parts.push(block.text);
        break;
      case "link":
        if (block.url && block.url !== block.text) {
          parts.push(`${block.text} (${block.url})`);
        } else {
          parts.push(block.text);
        }
        break;
      case "email":
        parts.push(block.text);
        break;
      case "media":
        // Skip media in plain text
        break;
      default:
        parts.push(block.text);
        break;
    }
  }

  return parts.join("").trim();
}

// ─── HTML Converter ─────────────────────────────────────────────────────────

function wrapHtml(text: string, type: string): string {
  switch (type) {
    case "bold":
      return `<b>${text}</b>`;
    case "italic":
      return `<i>${text}</i>`;
    case "underline":
      return `<u>${text}</u>`;
    case "strikethrough":
      return `<s>${text}</s>`;
    case "code":
      return `<code>${text}</code>`;
    case "spoiler":
      return `<span class="spoiler">${text}</span>`;
    default:
      return text;
  }
}

function blockToHtml(block: ContentBlock): string {
  switch (block.type) {
    case "text": {
      const formatted = applyFormattingSimple(
        block.text,
        block.formatting ?? [],
        wrapHtml,
        escapeHtml,
      );
      return `<p>${formatted}</p>`;
    }

    case "code_block": {
      const escaped = escapeHtml(block.text);
      if (block.language) {
        return `<pre><code class="language-${escapeHtml(block.language)}">${escaped}</code></pre>`;
      }
      return `<pre><code>${escaped}</code></pre>`;
    }

    case "blockquote": {
      const formatted = applyFormattingSimple(
        block.text,
        block.formatting ?? [],
        wrapHtml,
        escapeHtml,
      );
      if (block.expandable) {
        return `<details><blockquote>${formatted}</blockquote></details>`;
      }
      return `<blockquote>${formatted}</blockquote>`;
    }

    case "link": {
      const rawUrl = block.url ?? block.text;
      const safeUrl = sanitizeUrl(rawUrl);
      return `<a href="${escapeHtml(safeUrl)}" rel="noopener noreferrer">${escapeHtml(block.text)}</a>`;
    }

    case "mention":
      return `<span class="mention">${escapeHtml(block.text)}</span>`;

    case "hashtag":
      return `<span class="hashtag">${escapeHtml(block.text)}</span>`;

    case "bot_command":
      return `<code>${escapeHtml(block.text)}</code>`;

    case "email":
      return `<a href="mailto:${escapeHtml(block.text)}">${escapeHtml(block.text)}</a>`;

    case "phone_number":
      return `<a href="tel:${escapeHtml(block.text)}">${escapeHtml(block.text)}</a>`;

    case "custom_emoji":
      return `<span class="custom-emoji" data-emoji-id="${escapeHtml(block.customEmojiId ?? "")}">${escapeHtml(block.text)}</span>`;

    case "media":
      return ""; // Media handled separately

    default:
      return `<span>${escapeHtml(block.text)}</span>`;
  }
}

/**
 * Convert parsed content to safe HTML.
 * All user content is escaped to prevent XSS.
 */
export function toHTML(content: ParsedContent | ParsedMediaGroup): string {
  const parts: string[] = [];

  // Forward attribution
  if (content.forward) {
    const fwd = content.forward;
    let attribution = `Forwarded from <strong>${escapeHtml(fwd.authorName)}</strong>`;
    if (fwd.channelUsername) {
      attribution += ` (<a href="https://t.me/${escapeHtml(fwd.channelUsername)}">@${escapeHtml(fwd.channelUsername)}</a>)`;
    }
    parts.push(`<div class="forward-info">${attribution}</div>`);
  }

  // Content blocks
  for (const block of content.blocks) {
    const html = blockToHtml(block);
    if (html) {
      parts.push(html);
    }
  }

  // Media
  if (content.media.length > 0) {
    const mediaItems = content.media
      .map((m) => {
        const label = escapeHtml(m.fileName ?? m.type);
        return `<div class="media-item" data-file-id="${escapeHtml(m.fileId)}" data-type="${escapeHtml(m.type)}">${label}</div>`;
      })
      .join("");
    parts.push(`<div class="media-group">${mediaItems}</div>`);
  }

  return parts.join("\n");
}
