/**
 * Telegram Bot API type definitions.
 *
 * Covers the subset of the Bot API used by this application:
 * incoming webhook updates, messages, chats, and API responses.
 *
 * @see https://core.telegram.org/bots/api
 */

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  description?: string;
  invite_link?: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  thumbnail?: TelegramPhotoSize;
}

export interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  thumbnail?: TelegramPhotoSize;
}

export interface TelegramAudio {
  file_id: string;
  file_unique_id: string;
  duration: number;
  performer?: string;
  title?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  thumbnail?: TelegramPhotoSize;
}

export interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramAnimation {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  thumbnail?: TelegramPhotoSize;
}

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
  language?: string;
}

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  sender_chat?: TelegramChat;
  date: number;
  chat: TelegramChat;
  text?: string;
  caption?: string;
  entities?: TelegramMessageEntity[];
  caption_entities?: TelegramMessageEntity[];
  photo?: TelegramPhotoSize[];
  document?: TelegramDocument;
  video?: TelegramVideo;
  audio?: TelegramAudio;
  voice?: TelegramVoice;
  animation?: TelegramAnimation;
  media_group_id?: string;
  forward_date?: number;
  forward_from?: TelegramUser;
  forward_from_chat?: TelegramChat;
  views?: number;
  forwards?: number;
  new_chat_members?: TelegramUser[];
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
}

// ---------------------------------------------------------------------------
// API response wrapper
// ---------------------------------------------------------------------------

export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

// ---------------------------------------------------------------------------
// Method-specific result types
// ---------------------------------------------------------------------------

export interface TelegramChatMemberCount {
  count: number;
}

export interface TelegramSentMessage {
  message_id: number;
  chat: TelegramChat;
  date: number;
  text?: string;
}

// ---------------------------------------------------------------------------
// Input media types for sendMediaGroup
// ---------------------------------------------------------------------------

export interface InputMediaPhoto {
  type: "photo";
  media: string;
  caption?: string;
  parse_mode?: "HTML" | "MarkdownV2";
}

export interface InputMediaVideo {
  type: "video";
  media: string;
  caption?: string;
  parse_mode?: "HTML" | "MarkdownV2";
  width?: number;
  height?: number;
  duration?: number;
}

export interface SendPollOptions {
  is_anonymous?: boolean;
  type?: "regular" | "quiz";
  correct_option_id?: number;
  allows_multiple_answers?: boolean;
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class TelegramApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode?: number,
  ) {
    super(message);
    this.name = "TelegramApiError";
  }
}
