import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inngest } from "@/lib/inngest/client";

const {
  mockFindSchedule,
  mockDbUpdate,
  mockDbSet,
  mockDbWhere,
  mockDbSelect,
  mockDbLimit,
  schedulesTable,
  platformConnectionsTable,
} = vi.hoisted(() => ({
  mockFindSchedule: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockDbSet: vi.fn(),
  mockDbWhere: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbLimit: vi.fn(),
  schedulesTable: {
    id: "schedules.id",
  },
  platformConnectionsTable: {
    id: "platform_connections.id",
    userId: "platform_connections.userId",
    platform: "platform_connections.platform",
  },
}));

vi.mock("@/server/db", () => ({
  db: {
    query: {
      schedules: {
        findFirst: mockFindSchedule,
      },
    },
    update: mockDbUpdate.mockImplementation(() => ({
      set: mockDbSet.mockImplementation(() => ({
        where: mockDbWhere.mockResolvedValue(undefined),
      })),
    })),
    select: mockDbSelect.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      chain.from = vi.fn().mockReturnValue(chain);
      chain.where = vi.fn().mockReturnValue(chain);
      chain.limit = mockDbLimit;
      return chain;
    }),
  },
}));

vi.mock("@/server/db/schema", () => ({
  schedules: schedulesTable,
  platformConnections: platformConnectionsTable,
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_column: unknown, value: unknown) => ({ op: "eq", value })),
  and: vi.fn((...conditions: unknown[]) => ({ op: "and", conditions })),
}));

import { executeScheduledPost } from "../execute-scheduled-post";

type InngestHandler = {
  fn: (args: {
    event: { data: { scheduleId: string; userId: string } };
    step: unknown;
  }) => Promise<unknown>;
};

function createStep() {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
  };
}

function createEvent(overrides: Partial<{ scheduleId: string; userId: string }> = {}) {
  return {
    data: {
      scheduleId: overrides.scheduleId ?? "schedule-1",
      userId: overrides.userId ?? "user-1",
    },
  };
}

let sendSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  sendSpy = vi.spyOn(inngest, "send").mockResolvedValue(undefined as never);
  mockDbWhere.mockResolvedValue(undefined);
});

afterEach(() => {
  sendSpy.mockRestore();
});

describe("executeScheduledPost", () => {
  it("dispatches Twitter event with connection id and marks schedule complete", async () => {
    mockFindSchedule.mockResolvedValue({
      id: "schedule-1",
      userId: "user-1",
      crossPostId: "cross-post-1",
      status: "pending",
      crossPost: {
        platform: "twitter",
        adaptedContent: "Tweet body",
      },
    });
    mockDbLimit.mockResolvedValue([{ id: "conn-1" }]);

    const step = createStep();
    const result = await (executeScheduledPost as unknown as InngestHandler).fn({
      event: createEvent(),
      step,
    });

    expect(sendSpy).toHaveBeenCalledWith({
      name: "platform/twitter.post",
      data: {
        crossPostId: "cross-post-1",
        userId: "user-1",
        connectionId: "conn-1",
        content: "Tweet body",
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
        scheduleId: "schedule-1",
        platform: "twitter",
      }),
    );
  });

  it("dispatches LinkedIn event without looking up Twitter connection", async () => {
    mockFindSchedule.mockResolvedValue({
      id: "schedule-2",
      userId: "user-2",
      crossPostId: "cross-post-2",
      status: "pending",
      crossPost: {
        platform: "linkedin",
        adaptedContent: "LinkedIn post body",
      },
    });

    const step = createStep();
    const result = await (executeScheduledPost as unknown as InngestHandler).fn({
      event: createEvent({ scheduleId: "schedule-2", userId: "user-2" }),
      step,
    });

    expect(sendSpy).toHaveBeenCalledWith({
      name: "platform/linkedin.post",
      data: {
        crossPostId: "cross-post-2",
        userId: "user-2",
        content: "LinkedIn post body",
      },
    });
    expect(mockDbSelect).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
        scheduleId: "schedule-2",
        platform: "linkedin",
      }),
    );
  });

  it("marks schedule failed when Twitter connection is missing", async () => {
    mockFindSchedule.mockResolvedValue({
      id: "schedule-3",
      userId: "user-3",
      crossPostId: "cross-post-3",
      status: "pending",
      crossPost: {
        platform: "twitter",
        adaptedContent: "Tweet body",
      },
    });
    mockDbLimit.mockResolvedValue([]);

    const step = createStep();
    await expect(
      (executeScheduledPost as unknown as InngestHandler).fn({
        event: createEvent({ scheduleId: "schedule-3", userId: "user-3" }),
        step,
      }),
    ).rejects.toThrow("Twitter connection not found");

    const hasFailedStatusUpdate = mockDbSet.mock.calls.some(
      (call) =>
        call[0] &&
        typeof call[0] === "object" &&
        "status" in (call[0] as Record<string, unknown>) &&
        (call[0] as Record<string, unknown>).status === "failed",
    );
    expect(hasFailedStatusUpdate).toBe(true);
  });
});
