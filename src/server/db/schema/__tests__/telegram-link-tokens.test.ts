import { describe, expect, it } from "vitest";
import { telegramLinkTokens, telegramLinkTokensRelations } from "../telegram-link-tokens";

describe("telegramLinkTokens table", () => {
  it("has token column", () => {
    expect(telegramLinkTokens.token).toBeDefined();
  });

  it("has userId column", () => {
    expect(telegramLinkTokens.userId).toBeDefined();
  });

  it("has expiresAt column", () => {
    expect(telegramLinkTokens.expiresAt).toBeDefined();
  });

  it("has usedAt column", () => {
    expect(telegramLinkTokens.usedAt).toBeDefined();
  });

  it("has createdAt column", () => {
    expect(telegramLinkTokens.createdAt).toBeDefined();
  });
});

describe("telegramLinkTokensRelations", () => {
  it("is defined", () => {
    expect(telegramLinkTokensRelations).toBeDefined();
  });
});
