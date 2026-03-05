import { describe, it, expect } from "vitest";
import {
  parseTelegramMessage,
  parseMediaGroup,
  parseEntities,
  extractMedia,
  extractForwardInfo,
  sliceByUtf16,
  utf16OffsetToJsIndex,
} from "../parser";
import type {
  TelegramMessage,
  TelegramEntity,
} from "../parser.types";

// ─── Helper: create a minimal TelegramMessage ───────────────────────────────

function makeMessage(
  overrides: Partial<TelegramMessage> = {},
): TelegramMessage {
  return {
    message_id: 1,
    date: 1700000000,
    chat: { id: -1001234567890, type: "channel", title: "Test Channel" },
    ...overrides,
  };
}

function makeEntity(
  type: TelegramEntity["type"],
  offset: number,
  length: number,
  extra: Partial<TelegramEntity> = {},
): TelegramEntity {
  return { type, offset, length, ...extra };
}

// ─── UTF-16 Offset Conversion ────────────────────────────────────────────────

describe("UTF-16 offset conversion", () => {
  it("handles pure ASCII text", () => {
    const text = "Hello World";
    expect(utf16OffsetToJsIndex(text, 0)).toBe(0);
    expect(utf16OffsetToJsIndex(text, 5)).toBe(5);
    expect(utf16OffsetToJsIndex(text, 11)).toBe(11);
  });

  it("handles Cyrillic text (1 UTF-16 unit each)", () => {
    const text = "Привет мир";
    expect(utf16OffsetToJsIndex(text, 0)).toBe(0);
    expect(utf16OffsetToJsIndex(text, 6)).toBe(6); // space after "Привет"
    expect(utf16OffsetToJsIndex(text, 10)).toBe(10);
  });

  it("handles emoji (surrogate pairs = 2 UTF-16 units)", () => {
    // 💰 = U+1F4B0, encoded as 2 UTF-16 code units (surrogate pair)
    const text = "Hello 💰 World";
    // "Hello " = 6 units, 💰 = 2 units, " World" = 6 units = 14 total
    expect(text.length).toBe(14); // JS length counts UTF-16 code units
    expect(utf16OffsetToJsIndex(text, 6)).toBe(6); // start of emoji
    expect(utf16OffsetToJsIndex(text, 8)).toBe(8); // after emoji
    expect(sliceByUtf16(text, 6, 2)).toBe("💰");
  });

  it("handles mixed Cyrillic and emoji", () => {
    const text = "Привет 🌍!";
    // "Привет " = 7 units, 🌍 = 2 units, "!" = 1 unit = 10 total
    expect(text.length).toBe(10);
    expect(sliceByUtf16(text, 7, 2)).toBe("🌍");
    expect(sliceByUtf16(text, 0, 6)).toBe("Привет");
  });

  it("handles multiple emoji", () => {
    const text = "🔥💰🌍";
    // Each emoji = 2 UTF-16 units = 6 total
    expect(text.length).toBe(6);
    expect(sliceByUtf16(text, 0, 2)).toBe("🔥");
    expect(sliceByUtf16(text, 2, 2)).toBe("💰");
    expect(sliceByUtf16(text, 4, 2)).toBe("🌍");
  });

  it("clamps out-of-bounds offsets", () => {
    const text = "Hello";
    expect(utf16OffsetToJsIndex(text, -5)).toBe(0);
    expect(utf16OffsetToJsIndex(text, 100)).toBe(5);
  });

  it("handles empty string", () => {
    expect(utf16OffsetToJsIndex("", 0)).toBe(0);
    expect(sliceByUtf16("", 0, 0)).toBe("");
  });
});

// ─── parseEntities ──────────────────────────────────────────────────────────

describe("parseEntities", () => {
  it("returns single text block for plain text", () => {
    const blocks = parseEntities("Hello World", []);
    expect(blocks).toEqual([{ type: "text", text: "Hello World" }]);
  });

  it("returns empty array for empty text", () => {
    const blocks = parseEntities("", []);
    expect(blocks).toEqual([]);
  });

  it("returns single text block when entities is undefined-like", () => {
    const blocks = parseEntities("Hello", []);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe("Hello");
  });

  describe("bold entity", () => {
    it("parses bold text", () => {
      const blocks = parseEntities("Hello bold World", [
        makeEntity("bold", 6, 4),
      ]);
      // Bold is a formatting mark on a text block
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe("text");
      expect(blocks[0].text).toBe("Hello bold World");
      expect(blocks[0].formatting).toEqual([
        { type: "bold", start: 6, end: 10 },
      ]);
    });
  });

  describe("italic entity", () => {
    it("parses italic text", () => {
      const blocks = parseEntities("Say hello", [
        makeEntity("italic", 4, 5),
      ]);
      expect(blocks[0].formatting).toEqual([
        { type: "italic", start: 4, end: 9 },
      ]);
    });
  });

  describe("underline entity", () => {
    it("parses underline text", () => {
      const blocks = parseEntities("Important text", [
        makeEntity("underline", 0, 9),
      ]);
      expect(blocks[0].formatting).toEqual([
        { type: "underline", start: 0, end: 9 },
      ]);
    });
  });

  describe("strikethrough entity", () => {
    it("parses strikethrough text", () => {
      const blocks = parseEntities("Old new", [
        makeEntity("strikethrough", 0, 3),
      ]);
      expect(blocks[0].formatting).toEqual([
        { type: "strikethrough", start: 0, end: 3 },
      ]);
    });
  });

  describe("code entity", () => {
    it("parses inline code", () => {
      const blocks = parseEntities("Use const x = 1 here", [
        makeEntity("code", 4, 11),
      ]);
      expect(blocks[0].formatting).toEqual([
        { type: "code", start: 4, end: 15 },
      ]);
    });
  });

  describe("spoiler entity", () => {
    it("parses spoiler text", () => {
      const blocks = parseEntities("The answer is 42", [
        makeEntity("spoiler", 14, 2),
      ]);
      expect(blocks[0].formatting).toEqual([
        { type: "spoiler", start: 14, end: 16 },
      ]);
    });
  });

  describe("pre (code block) entity", () => {
    it("parses code block without language", () => {
      const text = "Before\nconst x = 1;\nAfter";
      // "Before\n" = 7 chars, "const x = 1;" = 12 chars
      const blocks = parseEntities(text, [makeEntity("pre", 7, 12)]);
      expect(blocks).toHaveLength(3);
      expect(blocks[0]).toEqual({ type: "text", text: "Before\n" });
      expect(blocks[1]).toEqual({ type: "code_block", text: "const x = 1;" });
      expect(blocks[2]).toEqual({ type: "text", text: "\nAfter" });
    });

    it("parses code block with language", () => {
      const text = "const x = 1;";
      const blocks = parseEntities(text, [
        makeEntity("pre", 0, 13, { language: "javascript" }),
      ]);
      expect(blocks).toEqual([
        { type: "code_block", text: "const x = 1;", language: "javascript" },
      ]);
    });
  });

  describe("text_link entity", () => {
    it("parses text link", () => {
      const text = "Click here for more";
      const blocks = parseEntities(text, [
        makeEntity("text_link", 6, 4, { url: "https://example.com" }),
      ]);
      expect(blocks).toHaveLength(3);
      expect(blocks[0]).toEqual({ type: "text", text: "Click " });
      expect(blocks[1]).toEqual({
        type: "link",
        text: "here",
        url: "https://example.com",
      });
      expect(blocks[2]).toEqual({ type: "text", text: " for more" });
    });
  });

  describe("url entity", () => {
    it("parses URL entity", () => {
      const text = "Visit https://example.com today";
      const blocks = parseEntities(text, [makeEntity("url", 6, 19)]);
      expect(blocks).toHaveLength(3);
      expect(blocks[1]).toEqual({
        type: "link",
        text: "https://example.com",
        url: "https://example.com",
      });
    });
  });

  describe("mention entity", () => {
    it("parses mention", () => {
      const text = "Hello @username!";
      const blocks = parseEntities(text, [makeEntity("mention", 6, 9)]);
      expect(blocks).toHaveLength(3);
      expect(blocks[1]).toEqual({ type: "mention", text: "@username" });
    });
  });

  describe("hashtag entity", () => {
    it("parses hashtag", () => {
      const text = "Check #trending now";
      const blocks = parseEntities(text, [makeEntity("hashtag", 6, 9)]);
      expect(blocks).toHaveLength(3);
      expect(blocks[1]).toEqual({ type: "hashtag", text: "#trending" });
    });
  });

  describe("bot_command entity", () => {
    it("parses bot command", () => {
      const text = "/start the bot";
      const blocks = parseEntities(text, [makeEntity("bot_command", 0, 6)]);
      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toEqual({ type: "bot_command", text: "/start" });
    });
  });

  describe("email entity", () => {
    it("parses email", () => {
      const text = "Contact user@example.com now";
      const blocks = parseEntities(text, [makeEntity("email", 8, 16)]);
      expect(blocks[1]).toEqual({ type: "email", text: "user@example.com" });
    });
  });

  describe("phone_number entity", () => {
    it("parses phone number", () => {
      const text = "Call +1234567890 now";
      const blocks = parseEntities(text, [makeEntity("phone_number", 5, 11)]);
      expect(blocks[1]).toEqual({
        type: "phone_number",
        text: "+1234567890",
      });
    });
  });

  describe("blockquote entity", () => {
    it("parses blockquote", () => {
      const text = "Before\nQuoted text\nAfter";
      const blocks = parseEntities(text, [makeEntity("blockquote", 7, 11)]);
      expect(blocks).toHaveLength(3);
      expect(blocks[1]).toEqual({ type: "blockquote", text: "Quoted text" });
    });

    it("parses expandable blockquote", () => {
      const text = "Expandable quote here";
      const blocks = parseEntities(text, [
        makeEntity("expandable_blockquote", 0, 21),
      ]);
      expect(blocks[0]).toEqual({
        type: "blockquote",
        text: "Expandable quote here",
        expandable: true,
      });
    });
  });

  describe("custom_emoji_id entity", () => {
    it("parses custom emoji", () => {
      const text = "Hello 😀 World";
      const blocks = parseEntities(text, [
        makeEntity("custom_emoji_id", 6, 2, {
          custom_emoji_id: "5368324170671202286",
        }),
      ]);
      expect(blocks[1]).toEqual({
        type: "custom_emoji",
        text: "😀",
        customEmojiId: "5368324170671202286",
      });
    });
  });

  describe("multiple entities", () => {
    it("parses multiple non-overlapping entities", () => {
      const text = "Bold and italic text";
      const blocks = parseEntities(text, [
        makeEntity("bold", 0, 4),
        makeEntity("italic", 9, 6),
      ]);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].formatting).toEqual([
        { type: "bold", start: 0, end: 4 },
        { type: "italic", start: 9, end: 15 },
      ]);
    });

    it("parses nested formatting (bold inside italic)", () => {
      const text = "Hello world";
      const blocks = parseEntities(text, [
        makeEntity("italic", 0, 11),
        makeEntity("bold", 6, 5),
      ]);
      expect(blocks[0].formatting).toContainEqual({
        type: "italic",
        start: 0,
        end: 11,
      });
      expect(blocks[0].formatting).toContainEqual({
        type: "bold",
        start: 6,
        end: 11,
      });
    });

    it("handles mixed structural and formatting entities", () => {
      const text = "Hello bold @user world";
      const blocks = parseEntities(text, [
        makeEntity("bold", 6, 4),
        makeEntity("mention", 11, 5),
      ]);
      // "Hello " = text with no formatting
      // "bold " = text with bold formatting
      // "@user" = mention
      // " world" = text
      expect(blocks.length).toBeGreaterThanOrEqual(3);
      const mentionBlock = blocks.find((b) => b.type === "mention");
      expect(mentionBlock).toBeDefined();
      expect(mentionBlock?.text).toBe("@user");
    });
  });

  describe("overlapping entities", () => {
    it("handles overlapping bold and italic", () => {
      // "AAABBBCCC" where bold covers AAA-BBB, italic covers BBB-CCC
      const text = "AAABBBCCC";
      const blocks = parseEntities(text, [
        makeEntity("bold", 0, 6), // AAABBB
        makeEntity("italic", 3, 6), // BBBCCC
      ]);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].formatting).toHaveLength(2);
    });
  });

  describe("entities with emoji", () => {
    it("correctly handles bold after emoji", () => {
      // "🔥 Bold" — emoji is 2 UTF-16 units
      const text = "🔥 Bold";
      const blocks = parseEntities(text, [
        makeEntity("bold", 3, 4), // starts after "🔥 " (2+1=3 UTF-16 units)
      ]);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].formatting).toEqual([
        { type: "bold", start: 3, end: 7 },
      ]);
    });

    it("correctly handles mention after multiple emoji", () => {
      const text = "🔥💰 @user";
      // 🔥=2, 💰=2, " "=1, "@user"=5 — mention starts at offset 5
      const blocks = parseEntities(text, [
        makeEntity("mention", 5, 5),
      ]);
      const mentionBlock = blocks.find((b) => b.type === "mention");
      expect(mentionBlock).toBeDefined();
      expect(mentionBlock?.text).toBe("@user");
    });
  });
});

// ─── extractMedia ───────────────────────────────────────────────────────────

describe("extractMedia", () => {
  it("returns empty array for text-only message", () => {
    const msg = makeMessage({ text: "Hello" });
    expect(extractMedia(msg)).toEqual([]);
  });

  it("extracts photo (best resolution)", () => {
    const msg = makeMessage({
      photo: [
        {
          file_id: "small",
          file_unique_id: "s1",
          width: 100,
          height: 100,
        },
        {
          file_id: "large",
          file_unique_id: "l1",
          width: 1280,
          height: 720,
        },
        {
          file_id: "medium",
          file_unique_id: "m1",
          width: 640,
          height: 360,
        },
      ],
    });
    const media = extractMedia(msg);
    expect(media).toHaveLength(1);
    expect(media[0].fileId).toBe("large");
    expect(media[0].type).toBe("photo");
    expect(media[0].width).toBe(1280);
    expect(media[0].height).toBe(720);
  });

  it("extracts video", () => {
    const msg = makeMessage({
      video: {
        file_id: "vid1",
        file_unique_id: "v1",
        width: 1920,
        height: 1080,
        duration: 60,
        mime_type: "video/mp4",
      },
    });
    const media = extractMedia(msg);
    expect(media).toHaveLength(1);
    expect(media[0]).toEqual({
      type: "video",
      fileId: "vid1",
      fileUniqueId: "v1",
      width: 1920,
      height: 1080,
      duration: 60,
      mimeType: "video/mp4",
      fileName: undefined,
      fileSize: undefined,
    });
  });

  it("extracts document", () => {
    const msg = makeMessage({
      document: {
        file_id: "doc1",
        file_unique_id: "d1",
        file_name: "report.pdf",
        mime_type: "application/pdf",
        file_size: 1024,
      },
    });
    const media = extractMedia(msg);
    expect(media).toHaveLength(1);
    expect(media[0].type).toBe("document");
    expect(media[0].fileName).toBe("report.pdf");
  });

  it("extracts audio", () => {
    const msg = makeMessage({
      audio: {
        file_id: "aud1",
        file_unique_id: "a1",
        duration: 180,
        mime_type: "audio/mpeg",
      },
    });
    const media = extractMedia(msg);
    expect(media).toHaveLength(1);
    expect(media[0].type).toBe("audio");
    expect(media[0].duration).toBe(180);
  });

  it("extracts voice", () => {
    const msg = makeMessage({
      voice: {
        file_id: "voice1",
        file_unique_id: "vo1",
        duration: 5,
        mime_type: "audio/ogg",
      },
    });
    const media = extractMedia(msg);
    expect(media[0].type).toBe("voice");
  });

  it("extracts video_note", () => {
    const msg = makeMessage({
      video_note: {
        file_id: "vn1",
        file_unique_id: "vn1",
        duration: 10,
        width: 240,
        height: 240,
      },
    });
    const media = extractMedia(msg);
    expect(media[0].type).toBe("video_note");
  });

  it("extracts animation (GIF)", () => {
    const msg = makeMessage({
      animation: {
        file_id: "anim1",
        file_unique_id: "an1",
        width: 320,
        height: 240,
        duration: 3,
      },
    });
    const media = extractMedia(msg);
    expect(media[0].type).toBe("animation");
  });

  it("extracts sticker", () => {
    const msg = makeMessage({
      sticker: {
        file_id: "sticker1",
        file_unique_id: "st1",
        width: 512,
        height: 512,
      },
    });
    const media = extractMedia(msg);
    expect(media[0].type).toBe("sticker");
  });

  it("extracts multiple media types from single message", () => {
    const msg = makeMessage({
      photo: [
        { file_id: "ph1", file_unique_id: "p1", width: 800, height: 600 },
      ],
      document: {
        file_id: "doc1",
        file_unique_id: "d1",
        file_name: "file.txt",
      },
    });
    const media = extractMedia(msg);
    expect(media).toHaveLength(2);
  });
});

// ─── extractForwardInfo ─────────────────────────────────────────────────────

describe("extractForwardInfo", () => {
  it("returns undefined for non-forwarded message", () => {
    const msg = makeMessage({ text: "Hello" });
    expect(extractForwardInfo(msg)).toBeUndefined();
  });

  it("extracts forward from user", () => {
    const msg = makeMessage({
      text: "Forwarded",
      forward_from: {
        id: 123,
        first_name: "John",
        last_name: "Doe",
        username: "johndoe",
      },
      forward_date: 1700000000,
    });
    const info = extractForwardInfo(msg);
    expect(info).toEqual({
      authorName: "John Doe",
      authorUsername: "johndoe",
      date: 1700000000,
    });
  });

  it("extracts forward from user without last name", () => {
    const msg = makeMessage({
      text: "Forwarded",
      forward_from: {
        id: 123,
        first_name: "Alice",
      },
    });
    const info = extractForwardInfo(msg);
    expect(info?.authorName).toBe("Alice");
  });

  it("extracts forward from channel", () => {
    const msg = makeMessage({
      text: "Forwarded",
      forward_from_chat: {
        id: -1001111111111,
        type: "channel",
        title: "News Channel",
        username: "newschannel",
      },
      forward_date: 1700000000,
    });
    const info = extractForwardInfo(msg);
    expect(info?.channelTitle).toBe("News Channel");
    expect(info?.channelUsername).toBe("newschannel");
    expect(info?.authorName).toBe("News Channel");
  });

  it("extracts forward_sender_name (hidden user)", () => {
    const msg = makeMessage({
      text: "Forwarded",
      forward_sender_name: "Hidden User",
    });
    const info = extractForwardInfo(msg);
    expect(info?.authorName).toBe("Hidden User");
  });

  it("prefers forward_sender_name over forward_from", () => {
    const msg = makeMessage({
      text: "Forwarded",
      forward_sender_name: "Display Name",
      forward_from: { id: 123, first_name: "Real" },
    });
    const info = extractForwardInfo(msg);
    expect(info?.authorName).toBe("Display Name");
  });
});

// ─── parseTelegramMessage ───────────────────────────────────────────────────

describe("parseTelegramMessage", () => {
  it("parses a simple text message", () => {
    const msg = makeMessage({
      text: "Hello World",
      message_id: 42,
      date: 1700000000,
    });
    const result = parseTelegramMessage(msg);
    expect(result.rawText).toBe("Hello World");
    expect(result.isMediaOnly).toBe(false);
    expect(result.messageId).toBe(42);
    expect(result.date).toBe(1700000000);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]).toEqual({ type: "text", text: "Hello World" });
    expect(result.media).toEqual([]);
    expect(result.forward).toBeUndefined();
  });

  it("parses a text message with entities", () => {
    const msg = makeMessage({
      text: "Hello bold World",
      entities: [makeEntity("bold", 6, 4)],
    });
    const result = parseTelegramMessage(msg);
    expect(result.blocks[0].formatting).toEqual([
      { type: "bold", start: 6, end: 10 },
    ]);
  });

  it("parses a media message with caption", () => {
    const msg = makeMessage({
      caption: "Photo caption with bold",
      caption_entities: [makeEntity("bold", 20, 4)],
      photo: [
        { file_id: "ph1", file_unique_id: "p1", width: 800, height: 600 },
      ],
    });
    const result = parseTelegramMessage(msg);
    expect(result.rawText).toBe("Photo caption with bold");
    expect(result.blocks[0].text).toBe("Photo caption with bold");
    expect(result.media).toHaveLength(1);
    expect(result.isMediaOnly).toBe(false);
  });

  it("parses a media-only message", () => {
    const msg = makeMessage({
      photo: [
        { file_id: "ph1", file_unique_id: "p1", width: 800, height: 600 },
      ],
    });
    const result = parseTelegramMessage(msg);
    expect(result.rawText).toBe("");
    expect(result.isMediaOnly).toBe(true);
    expect(result.blocks).toEqual([]);
    expect(result.media).toHaveLength(1);
  });

  it("parses a forwarded message", () => {
    const msg = makeMessage({
      text: "Forwarded content",
      forward_from: {
        id: 123,
        first_name: "John",
        username: "john",
      },
      forward_date: 1700000000,
    });
    const result = parseTelegramMessage(msg);
    expect(result.forward).toBeDefined();
    expect(result.forward?.authorName).toBe("John");
  });

  it("preserves media_group_id", () => {
    const msg = makeMessage({
      caption: "Album caption",
      media_group_id: "12345",
      photo: [
        { file_id: "ph1", file_unique_id: "p1", width: 800, height: 600 },
      ],
    });
    const result = parseTelegramMessage(msg);
    expect(result.mediaGroupId).toBe("12345");
  });

  it("handles empty message (no text, no media)", () => {
    const msg = makeMessage({});
    const result = parseTelegramMessage(msg);
    expect(result.rawText).toBe("");
    expect(result.blocks).toEqual([]);
    expect(result.media).toEqual([]);
    expect(result.isMediaOnly).toBe(false);
  });

  it("parses message with all entity types", () => {
    const text =
      "bold italic underline strike code @user #tag /cmd user@email.com +1234567890 https://example.com spoiler";
    const entities: TelegramEntity[] = [
      makeEntity("bold", 0, 4),
      makeEntity("italic", 5, 6),
      makeEntity("underline", 12, 9),
      makeEntity("strikethrough", 22, 6),
      makeEntity("code", 29, 4),
      makeEntity("mention", 34, 5),
      makeEntity("hashtag", 40, 4),
      makeEntity("bot_command", 45, 4),
      makeEntity("email", 50, 14),
      makeEntity("phone_number", 65, 11),
      makeEntity("url", 77, 19),
      makeEntity("spoiler", 97, 7),
    ];
    const msg = makeMessage({ text, entities });
    const result = parseTelegramMessage(msg);
    // Should have blocks for structural entities and text blocks between them
    expect(result.blocks.length).toBeGreaterThan(0);
    // Verify specific structural blocks exist
    const types = result.blocks.map((b) => b.type);
    expect(types).toContain("mention");
    expect(types).toContain("hashtag");
    expect(types).toContain("bot_command");
    expect(types).toContain("email");
    expect(types).toContain("phone_number");
    expect(types).toContain("link");
  });
});

// ─── parseMediaGroup ────────────────────────────────────────────────────────

describe("parseMediaGroup", () => {
  it("throws on empty messages array", () => {
    expect(() => parseMediaGroup([])).toThrow("Cannot parse empty media group");
  });

  it("merges album messages", () => {
    const messages: TelegramMessage[] = [
      makeMessage({
        message_id: 1,
        caption: "Album description",
        media_group_id: "group1",
        photo: [
          { file_id: "ph1", file_unique_id: "p1", width: 800, height: 600 },
        ],
      }),
      makeMessage({
        message_id: 2,
        media_group_id: "group1",
        photo: [
          { file_id: "ph2", file_unique_id: "p2", width: 800, height: 600 },
        ],
      }),
      makeMessage({
        message_id: 3,
        media_group_id: "group1",
        photo: [
          { file_id: "ph3", file_unique_id: "p3", width: 800, height: 600 },
        ],
      }),
    ];

    const result = parseMediaGroup(messages);
    expect(result.rawText).toBe("Album description");
    expect(result.media).toHaveLength(3);
    expect(result.mediaGroupId).toBe("group1");
    expect(result.messageIds).toEqual([1, 2, 3]);
    expect(result.blocks).toHaveLength(1);
  });

  it("takes caption from first message with one", () => {
    const messages: TelegramMessage[] = [
      makeMessage({
        message_id: 1,
        media_group_id: "group1",
        photo: [
          { file_id: "ph1", file_unique_id: "p1", width: 800, height: 600 },
        ],
      }),
      makeMessage({
        message_id: 2,
        caption: "Caption on second photo",
        media_group_id: "group1",
        photo: [
          { file_id: "ph2", file_unique_id: "p2", width: 800, height: 600 },
        ],
      }),
    ];

    const result = parseMediaGroup(messages);
    expect(result.rawText).toBe("Caption on second photo");
  });

  it("sorts messages by message_id", () => {
    const messages: TelegramMessage[] = [
      makeMessage({
        message_id: 3,
        media_group_id: "g1",
        photo: [
          { file_id: "ph3", file_unique_id: "p3", width: 100, height: 100 },
        ],
      }),
      makeMessage({
        message_id: 1,
        media_group_id: "g1",
        caption: "First",
        photo: [
          { file_id: "ph1", file_unique_id: "p1", width: 100, height: 100 },
        ],
      }),
      makeMessage({
        message_id: 2,
        media_group_id: "g1",
        photo: [
          { file_id: "ph2", file_unique_id: "p2", width: 100, height: 100 },
        ],
      }),
    ];

    const result = parseMediaGroup(messages);
    expect(result.messageIds).toEqual([1, 2, 3]);
    // Media order should match sorted message order
    expect(result.media[0].fileId).toBe("ph1");
    expect(result.media[1].fileId).toBe("ph2");
    expect(result.media[2].fileId).toBe("ph3");
  });

  it("preserves forward info from first message", () => {
    const messages: TelegramMessage[] = [
      makeMessage({
        message_id: 1,
        media_group_id: "g1",
        forward_sender_name: "Original Author",
        photo: [
          { file_id: "ph1", file_unique_id: "p1", width: 100, height: 100 },
        ],
      }),
      makeMessage({
        message_id: 2,
        media_group_id: "g1",
        photo: [
          { file_id: "ph2", file_unique_id: "p2", width: 100, height: 100 },
        ],
      }),
    ];

    const result = parseMediaGroup(messages);
    expect(result.forward?.authorName).toBe("Original Author");
  });

  it("handles group with mixed media types", () => {
    const messages: TelegramMessage[] = [
      makeMessage({
        message_id: 1,
        caption: "Mixed media",
        media_group_id: "g1",
        photo: [
          { file_id: "ph1", file_unique_id: "p1", width: 800, height: 600 },
        ],
      }),
      makeMessage({
        message_id: 2,
        media_group_id: "g1",
        video: {
          file_id: "vid1",
          file_unique_id: "v1",
          width: 1920,
          height: 1080,
          duration: 30,
        },
      }),
    ];

    const result = parseMediaGroup(messages);
    expect(result.media).toHaveLength(2);
    expect(result.media[0].type).toBe("photo");
    expect(result.media[1].type).toBe("video");
  });

  it("handles group where no message has text", () => {
    const messages: TelegramMessage[] = [
      makeMessage({
        message_id: 1,
        media_group_id: "g1",
        photo: [
          { file_id: "ph1", file_unique_id: "p1", width: 100, height: 100 },
        ],
      }),
      makeMessage({
        message_id: 2,
        media_group_id: "g1",
        photo: [
          { file_id: "ph2", file_unique_id: "p2", width: 100, height: 100 },
        ],
      }),
    ];

    const result = parseMediaGroup(messages);
    expect(result.rawText).toBe("");
    expect(result.blocks).toEqual([]);
    expect(result.media).toHaveLength(2);
  });
});
