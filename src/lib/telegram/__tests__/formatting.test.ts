import { describe, expect, it } from "vitest";
import {
  prepareTelegramTextForSend,
  readTelegramComposerMetadata,
  renderTelegramMarkdownToHtml,
} from "../formatting";

describe("readTelegramComposerMetadata", () => {
  it("returns safe defaults when metadata is missing", () => {
    expect(readTelegramComposerMetadata(null)).toEqual({
      parseMode: undefined,
      imageUrl: null,
    });
  });

  it("extracts parseMode and imageUrl from telegramComposer", () => {
    expect(
      readTelegramComposerMetadata({
        telegramComposer: {
          parseMode: "MarkdownV2",
          imageUrl: "https://example.com/photo.jpg",
        },
      }),
    ).toEqual({
      parseMode: "MarkdownV2",
      imageUrl: "https://example.com/photo.jpg",
    });
  });
});

describe("renderTelegramMarkdownToHtml", () => {
  it("converts Telegram markdown markers to HTML tags", () => {
    const html = renderTelegramMarkdownToHtml(
      "*Bold* _Italic_ __Underlined__ ~Strike~ `code` [link](https://example.com)",
    );

    expect(html).toContain("<b>Bold</b>");
    expect(html).toContain("<i>Italic</i>");
    expect(html).toContain("<u>Underlined</u>");
    expect(html).toContain("<s>Strike</s>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain('<a href="https://example.com/">link</a>');
  });
});

describe("prepareTelegramTextForSend", () => {
  it("keeps plain text untouched when parse mode is undefined", () => {
    expect(prepareTelegramTextForSend("Hello world", undefined)).toEqual({
      text: "Hello world",
      parseMode: undefined,
    });
  });

  it("converts MarkdownV2 input to HTML for Telegram send safety", () => {
    const prepared = prepareTelegramTextForSend("Use *bold*", "MarkdownV2");

    expect(prepared.parseMode).toBe("HTML");
    expect(prepared.text).toContain("<b>bold</b>");
  });
});
