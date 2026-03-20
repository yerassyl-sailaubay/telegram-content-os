import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequest } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
}));

vi.mock("@/lib/telegram/client", () => ({
  getTelegramClient: vi.fn(() => ({
    request: mockRequest,
  })),
}));

import { downloadTelegramVoiceFileById } from "../voice-notes";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
  process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.TELEGRAM_BOT_TOKEN;
});

describe("downloadTelegramVoiceFileById", () => {
  it("loads file path from Telegram and downloads bytes", async () => {
    mockRequest.mockResolvedValueOnce({
      file_id: "voice-file-1",
      file_unique_id: "voice-unique-1",
      file_path: "voice/file.oga",
      file_size: 128,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      arrayBuffer: async () => Buffer.from("voice-audio").buffer,
    });

    const result = await downloadTelegramVoiceFileById("voice-file-1", {
      fallbackMimeType: "audio/ogg",
    });

    expect(mockRequest).toHaveBeenCalledWith("getFile", { file_id: "voice-file-1" });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.telegram.org/file/bottest-bot-token/voice/file.oga",
    );
    expect(result.mimeType).toBe("audio/ogg");
    expect(result.filePath).toBe("voice/file.oga");
    expect(result.bytes.byteLength).toBeGreaterThan(0);
  });

  it("throws when Telegram does not return file_path", async () => {
    mockRequest.mockResolvedValueOnce({
      file_id: "voice-file-1",
      file_unique_id: "voice-unique-1",
    });

    await expect(downloadTelegramVoiceFileById("voice-file-1")).rejects.toThrow("file path");
  });

  it("throws when file download request fails", async () => {
    mockRequest.mockResolvedValueOnce({
      file_id: "voice-file-1",
      file_unique_id: "voice-unique-1",
      file_path: "voice/file.oga",
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      arrayBuffer: async () => Buffer.alloc(0).buffer,
    });

    await expect(downloadTelegramVoiceFileById("voice-file-1")).rejects.toThrow("HTTP 502");
  });
});
