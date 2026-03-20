/**
 * Telegram Message Parser
 *
 * Converts Telegram messages with MessageEntity formatting into
 * a structured intermediate format for downstream processing.
 *
 * Key design decisions:
 * - UTF-16 offset conversion: Telegram uses UTF-16 code units for entity offsets.
 *   JavaScript strings are internally UTF-16, but string indexing in JS is by
 *   code unit already — so we need to build a mapping between UTF-16 offsets
 *   and JS string indices for text containing surrogate pairs (emoji).
 * - Pure functions: no side effects, no DB calls, no API calls.
 * - Handles nested/overlapping entities gracefully.
 */

import type {
  TelegramMessage,
  TelegramEntity,
  TelegramPhotoSize,
  ParsedContent,
  ParsedMedia,
  ParsedMediaGroup,
  ContentBlock,
  FormattingMark,
  FormattingType,
  ForwardInfo,
  ContentBlockType,
  TelegramMediaType,
} from "./parser.types";

// ─── UTF-16 Offset Conversion ────────────────────────────────────────────────

/**
 * Build a mapping from UTF-16 code unit offset to JS string index.
 *
 * JavaScript strings are UTF-16 internally, and `string[i]` accesses by
 * code unit. However, `String.prototype.length` counts UTF-16 code units,
 * and characters outside BMP (like emoji) are stored as surrogate pairs
 * (2 code units). Telegram's entity offsets count UTF-16 code units,
 * which matches JS string indexing directly.
 *
 * BUT: when we use string methods like `slice()`, they work on code unit
 * indices, which IS the same as UTF-16 offsets. So for most purposes,
 * Telegram offsets can be used directly as JS string indices.
 *
 * The only issue arises if we were to use codepoint-based iteration
 * (for...of, Array.from), but since we stick to .slice(), we're fine.
 *
 * This function validates that the offset is within bounds and returns
 * the JS string index (which equals the UTF-16 offset for .slice()).
 */
export function utf16OffsetToJsIndex(text: string, utf16Offset: number): number {
  // JS string length IS the UTF-16 code unit count, so they match directly
  if (utf16Offset < 0) return 0;
  if (utf16Offset > text.length) return text.length;
  return utf16Offset;
}

/**
 * Extract a substring using UTF-16 offsets (as Telegram uses them).
 * Since JS .slice() operates on UTF-16 code units, this is direct.
 */
export function sliceByUtf16(text: string, offset: number, length: number): string {
  const start = utf16OffsetToJsIndex(text, offset);
  const end = utf16OffsetToJsIndex(text, offset + length);
  return text.slice(start, end);
}

// ─── Entity Classification ──────────────────────────────────────────────────

/** Formatting entity types that become inline marks */
const FORMATTING_ENTITY_TYPES = new Set([
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "code",
  "spoiler",
]);

/** Entity types that produce their own block type */
const BLOCK_ENTITY_TYPES: Record<string, ContentBlockType> = {
  text_link: "link",
  mention: "mention",
  hashtag: "hashtag",
  url: "link",
  bot_command: "bot_command",
  email: "email",
  phone_number: "phone_number",
  custom_emoji_id: "custom_emoji",
  pre: "code_block",
  blockquote: "blockquote",
  expandable_blockquote: "blockquote",
};

function isFormattingEntity(type: string): type is FormattingType {
  return FORMATTING_ENTITY_TYPES.has(type);
}

// ─── Entity Sorting & Grouping ──────────────────────────────────────────────

interface EntityRange {
  entity: TelegramEntity;
  start: number; // JS string index
  end: number; // JS string index (exclusive)
}

/**
 * Sort entities by start position, then by length (longer first for nesting).
 */
function sortEntities(entities: TelegramEntity[], text: string): EntityRange[] {
  return entities
    .map((entity) => ({
      entity,
      start: utf16OffsetToJsIndex(text, entity.offset),
      end: utf16OffsetToJsIndex(text, entity.offset + entity.length),
    }))
    .sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      // Longer entities first (they are containers)
      return b.end - a.end;
    });
}

// ─── Content Block Building ─────────────────────────────────────────────────

/**
 * Parse entities into content blocks.
 *
 * Strategy:
 * 1. Separate entities into "structural" (blockquote, pre, text_link, mention, etc.)
 *    and "formatting" (bold, italic, etc.)
 * 2. Walk through the text, creating blocks for structural entities
 *    and attaching formatting marks to the appropriate blocks.
 * 3. Plain text between structural entities becomes "text" blocks.
 */
export function parseEntities(text: string, entities: TelegramEntity[]): ContentBlock[] {
  if (!text) return [];
  if (!entities || entities.length === 0) {
    return [{ type: "text", text }];
  }

  const sorted = sortEntities(entities, text);
  const blocks: ContentBlock[] = [];
  let cursor = 0;

  // Separate structural and formatting entities
  const structuralRanges: EntityRange[] = [];
  const formattingRanges: EntityRange[] = [];

  for (const range of sorted) {
    if (isFormattingEntity(range.entity.type)) {
      formattingRanges.push(range);
    } else if (
      range.entity.type === "blockquote" ||
      range.entity.type === "expandable_blockquote"
    ) {
      structuralRanges.push(range);
    } else if (range.entity.type === "pre") {
      structuralRanges.push(range);
    } else if (
      range.entity.type === "text_link" ||
      range.entity.type === "mention" ||
      range.entity.type === "hashtag" ||
      range.entity.type === "url" ||
      range.entity.type === "bot_command" ||
      range.entity.type === "email" ||
      range.entity.type === "phone_number" ||
      range.entity.type === "custom_emoji_id"
    ) {
      structuralRanges.push(range);
    }
  }

  // Process: walk through text, emit blocks
  // We handle top-level structural entities only (not nested inside other structural)
  const topLevel = filterTopLevelStructural(structuralRanges);

  for (const structural of topLevel) {
    // Emit plain text before this structural entity
    if (structural.start > cursor) {
      const plainText = text.slice(cursor, structural.start);
      if (plainText) {
        const block = createTextBlock(plainText, cursor, structural.start, formattingRanges);
        blocks.push(block);
      }
    }

    // Emit the structural block
    const block = createStructuralBlock(text, structural, formattingRanges, structuralRanges);
    blocks.push(block);
    cursor = structural.end;
  }

  // Emit remaining plain text
  if (cursor < text.length) {
    const plainText = text.slice(cursor);
    if (plainText) {
      const block = createTextBlock(plainText, cursor, text.length, formattingRanges);
      blocks.push(block);
    }
  }

  return blocks;
}

/**
 * Filter to only top-level structural entities.
 * If a structural entity is contained within another structural entity,
 * it's not top-level (e.g., a mention inside a blockquote).
 */
function filterTopLevelStructural(ranges: EntityRange[]): EntityRange[] {
  const topLevel: EntityRange[] = [];

  for (const range of ranges) {
    const isContained = ranges.some(
      (other) =>
        other !== range &&
        other.start <= range.start &&
        other.end >= range.end &&
        // blockquotes and expandable_blockquotes can contain other structural entities
        (other.entity.type === "blockquote" || other.entity.type === "expandable_blockquote"),
    );
    if (!isContained) {
      topLevel.push(range);
    }
  }

  return topLevel;
}

/**
 * Create a text block with formatting marks.
 */
function createTextBlock(
  blockText: string,
  blockStart: number,
  blockEnd: number,
  formattingRanges: EntityRange[],
): ContentBlock {
  const formatting = getFormattingMarks(blockStart, blockEnd, formattingRanges);

  const block: ContentBlock = { type: "text", text: blockText };
  if (formatting.length > 0) {
    block.formatting = formatting;
  }
  return block;
}

/**
 * Get formatting marks that overlap with a given range,
 * adjusted to be relative to the block's start.
 */
function getFormattingMarks(
  blockStart: number,
  blockEnd: number,
  formattingRanges: EntityRange[],
): FormattingMark[] {
  const marks: FormattingMark[] = [];

  for (const range of formattingRanges) {
    // Check overlap
    if (range.start < blockEnd && range.end > blockStart) {
      const start = Math.max(0, range.start - blockStart);
      const end = Math.min(blockEnd - blockStart, range.end - blockStart);
      if (start < end) {
        marks.push({
          type: range.entity.type as FormattingType,
          start,
          end,
        });
      }
    }
  }

  return marks;
}

/**
 * Create a structural content block.
 */
function createStructuralBlock(
  fullText: string,
  structural: EntityRange,
  formattingRanges: EntityRange[],
  _allStructural: EntityRange[],
): ContentBlock {
  const entityType = structural.entity.type;
  const blockText = fullText.slice(structural.start, structural.end);
  const blockType = BLOCK_ENTITY_TYPES[entityType] ?? ("text" as ContentBlockType);

  const block: ContentBlock = {
    type: blockType,
    text: blockText,
  };

  // Add entity-specific fields
  if (entityType === "text_link" && structural.entity.url) {
    block.url = structural.entity.url;
  }

  if (entityType === "url") {
    block.url = blockText;
  }

  if (entityType === "pre" && structural.entity.language) {
    block.language = structural.entity.language;
  }

  if (entityType === "custom_emoji_id" && structural.entity.custom_emoji_id) {
    block.customEmojiId = structural.entity.custom_emoji_id;
  }

  if (entityType === "expandable_blockquote") {
    block.expandable = true;
  }

  // Add formatting marks for blocks that support them (blockquote, text_link, etc.)
  if (
    blockType === "blockquote" ||
    blockType === "link" ||
    blockType === "mention" ||
    blockType === "hashtag"
  ) {
    // For blockquotes, also find nested structural entities
    if (blockType === "blockquote") {
      const nestedFormatting = getFormattingMarks(
        structural.start,
        structural.end,
        formattingRanges,
      );
      if (nestedFormatting.length > 0) {
        block.formatting = nestedFormatting;
      }
    } else {
      const formatting = getFormattingMarks(structural.start, structural.end, formattingRanges);
      if (formatting.length > 0) {
        block.formatting = formatting;
      }
    }
  }

  return block;
}

// ─── Media Extraction ───────────────────────────────────────────────────────

/**
 * Extract the best (largest) photo from a Telegram photo array.
 */
function getBestPhoto(photos: TelegramPhotoSize[]): TelegramPhotoSize | null {
  if (!photos || photos.length === 0) return null;
  return photos.reduce((best, current) =>
    current.width * current.height > best.width * best.height ? current : best,
  );
}

/**
 * Extract all media from a Telegram message.
 */
export function extractMedia(message: TelegramMessage): ParsedMedia[] {
  const media: ParsedMedia[] = [];

  if (message.photo && message.photo.length > 0) {
    const best = getBestPhoto(message.photo);
    if (best) {
      media.push({
        type: "photo",
        fileId: best.file_id,
        fileUniqueId: best.file_unique_id,
        width: best.width,
        height: best.height,
        fileSize: best.file_size,
      });
    }
  }

  const mediaTypes: Array<{
    key: keyof TelegramMessage;
    type: TelegramMediaType;
  }> = [
    { key: "video", type: "video" },
    { key: "document", type: "document" },
    { key: "audio", type: "audio" },
    { key: "voice", type: "voice" },
    { key: "video_note", type: "video_note" },
    { key: "animation", type: "animation" },
    { key: "sticker", type: "sticker" },
  ];

  for (const { key, type } of mediaTypes) {
    const obj = message[key];
    if (obj && typeof obj === "object" && "file_id" in obj) {
      const mediaObj = obj as {
        file_id: string;
        file_unique_id: string;
        file_name?: string;
        mime_type?: string;
        file_size?: number;
        width?: number;
        height?: number;
        duration?: number;
      };
      media.push({
        type,
        fileId: mediaObj.file_id,
        fileUniqueId: mediaObj.file_unique_id,
        fileName: mediaObj.file_name,
        mimeType: mediaObj.mime_type,
        fileSize: mediaObj.file_size,
        width: mediaObj.width,
        height: mediaObj.height,
        duration: mediaObj.duration,
      });
    }
  }

  return media;
}

// ─── Forward Info Extraction ────────────────────────────────────────────────

/**
 * Extract forward attribution information from a message.
 */
export function extractForwardInfo(message: TelegramMessage): ForwardInfo | undefined {
  if (!message.forward_from && !message.forward_from_chat && !message.forward_sender_name) {
    return undefined;
  }

  const info: ForwardInfo = {
    authorName: "",
  };

  if (message.forward_sender_name) {
    info.authorName = message.forward_sender_name;
  } else if (message.forward_from) {
    const parts = [message.forward_from.first_name];
    if (message.forward_from.last_name) {
      parts.push(message.forward_from.last_name);
    }
    info.authorName = parts.join(" ");
    if (message.forward_from.username) {
      info.authorUsername = message.forward_from.username;
    }
  }

  if (message.forward_from_chat) {
    info.channelTitle = message.forward_from_chat.title;
    info.channelUsername = message.forward_from_chat.username;
    // If no author name from user, use channel title
    if (!info.authorName && message.forward_from_chat.title) {
      info.authorName = message.forward_from_chat.title;
    }
  }

  if (message.forward_date) {
    info.date = message.forward_date;
  }

  return info;
}

// ─── Main Parser ────────────────────────────────────────────────────────────

/**
 * Parse a single Telegram message into structured content.
 *
 * Handles:
 * - Text messages with entities
 * - Media messages with captions
 * - Media-only messages
 * - Forwarded messages
 */
export function parseTelegramMessage(message: TelegramMessage): ParsedContent {
  const rawText = message.text ?? message.caption ?? "";
  const entities = message.text ? (message.entities ?? []) : (message.caption_entities ?? []);

  const blocks = parseEntities(rawText, entities);
  const media = extractMedia(message);
  const forward = extractForwardInfo(message);

  return {
    blocks,
    media,
    forward,
    rawText,
    isMediaOnly: !rawText && media.length > 0,
    mediaGroupId: message.media_group_id,
    messageId: message.message_id,
    date: message.date,
  };
}

/**
 * Parse and merge a media group (album) of messages into a single content item.
 *
 * Media groups in Telegram are sent as multiple messages with the same
 * media_group_id. This function merges them:
 * - Takes text/caption from the first message that has one
 * - Collects all media items from all messages
 * - Preserves forward info from the first message
 */
export function parseMediaGroup(messages: TelegramMessage[]): ParsedMediaGroup {
  if (messages.length === 0) {
    throw new Error("Cannot parse empty media group");
  }

  // Sort by message_id to ensure consistent ordering
  const sorted = [...messages].sort((a, b) => a.message_id - b.message_id);

  // Find the first message with text content
  const textMessage = sorted.find((m) => m.text ?? m.caption);
  const rawText = textMessage ? (textMessage.text ?? textMessage.caption ?? "") : "";
  const entities = textMessage
    ? textMessage.text
      ? (textMessage.entities ?? [])
      : (textMessage.caption_entities ?? [])
    : [];

  const blocks = parseEntities(rawText, entities);

  // Collect all media from all messages
  const allMedia: ParsedMedia[] = [];
  for (const msg of sorted) {
    allMedia.push(...extractMedia(msg));
  }

  // Get forward info from first message
  const forward = extractForwardInfo(sorted[0]);

  // Get the common media_group_id
  const mediaGroupId = sorted[0].media_group_id ?? `group_${sorted[0].message_id}`;

  return {
    blocks,
    media: allMedia,
    forward,
    rawText,
    mediaGroupId,
    messageIds: sorted.map((m) => m.message_id),
    date: sorted[0].date,
  };
}
