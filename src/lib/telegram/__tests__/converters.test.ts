import { describe, it, expect } from "vitest";
import { toMarkdown, toPlainText, toHTML, escapeHtml } from "../converters";
import { parseTelegramMessage, parseMediaGroup } from "../parser";
import type { ParsedContent, TelegramMessage, TelegramEntity } from "../parser.types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMessage(overrides: Partial<TelegramMessage> = {}): TelegramMessage {
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

function parsedFromText(text: string, entities: TelegramEntity[] = []): ParsedContent {
  return parseTelegramMessage(makeMessage({ text, entities }));
}

// ─── escapeHtml ─────────────────────────────────────────────────────────────

describe("escapeHtml", () => {
  it("escapes &", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes <", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes >", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b");
  });

  it('escapes "', () => {
    expect(escapeHtml('a "b" c')).toBe("a &quot;b&quot; c");
  });

  it("escapes '", () => {
    expect(escapeHtml("it's")).toBe("it&#x27;s");
  });

  it("escapes all special chars together", () => {
    expect(escapeHtml('<a href="x">&')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("handles text without special chars", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
  });
});

// ─── toMarkdown ─────────────────────────────────────────────────────────────

describe("toMarkdown", () => {
  it("converts plain text", () => {
    const parsed = parsedFromText("Hello World");
    expect(toMarkdown(parsed)).toBe("Hello World");
  });

  it("converts bold text", () => {
    const parsed = parsedFromText("Hello bold World", [makeEntity("bold", 6, 4)]);
    expect(toMarkdown(parsed)).toContain("**bold**");
  });

  it("converts italic text", () => {
    const parsed = parsedFromText("Hello italic World", [makeEntity("italic", 6, 6)]);
    expect(toMarkdown(parsed)).toContain("_italic_");
  });

  it("converts underline text", () => {
    const parsed = parsedFromText("Hello underline World", [makeEntity("underline", 6, 9)]);
    expect(toMarkdown(parsed)).toContain("<u>underline</u>");
  });

  it("converts strikethrough text", () => {
    const parsed = parsedFromText("Hello strike World", [makeEntity("strikethrough", 6, 6)]);
    expect(toMarkdown(parsed)).toContain("~~strike~~");
  });

  it("converts inline code", () => {
    const parsed = parsedFromText("Use code here", [makeEntity("code", 4, 4)]);
    expect(toMarkdown(parsed)).toContain("`code`");
  });

  it("converts spoiler", () => {
    const parsed = parsedFromText("The answer is secret", [makeEntity("spoiler", 14, 6)]);
    expect(toMarkdown(parsed)).toContain("||secret||");
  });

  it("converts code block without language", () => {
    const parsed = parsedFromText("const x = 1;", [makeEntity("pre", 0, 13)]);
    expect(toMarkdown(parsed)).toBe("```\nconst x = 1;\n```");
  });

  it("converts code block with language", () => {
    const parsed = parsedFromText("const x = 1;", [
      makeEntity("pre", 0, 13, { language: "javascript" }),
    ]);
    expect(toMarkdown(parsed)).toBe("```javascript\nconst x = 1;\n```");
  });

  it("converts blockquote", () => {
    const parsed = parsedFromText("Quoted text", [makeEntity("blockquote", 0, 11)]);
    expect(toMarkdown(parsed)).toBe("> Quoted text");
  });

  it("converts multi-line blockquote", () => {
    const parsed = parsedFromText("Line 1\nLine 2", [makeEntity("blockquote", 0, 13)]);
    const md = toMarkdown(parsed);
    expect(md).toContain("> Line 1");
    expect(md).toContain("> Line 2");
  });

  it("converts text_link", () => {
    const parsed = parsedFromText("Click here", [
      makeEntity("text_link", 6, 4, { url: "https://example.com" }),
    ]);
    expect(toMarkdown(parsed)).toContain("[here](https://example.com)");
  });

  it("converts URL entity", () => {
    const parsed = parsedFromText("Visit https://example.com today", [makeEntity("url", 6, 19)]);
    // URL that matches the text should just output the text
    expect(toMarkdown(parsed)).toContain("https://example.com");
  });

  it("converts mention", () => {
    const parsed = parsedFromText("Hello @user!", [makeEntity("mention", 6, 5)]);
    expect(toMarkdown(parsed)).toContain("@user");
  });

  it("converts hashtag", () => {
    const parsed = parsedFromText("Check #trending", [makeEntity("hashtag", 6, 9)]);
    expect(toMarkdown(parsed)).toContain("#trending");
  });

  it("converts bot command", () => {
    const parsed = parsedFromText("/start now", [makeEntity("bot_command", 0, 6)]);
    expect(toMarkdown(parsed)).toContain("`/start`");
  });

  it("converts email", () => {
    const parsed = parsedFromText("Email user@test.com", [makeEntity("email", 6, 13)]);
    expect(toMarkdown(parsed)).toContain("[user@test.com](mailto:user@test.com)");
  });

  it("includes forward attribution", () => {
    const msg = makeMessage({
      text: "Content",
      forward_sender_name: "John Doe",
    });
    const parsed = parseTelegramMessage(msg);
    const md = toMarkdown(parsed);
    expect(md).toContain("Forwarded from John Doe");
  });

  it("includes forward attribution with channel username", () => {
    const msg = makeMessage({
      text: "Content",
      forward_from_chat: {
        id: -100111,
        type: "channel",
        title: "News",
        username: "newschannel",
      },
    });
    const parsed = parseTelegramMessage(msg);
    const md = toMarkdown(parsed);
    expect(md).toContain("@newschannel");
  });

  it("includes media references", () => {
    const msg = makeMessage({
      caption: "Photo",
      photo: [{ file_id: "abc123", file_unique_id: "u1", width: 800, height: 600 }],
    });
    const parsed = parseTelegramMessage(msg);
    const md = toMarkdown(parsed);
    expect(md).toContain("[photo: abc123]");
  });

  it("handles media-only message", () => {
    const msg = makeMessage({
      photo: [{ file_id: "abc123", file_unique_id: "u1", width: 800, height: 600 }],
    });
    const parsed = parseTelegramMessage(msg);
    const md = toMarkdown(parsed);
    expect(md).toContain("[photo: abc123]");
  });

  it("handles empty message", () => {
    const parsed = parsedFromText("");
    expect(toMarkdown(parsed)).toBe("");
  });

  it("converts media group", () => {
    const messages: TelegramMessage[] = [
      makeMessage({
        message_id: 1,
        caption: "Album",
        media_group_id: "g1",
        photo: [{ file_id: "ph1", file_unique_id: "p1", width: 800, height: 600 }],
      }),
      makeMessage({
        message_id: 2,
        media_group_id: "g1",
        photo: [{ file_id: "ph2", file_unique_id: "p2", width: 800, height: 600 }],
      }),
    ];
    const group = parseMediaGroup(messages);
    const md = toMarkdown(group);
    expect(md).toContain("Album");
    expect(md).toContain("[photo: ph1]");
    expect(md).toContain("[photo: ph2]");
  });
});

// ─── toPlainText ────────────────────────────────────────────────────────────

describe("toPlainText", () => {
  it("converts plain text", () => {
    const parsed = parsedFromText("Hello World");
    expect(toPlainText(parsed)).toBe("Hello World");
  });

  it("strips bold formatting", () => {
    const parsed = parsedFromText("Hello bold World", [makeEntity("bold", 6, 4)]);
    expect(toPlainText(parsed)).toBe("Hello bold World");
  });

  it("strips all formatting", () => {
    const text = "bold italic code";
    const parsed = parsedFromText(text, [
      makeEntity("bold", 0, 4),
      makeEntity("italic", 5, 6),
      makeEntity("code", 12, 4),
    ]);
    expect(toPlainText(parsed)).toBe("bold italic code");
  });

  it("includes text_link URL in parentheses", () => {
    const parsed = parsedFromText("Click here", [
      makeEntity("text_link", 6, 4, { url: "https://example.com" }),
    ]);
    const plain = toPlainText(parsed);
    expect(plain).toContain("here");
    expect(plain).toContain("(https://example.com)");
  });

  it("outputs URL text directly when URL matches text", () => {
    const parsed = parsedFromText("Visit https://example.com today", [makeEntity("url", 6, 19)]);
    const plain = toPlainText(parsed);
    expect(plain).toContain("https://example.com");
  });

  it("includes code block text", () => {
    const parsed = parsedFromText("const x = 1;", [makeEntity("pre", 0, 13)]);
    expect(toPlainText(parsed)).toBe("const x = 1;");
  });

  it("includes blockquote text", () => {
    const parsed = parsedFromText("Quoted text", [makeEntity("blockquote", 0, 11)]);
    expect(toPlainText(parsed)).toBe("Quoted text");
  });

  it("includes forward attribution", () => {
    const msg = makeMessage({
      text: "Content",
      forward_sender_name: "Author",
    });
    const parsed = parseTelegramMessage(msg);
    const plain = toPlainText(parsed);
    expect(plain).toContain("Forwarded from Author");
    expect(plain).toContain("Content");
  });

  it("handles empty message", () => {
    const parsed = parsedFromText("");
    expect(toPlainText(parsed)).toBe("");
  });

  it("skips media in plain text output", () => {
    const msg = makeMessage({
      caption: "Caption",
      photo: [{ file_id: "ph1", file_unique_id: "p1", width: 800, height: 600 }],
    });
    const parsed = parseTelegramMessage(msg);
    const plain = toPlainText(parsed);
    expect(plain).toBe("Caption");
    expect(plain).not.toContain("ph1");
  });
});

// ─── toHTML ─────────────────────────────────────────────────────────────────

describe("toHTML", () => {
  it("converts plain text to paragraph", () => {
    const parsed = parsedFromText("Hello World");
    expect(toHTML(parsed)).toBe("<p>Hello World</p>");
  });

  it("converts bold text", () => {
    const parsed = parsedFromText("Hello bold World", [makeEntity("bold", 6, 4)]);
    const html = toHTML(parsed);
    expect(html).toContain("<b>bold</b>");
  });

  it("converts italic text", () => {
    const parsed = parsedFromText("Hello italic World", [makeEntity("italic", 6, 6)]);
    expect(toHTML(parsed)).toContain("<i>italic</i>");
  });

  it("converts underline text", () => {
    const parsed = parsedFromText("Hello underline World", [makeEntity("underline", 6, 9)]);
    expect(toHTML(parsed)).toContain("<u>underline</u>");
  });

  it("converts strikethrough text", () => {
    const parsed = parsedFromText("Hello strike World", [makeEntity("strikethrough", 6, 6)]);
    expect(toHTML(parsed)).toContain("<s>strike</s>");
  });

  it("converts inline code", () => {
    const parsed = parsedFromText("Use code here", [makeEntity("code", 4, 4)]);
    expect(toHTML(parsed)).toContain("<code>code</code>");
  });

  it("converts spoiler", () => {
    const parsed = parsedFromText("Answer is secret", [makeEntity("spoiler", 10, 6)]);
    expect(toHTML(parsed)).toContain('<span class="spoiler">secret</span>');
  });

  it("converts code block without language", () => {
    const parsed = parsedFromText("const x = 1;", [makeEntity("pre", 0, 13)]);
    expect(toHTML(parsed)).toBe("<pre><code>const x = 1;</code></pre>");
  });

  it("converts code block with language", () => {
    const parsed = parsedFromText("const x = 1;", [
      makeEntity("pre", 0, 13, { language: "javascript" }),
    ]);
    expect(toHTML(parsed)).toBe('<pre><code class="language-javascript">const x = 1;</code></pre>');
  });

  it("converts blockquote", () => {
    const parsed = parsedFromText("Quoted", [makeEntity("blockquote", 0, 6)]);
    expect(toHTML(parsed)).toBe("<blockquote>Quoted</blockquote>");
  });

  it("converts expandable blockquote", () => {
    const parsed = parsedFromText("Expandable", [makeEntity("expandable_blockquote", 0, 10)]);
    expect(toHTML(parsed)).toBe("<details><blockquote>Expandable</blockquote></details>");
  });

  it("converts text_link", () => {
    const parsed = parsedFromText("Click here", [
      makeEntity("text_link", 6, 4, { url: "https://example.com" }),
    ]);
    const html = toHTML(parsed);
    expect(html).toContain('<a href="https://example.com" rel="noopener noreferrer">here</a>');
  });

  it("converts mention", () => {
    const parsed = parsedFromText("Hello @user!", [makeEntity("mention", 6, 5)]);
    expect(toHTML(parsed)).toContain('<span class="mention">@user</span>');
  });

  it("converts hashtag", () => {
    const parsed = parsedFromText("Check #tag", [makeEntity("hashtag", 6, 4)]);
    expect(toHTML(parsed)).toContain('<span class="hashtag">#tag</span>');
  });

  it("converts bot command", () => {
    const parsed = parsedFromText("/start now", [makeEntity("bot_command", 0, 6)]);
    expect(toHTML(parsed)).toContain("<code>/start</code>");
  });

  it("converts email", () => {
    const parsed = parsedFromText("Email user@test.com", [makeEntity("email", 6, 13)]);
    expect(toHTML(parsed)).toContain('<a href="mailto:user@test.com">user@test.com</a>');
  });

  it("converts phone number", () => {
    const parsed = parsedFromText("Call +123456", [makeEntity("phone_number", 5, 7)]);
    expect(toHTML(parsed)).toContain('<a href="tel:+123456">+123456</a>');
  });

  it("converts custom emoji", () => {
    const parsed = parsedFromText("Hi 😀", [
      makeEntity("custom_emoji_id", 3, 2, {
        custom_emoji_id: "5368324170671202286",
      }),
    ]);
    const html = toHTML(parsed);
    expect(html).toContain('class="custom-emoji"');
    expect(html).toContain('data-emoji-id="5368324170671202286"');
  });

  // ─── XSS Prevention ───────────────────────────────────────────────────────

  it("escapes HTML in plain text", () => {
    const parsed = parsedFromText('<script>alert("xss")</script>');
    const html = toHTML(parsed);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML in code blocks", () => {
    const parsed = parsedFromText('<div class="x">', [makeEntity("pre", 0, 15)]);
    const html = toHTML(parsed);
    expect(html).toContain("&lt;div class=&quot;x&quot;&gt;");
  });

  it("escapes HTML in link text", () => {
    const parsed = parsedFromText('<img onerror="alert(1)">', [
      makeEntity("text_link", 0, 23, { url: "https://safe.com" }),
    ]);
    const html = toHTML(parsed);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("escapes HTML in URLs", () => {
    const parsed = parsedFromText("link", [
      makeEntity("text_link", 0, 4, {
        url: 'javascript:alert("xss")',
      }),
    ]);
    const html = toHTML(parsed);
    // The URL should be escaped in the href
    expect(html).toContain("href=");
    expect(html).not.toContain('href="javascript:');
  });

  it("escapes HTML in mention text", () => {
    const parsed = parsedFromText("@<script>", [makeEntity("mention", 0, 9)]);
    expect(toHTML(parsed)).toContain("&lt;script&gt;");
  });

  // ─── Forward Attribution ──────────────────────────────────────────────────

  it("includes forward attribution", () => {
    const msg = makeMessage({
      text: "Content",
      forward_sender_name: "John <script>",
    });
    const parsed = parseTelegramMessage(msg);
    const html = toHTML(parsed);
    expect(html).toContain("forward-info");
    expect(html).toContain("John &lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("includes forward attribution with channel link", () => {
    const msg = makeMessage({
      text: "Content",
      forward_from_chat: {
        id: -100111,
        type: "channel",
        title: "News",
        username: "newschannel",
      },
    });
    const parsed = parseTelegramMessage(msg);
    const html = toHTML(parsed);
    expect(html).toContain("https://t.me/newschannel");
    expect(html).toContain("@newschannel");
  });

  // ─── Media ────────────────────────────────────────────────────────────────

  it("includes media items", () => {
    const msg = makeMessage({
      caption: "Photo",
      photo: [{ file_id: "abc123", file_unique_id: "u1", width: 800, height: 600 }],
    });
    const parsed = parseTelegramMessage(msg);
    const html = toHTML(parsed);
    expect(html).toContain("media-group");
    expect(html).toContain('data-file-id="abc123"');
    expect(html).toContain('data-type="photo"');
  });

  it("escapes media file names", () => {
    const msg = makeMessage({
      document: {
        file_id: "doc1",
        file_unique_id: "d1",
        file_name: '<img onerror="alert(1)">',
      },
    });
    const parsed = parseTelegramMessage(msg);
    const html = toHTML(parsed);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("handles empty message", () => {
    const parsed = parsedFromText("");
    expect(toHTML(parsed)).toBe("");
  });
});
