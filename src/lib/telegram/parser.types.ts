/**
 * Telegram Message Parser Types
 *
 * Structured intermediate format for parsed Telegram messages.
 * Used by converters (toMarkdown, toPlainText, toHTML) and downstream
 * modules (webhook pipeline, AI adaptation).
 */

// ─── Telegram API Input Types ────────────────────────────────────────────────

/** Telegram MessageEntity types as defined in the Bot API */
export type TelegramEntityType =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "code"
  | "pre"
  | "text_link"
  | "mention"
  | "hashtag"
  | "url"
  | "bot_command"
  | "email"
  | "phone_number"
  | "spoiler"
  | "custom_emoji_id"
  | "blockquote"
  | "expandable_blockquote";

/** Telegram MessageEntity from Bot API (offsets are UTF-16 code units) */
export interface TelegramEntity {
  type: TelegramEntityType;
  /** Offset in UTF-16 code units */
  offset: number;
  /** Length in UTF-16 code units */
  length: number;
  /** For text_link entities */
  url?: string;
  /** For pre entities — programming language */
  language?: string;
  /** For custom_emoji_id entities */
  custom_emoji_id?: string;
  /** For mention entities — the user object (optional) */
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
}

/** Media types supported in Telegram messages */
export type TelegramMediaType =
  | "photo"
  | "video"
  | "document"
  | "audio"
  | "voice"
  | "video_note"
  | "animation"
  | "sticker";

/** Telegram photo size object */
export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

/** Telegram document/video/audio object (simplified) */
export interface TelegramMediaObject {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  duration?: number;
  width?: number;
  height?: number;
  thumb?: TelegramPhotoSize;
}

/** Input message from Telegram Bot API (relevant fields only) */
export interface TelegramMessage {
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  entities?: TelegramEntity[];
  caption_entities?: TelegramEntity[];
  /** Photo array (multiple sizes, pick largest) */
  photo?: TelegramPhotoSize[];
  video?: TelegramMediaObject;
  document?: TelegramMediaObject;
  audio?: TelegramMediaObject;
  voice?: TelegramMediaObject;
  video_note?: TelegramMediaObject;
  animation?: TelegramMediaObject;
  sticker?: TelegramMediaObject;
  /** Media group ID for album messages */
  media_group_id?: string;
  /** Forwarded message info */
  forward_from?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  forward_from_chat?: {
    id: number;
    type: string;
    title?: string;
    username?: string;
  };
  forward_date?: number;
  forward_sender_name?: string;
  /** Chat info */
  chat: {
    id: number;
    type: string;
    title?: string;
    username?: string;
  };
  from?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    is_bot: boolean;
  };
}

// ─── Parsed Output Types ─────────────────────────────────────────────────────

/** Formatting marks that can be applied to text */
export type FormattingType =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "code"
  | "spoiler";

/** A single formatting range within a text block */
export interface FormattingMark {
  type: FormattingType;
  /** Start index in the block's text (JS string index) */
  start: number;
  /** End index in the block's text (JS string index, exclusive) */
  end: number;
}

/** Content block types in the parsed output */
export type ContentBlockType =
  | "text"
  | "code_block"
  | "blockquote"
  | "link"
  | "mention"
  | "hashtag"
  | "bot_command"
  | "email"
  | "phone_number"
  | "custom_emoji"
  | "media";

/** A block of parsed content */
export interface ContentBlock {
  type: ContentBlockType;
  text: string;
  /** URL for link blocks */
  url?: string;
  /** Programming language for code_block */
  language?: string;
  /** Custom emoji ID */
  customEmojiId?: string;
  /** Whether blockquote is expandable */
  expandable?: boolean;
  /** Inline formatting marks (for text and blockquote blocks) */
  formatting?: FormattingMark[];
}

/** Parsed media item */
export interface ParsedMedia {
  type: TelegramMediaType;
  fileId: string;
  fileUniqueId: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
}

/** Forward attribution info */
export interface ForwardInfo {
  /** Original author name (from forward_sender_name or constructed from user) */
  authorName: string;
  /** Original author username */
  authorUsername?: string;
  /** Original channel title */
  channelTitle?: string;
  /** Original channel username */
  channelUsername?: string;
  /** Original post date */
  date?: number;
}

/** The main parsed content structure */
export interface ParsedContent {
  /** Text content blocks in order */
  blocks: ContentBlock[];
  /** Extracted media items */
  media: ParsedMedia[];
  /** Forward attribution if message was forwarded */
  forward?: ForwardInfo;
  /** Original raw text (text or caption) */
  rawText: string;
  /** Whether this is a media-only post (no text) */
  isMediaOnly: boolean;
  /** Media group ID if part of an album */
  mediaGroupId?: string;
  /** Source message ID */
  messageId: number;
  /** Message timestamp */
  date: number;
}

/** Merged media group content */
export interface ParsedMediaGroup {
  /** Text content from the first message with text/caption */
  blocks: ContentBlock[];
  /** All media items from all messages in the group */
  media: ParsedMedia[];
  /** Forward info from the first message */
  forward?: ForwardInfo;
  /** Combined raw text */
  rawText: string;
  /** The media group ID */
  mediaGroupId: string;
  /** All message IDs in the group */
  messageIds: number[];
  /** Earliest message date */
  date: number;
}
