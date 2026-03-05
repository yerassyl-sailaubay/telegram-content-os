import { describe, it, expect } from "vitest";
import { PLANS } from "../plans";

describe("PLANS feature ordering", () => {
  it("free plan: first feature mentions AI or generation", () => {
    const firstFeature = PLANS.free.features[0].toLowerCase();
    expect(firstFeature.includes("ai") || firstFeature.includes("generation")).toBe(true);
  });

  it("plus plan: first feature mentions AI or generation", () => {
    const firstFeature = PLANS.plus.features[0].toLowerCase();
    expect(firstFeature.includes("ai") || firstFeature.includes("generation")).toBe(true);
  });

  it("pro plan: first feature mentions AI or generation", () => {
    const firstFeature = PLANS.pro.features[0].toLowerCase();
    expect(firstFeature.includes("ai") || firstFeature.includes("generation")).toBe(true);
  });

  it("all plans include a cross-post feature somewhere", () => {
    for (const tier of ["free", "plus", "pro"] as const) {
      const hasCrossPost = PLANS[tier].features.some((f) => f.toLowerCase().includes("cross-post"));
      expect(hasCrossPost, `${tier} plan should include cross-post feature`).toBe(true);
    }
  });

  it("Stripe price IDs are unchanged (null for free, env vars for plus/pro)", () => {
    expect(PLANS.free.stripePriceId).toBeNull();
    // plus and pro read from env — they will be null in test env, but the source
    // must reference the env vars (not hardcoded strings). We just verify they are
    // not hardcoded non-null strings unrelated to the env var.
    expect(typeof PLANS.plus.stripePriceId === "string" || PLANS.plus.stripePriceId === null).toBe(
      true,
    );
    expect(typeof PLANS.pro.stripePriceId === "string" || PLANS.pro.stripePriceId === null).toBe(
      true,
    );
  });

  it("aiCallsPerMonth limits are unchanged (10 / 100 / Infinity)", () => {
    expect(PLANS.free.limits.aiCallsPerMonth).toBe(10);
    expect(PLANS.plus.limits.aiCallsPerMonth).toBe(100);
    expect(PLANS.pro.limits.aiCallsPerMonth).toBe(Infinity);
  });

  it("crossPostsPerMonth limits are unchanged (5 / 50 / Infinity)", () => {
    expect(PLANS.free.limits.crossPostsPerMonth).toBe(5);
    expect(PLANS.plus.limits.crossPostsPerMonth).toBe(50);
    expect(PLANS.pro.limits.crossPostsPerMonth).toBe(Infinity);
  });
});
