import { getTelegramClient } from "./client";

interface TelegramFileInfo {
  file_id: string;
  file_unique_id: string;
  file_path?: string;
  file_size?: number;
}

export interface DownloadTelegramVoiceFileOptions {
  botToken?: string;
  fallbackMimeType?: string;
}

export interface DownloadedTelegramVoiceFile {
  bytes: Buffer;
  mimeType: string;
  filePath: string;
  fileSize?: number;
}

const TELEGRAM_FILE_BASE = "https://api.telegram.org/file";

export async function downloadTelegramVoiceFileById(
  fileId: string,
  options: DownloadTelegramVoiceFileOptions = {},
): Promise<DownloadedTelegramVoiceFile> {
  const normalizedFileId = fileId.trim();
  if (!normalizedFileId) {
    throw new Error("Telegram voice file ID is required");
  }

  const client = getTelegramClient(options.botToken);
  const file = await client.request<TelegramFileInfo>("getFile", {
    file_id: normalizedFileId,
  });

  if (!file.file_path) {
    throw new Error("Telegram getFile response did not include a file path");
  }

  const botToken = options.botToken ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is required to download Telegram files");
  }

  const fileResponse = await fetch(`${TELEGRAM_FILE_BASE}/bot${botToken}/${file.file_path}`);
  if (!fileResponse.ok) {
    throw new Error(`Failed to download Telegram voice file: HTTP ${fileResponse.status}`);
  }

  const bytes = Buffer.from(await fileResponse.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error("Downloaded Telegram voice file is empty");
  }

  return {
    bytes,
    mimeType: options.fallbackMimeType ?? "audio/ogg",
    filePath: file.file_path,
    fileSize: file.file_size,
  };
}
