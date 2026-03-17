import { describe, expect, it } from "vitest";
import { functions } from "../index";
import { cleanupPromptCache } from "../ai/cleanup-prompt-cache";
import { postToLinkedIn } from "../platforms/post-to-linkedin";
import { postToTwitter } from "../platforms/post-to-twitter";

describe("inngest functions index", () => {
  it("registers background and platform handlers", () => {
    expect(functions).toContain(cleanupPromptCache);
    expect(functions).toContain(postToLinkedIn);
    expect(functions).toContain(postToTwitter);
  });
});
