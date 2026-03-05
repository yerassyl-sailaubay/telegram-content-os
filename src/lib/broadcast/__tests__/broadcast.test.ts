import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateBroadcastRequest, generateBroadcastId, createBroadcast } from "../orchestrator";
import type { BroadcastDeps } from "../orchestrator";
import type { BroadcastRequest } from "../types";
import { deriveBroadcastStatus } from "../types";
import type { PlatformTarget } from "../types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createValidRequest(overrides?: Partial<BroadcastRequest>): BroadcastRequest {
  return {
    postId: "post-123",
    userId: "user-456",
    platforms: ["linkedin", "twitter"],
    ...overrides,
  };
}

function createMockDeps(overrides?: Partial<BroadcastDeps>): BroadcastDeps {
  let idCounter = 0;
  return {
    createCrossPost: vi.fn().mockImplementation(async () => `cp-${++idCounter}`),
    sendBroadcastEvent: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// generateBroadcastId
// ---------------------------------------------------------------------------

describe("generateBroadcastId", () => {
  it("produces prefixed unique IDs", () => {
    const id1 = generateBroadcastId();
    const id2 = generateBroadcastId();

    expect(id1).toMatch(/^bcast_/);
    expect(id2).toMatch(/^bcast_/);
    expect(id1).not.toBe(id2);
  });
});

// ---------------------------------------------------------------------------
// validateBroadcastRequest
// ---------------------------------------------------------------------------

describe("validateBroadcastRequest", () => {
  it("returns no errors for a valid request", () => {
    expect(validateBroadcastRequest(createValidRequest())).toEqual([]);
  });

  it("requires postId", () => {
    const errors = validateBroadcastRequest(createValidRequest({ postId: "" }));
    expect(errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: "postId" })]));
  });

  it("requires userId", () => {
    const errors = validateBroadcastRequest(createValidRequest({ userId: "" }));
    expect(errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: "userId" })]));
  });

  it("requires at least one platform", () => {
    const errors = validateBroadcastRequest(createValidRequest({ platforms: [] }));
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "platforms",
          message: "At least one platform must be selected",
        }),
      ]),
    );
  });

  it("rejects invalid platform names", () => {
    const errors = validateBroadcastRequest(
      createValidRequest({
        platforms: ["facebook" as "linkedin"],
      }),
    );
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "platforms",
          message: expect.stringContaining("Invalid platform"),
        }),
      ]),
    );
  });

  it("rejects duplicate platforms", () => {
    const errors = validateBroadcastRequest(
      createValidRequest({
        platforms: ["linkedin", "linkedin"],
      }),
    );
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "platforms",
          message: "Duplicate platforms are not allowed",
        }),
      ]),
    );
  });

  it("rejects scheduledAt in the past", () => {
    const pastDate = new Date(Date.now() - 60_000);
    const errors = validateBroadcastRequest(createValidRequest({ scheduledAt: pastDate }));
    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "scheduledAt" })]),
    );
  });

  it("accepts scheduledAt in the future", () => {
    const futureDate = new Date(Date.now() + 60_000);
    const errors = validateBroadcastRequest(createValidRequest({ scheduledAt: futureDate }));
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// deriveBroadcastStatus
// ---------------------------------------------------------------------------

describe("deriveBroadcastStatus", () => {
  function target(
    status: PlatformTarget["status"],
    platform: PlatformTarget["platform"] = "linkedin",
  ): PlatformTarget {
    return { platform, status };
  }

  it('returns "pending" for empty targets', () => {
    expect(deriveBroadcastStatus([])).toBe("pending");
  });

  it('returns "pending" when all are pending', () => {
    expect(deriveBroadcastStatus([target("pending"), target("pending", "twitter")])).toBe(
      "pending",
    );
  });

  it('returns "completed" when all are posted', () => {
    expect(deriveBroadcastStatus([target("posted"), target("posted", "twitter")])).toBe(
      "completed",
    );
  });

  it('returns "failed" when all are failed', () => {
    expect(deriveBroadcastStatus([target("failed"), target("failed", "twitter")])).toBe("failed");
  });

  it('returns "partial" when mix of posted and failed', () => {
    expect(deriveBroadcastStatus([target("posted"), target("failed", "twitter")])).toBe("partial");
  });

  it('returns "partial" when one posted and rest pending', () => {
    expect(deriveBroadcastStatus([target("posted"), target("pending", "twitter")])).toBe("partial");
  });
});

// ---------------------------------------------------------------------------
// createBroadcast — orchestrator
// ---------------------------------------------------------------------------

describe("createBroadcast", () => {
  it("creates cross-post records for each platform", async () => {
    const deps = createMockDeps();
    const request = createValidRequest();

    await createBroadcast(request, deps);

    expect(deps.createCrossPost).toHaveBeenCalledTimes(2);
    expect(deps.createCrossPost).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-456",
        sourcePostId: "post-123",
        platform: "linkedin",
      }),
    );
    expect(deps.createCrossPost).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-456",
        sourcePostId: "post-123",
        platform: "twitter",
      }),
    );
  });

  it("sends broadcast Inngest event with correct data", async () => {
    const deps = createMockDeps();
    const request = createValidRequest({ channelId: "ch-1" });

    const result = await createBroadcast(request, deps);

    expect(deps.sendBroadcastEvent).toHaveBeenCalledTimes(1);
    expect(deps.sendBroadcastEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        broadcastId: result.broadcastId,
        postId: "post-123",
        userId: "user-456",
        platforms: ["linkedin", "twitter"],
        channelId: "ch-1",
        crossPostIds: expect.objectContaining({
          linkedin: expect.any(String),
          twitter: expect.any(String),
        }),
      }),
    );
  });

  it("returns pending result with all targets", async () => {
    const deps = createMockDeps();
    const request = createValidRequest();

    const result = await createBroadcast(request, deps);

    expect(result.broadcastId).toMatch(/^bcast_/);
    expect(result.status).toBe("pending");
    expect(result.targets).toHaveLength(2);
    expect(result.targets[0]!.status).toBe("pending");
    expect(result.targets[1]!.status).toBe("pending");
  });

  it("throws on invalid request", async () => {
    const deps = createMockDeps();
    const request = createValidRequest({ platforms: [] });

    await expect(createBroadcast(request, deps)).rejects.toThrow("Invalid broadcast request");
    expect(deps.createCrossPost).not.toHaveBeenCalled();
    expect(deps.sendBroadcastEvent).not.toHaveBeenCalled();
  });

  it("works for a single platform", async () => {
    const deps = createMockDeps();
    const request = createValidRequest({ platforms: ["twitter"] });

    const result = await createBroadcast(request, deps);

    expect(deps.createCrossPost).toHaveBeenCalledTimes(1);
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]!.platform).toBe("twitter");
  });

  it("propagates cross-post creation failure", async () => {
    const deps = createMockDeps({
      createCrossPost: vi.fn().mockRejectedValue(new Error("DB connection failed")),
    });

    await expect(createBroadcast(createValidRequest(), deps)).rejects.toThrow(
      "DB connection failed",
    );
  });

  it("passes broadcastId to each createCrossPost call", async () => {
    const deps = createMockDeps();
    const request = createValidRequest();

    const result = await createBroadcast(request, deps);

    for (const call of (deps.createCrossPost as ReturnType<typeof vi.fn>).mock.calls) {
      expect(call[0].broadcastId).toBe(result.broadcastId);
    }
  });
});
