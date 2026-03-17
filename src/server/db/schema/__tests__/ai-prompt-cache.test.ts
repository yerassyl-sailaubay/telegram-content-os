import { describe, expect, it } from "vitest";
import { aiPromptCache, aiPromptCacheRelations } from "../ai-prompt-cache";

describe("aiPromptCache table", () => {
  it("has userId column", () => {
    expect(aiPromptCache.userId).toBeDefined();
  });

  it("has feature and cacheKey columns", () => {
    expect(aiPromptCache.feature).toBeDefined();
    expect(aiPromptCache.cacheKey).toBeDefined();
  });

  it("has response and expiry columns", () => {
    expect(aiPromptCache.response).toBeDefined();
    expect(aiPromptCache.expiresAt).toBeDefined();
  });

  it("has hit tracking columns", () => {
    expect(aiPromptCache.hitCount).toBeDefined();
    expect(aiPromptCache.lastHitAt).toBeDefined();
  });
});

describe("aiPromptCacheRelations", () => {
  it("is defined", () => {
    expect(aiPromptCacheRelations).toBeDefined();
  });
});
