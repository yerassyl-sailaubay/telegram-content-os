import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  renderTemplate,
  buildTemplateVars,
  isRateLimited,
  recordWelcomeSent,
  rateLimitMap,
  handleNewChatMember,
} from "../welcome";
import type { WelcomeHandlerDeps } from "../welcome";
import type { TelegramMessage, TelegramUser } from "../types";

// ---------------------------------------------------------------------------
// Template rendering
// ---------------------------------------------------------------------------

describe("renderTemplate", () => {
  it("replaces all known variables", () => {
    const template = "Hello {name}, welcome to {channel_name}! Member #{member_count}.";
    const vars = { name: "Alice", channel_name: "Test Channel", member_count: "42" };
    expect(renderTemplate(template, vars)).toBe(
      "Hello Alice, welcome to Test Channel! Member #42.",
    );
  });

  it("handles missing variables (leaves them as-is)", () => {
    expect(renderTemplate("Hi {name}, {unknown}", { name: "Bob" })).toBe("Hi Bob, {unknown}");
  });

  it("handles empty template", () => {
    expect(renderTemplate("", { name: "Alice" })).toBe("");
  });

  it("replaces multiple occurrences of the same variable", () => {
    expect(renderTemplate("{name} and {name}", { name: "Eve" })).toBe("Eve and Eve");
  });
});

// ---------------------------------------------------------------------------
// buildTemplateVars
// ---------------------------------------------------------------------------

describe("buildTemplateVars", () => {
  it("builds vars from full user info", () => {
    const user: TelegramUser = {
      id: 123,
      is_bot: false,
      first_name: "John",
      last_name: "Doe",
    };
    const vars = buildTemplateVars(user, "My Channel", 500);
    expect(vars).toEqual({
      name: "John Doe",
      channel_name: "My Channel",
      member_count: "500",
    });
  });

  it("uses first name only when no last name", () => {
    const user: TelegramUser = { id: 1, is_bot: false, first_name: "Alice" };
    const vars = buildTemplateVars(user, "Ch", 10);
    expect(vars.name).toBe("Alice");
  });

  it('falls back to "New Member" when name is empty', () => {
    const user: TelegramUser = { id: 1, is_bot: false, first_name: "" };
    const vars = buildTemplateVars(user, "Ch", 1);
    expect(vars.name).toBe("New Member");
  });

  it('falls back to "this channel" when channel name is empty', () => {
    const user: TelegramUser = { id: 1, is_bot: false, first_name: "X" };
    const vars = buildTemplateVars(user, "", 0);
    expect(vars.channel_name).toBe("this channel");
  });
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

describe("rate limiting", () => {
  beforeEach(() => {
    rateLimitMap.clear();
  });

  it("is not rate-limited on first call", () => {
    expect(isRateLimited("-100123", 42)).toBe(false);
  });

  it("is rate-limited after recording", () => {
    recordWelcomeSent("-100123", 42);
    expect(isRateLimited("-100123", 42)).toBe(true);
  });

  it("different user is not rate-limited", () => {
    recordWelcomeSent("-100123", 42);
    expect(isRateLimited("-100123", 99)).toBe(false);
  });

  it("different channel is not rate-limited", () => {
    recordWelcomeSent("-100123", 42);
    expect(isRateLimited("-100999", 42)).toBe(false);
  });

  it("expires after 24h", () => {
    const now = Date.now();
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(now) // recordWelcomeSent
      .mockReturnValueOnce(now + 24 * 60 * 60 * 1000 + 1); // isRateLimited (24h + 1ms later)
    recordWelcomeSent("-100123", 42);
    expect(isRateLimited("-100123", 42)).toBe(false);
    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// handleNewChatMember
// ---------------------------------------------------------------------------

describe("handleNewChatMember", () => {
  let mockGetTemplate: ReturnType<typeof vi.fn>;
  let mockSendMessage: ReturnType<typeof vi.fn>;
  let deps: WelcomeHandlerDeps;

  const makeMessage = (
    newMembers?: TelegramUser[],
  ): TelegramMessage & { new_chat_members?: TelegramUser[] } => ({
    message_id: 1,
    date: Math.floor(Date.now() / 1000),
    chat: { id: -100123, type: "supergroup" },
    new_chat_members: newMembers,
  });

  beforeEach(() => {
    rateLimitMap.clear();
    mockGetTemplate = vi.fn();
    mockSendMessage = vi.fn().mockResolvedValue(undefined);
    deps = {
      getTemplate: mockGetTemplate as unknown as WelcomeHandlerDeps["getTemplate"],
      sendMessage: mockSendMessage as unknown as WelcomeHandlerDeps["sendMessage"],
    };
  });

  it("does nothing when no new_chat_members", async () => {
    await handleNewChatMember(makeMessage(undefined), deps);
    expect(mockGetTemplate).not.toHaveBeenCalled();
  });

  it("does nothing when new_chat_members is empty", async () => {
    await handleNewChatMember(makeMessage([]), deps);
    expect(mockGetTemplate).not.toHaveBeenCalled();
  });

  it("does nothing when no template found", async () => {
    mockGetTemplate.mockResolvedValue(null);
    await handleNewChatMember(makeMessage([{ id: 1, is_bot: false, first_name: "Alice" }]), deps);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("does nothing when template has no bot token", async () => {
    mockGetTemplate.mockResolvedValue({
      templateText: "Hello {name}",
      channelTitle: "Ch",
      memberCount: 10,
      botToken: null,
    });
    await handleNewChatMember(makeMessage([{ id: 1, is_bot: false, first_name: "Alice" }]), deps);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("sends welcome to a new human member", async () => {
    mockGetTemplate.mockResolvedValue({
      templateText: "Welcome {name}!",
      channelTitle: "Test",
      memberCount: 100,
      botToken: "bot-token-123",
    });
    await handleNewChatMember(makeMessage([{ id: 42, is_bot: false, first_name: "Alice" }]), deps);
    expect(mockSendMessage).toHaveBeenCalledWith("bot-token-123", -100123, "Welcome Alice!", {
      parse_mode: "MarkdownV2",
    });
  });

  it("skips bot members", async () => {
    mockGetTemplate.mockResolvedValue({
      templateText: "Hello {name}!",
      channelTitle: "Ch",
      memberCount: 10,
      botToken: "tok",
    });
    await handleNewChatMember(makeMessage([{ id: 99, is_bot: true, first_name: "BotName" }]), deps);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("skips rate-limited members", async () => {
    mockGetTemplate.mockResolvedValue({
      templateText: "Hello {name}!",
      channelTitle: "Ch",
      memberCount: 10,
      botToken: "tok",
    });
    // Pre-record so the member is rate-limited
    recordWelcomeSent("-100123", 42);
    await handleNewChatMember(makeMessage([{ id: 42, is_bot: false, first_name: "Alice" }]), deps);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("welcomes multiple members in one message", async () => {
    mockGetTemplate.mockResolvedValue({
      templateText: "Hi {name}",
      channelTitle: "Ch",
      memberCount: 10,
      botToken: "tok",
    });
    await handleNewChatMember(
      makeMessage([
        { id: 1, is_bot: false, first_name: "Alice" },
        { id: 2, is_bot: false, first_name: "Bob" },
      ]),
      deps,
    );
    expect(mockSendMessage).toHaveBeenCalledTimes(2);
    expect(mockSendMessage).toHaveBeenCalledWith("tok", -100123, "Hi Alice", {
      parse_mode: "MarkdownV2",
    });
    expect(mockSendMessage).toHaveBeenCalledWith("tok", -100123, "Hi Bob", {
      parse_mode: "MarkdownV2",
    });
  });

  it("continues welcoming other members if one send fails", async () => {
    mockGetTemplate.mockResolvedValue({
      templateText: "Hi {name}",
      channelTitle: "Ch",
      memberCount: 10,
      botToken: "tok",
    });
    mockSendMessage
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(undefined);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await handleNewChatMember(
      makeMessage([
        { id: 1, is_bot: false, first_name: "Alice" },
        { id: 2, is_bot: false, first_name: "Bob" },
      ]),
      deps,
    );
    expect(mockSendMessage).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it("records rate limit after successful send", async () => {
    mockGetTemplate.mockResolvedValue({
      templateText: "Hi {name}",
      channelTitle: "Ch",
      memberCount: 10,
      botToken: "tok",
    });
    await handleNewChatMember(makeMessage([{ id: 42, is_bot: false, first_name: "Alice" }]), deps);
    // Now the same member should be rate-limited
    expect(isRateLimited("-100123", 42)).toBe(true);
  });
});
