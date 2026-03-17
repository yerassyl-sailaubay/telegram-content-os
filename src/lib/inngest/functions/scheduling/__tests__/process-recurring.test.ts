import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inngest } from "@/lib/inngest/client";

const {
  mockDbSelect,
  mockDbInsert,
  mockDbUpdate,
  mockGetNextOccurrence,
  selectResults,
  recurringSchedulesTable,
  schedulesTable,
  crossPostsTable,
} = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockGetNextOccurrence: vi.fn(),
  selectResults: [] as unknown[][],
  recurringSchedulesTable: {
    id: "recurring_schedules.id",
    isActive: "recurring_schedules.isActive",
    nextRunAt: "recurring_schedules.nextRunAt",
    frequency: "recurring_schedules.frequency",
    timeUtc: "recurring_schedules.timeUtc",
    timezone: "recurring_schedules.timezone",
    dayOfWeek: "recurring_schedules.dayOfWeek",
    dayOfMonth: "recurring_schedules.dayOfMonth",
    platforms: "recurring_schedules.platforms",
    userId: "recurring_schedules.userId",
    contentTemplateId: "recurring_schedules.contentTemplateId",
    lastRunAt: "recurring_schedules.lastRunAt",
    updatedAt: "recurring_schedules.updatedAt",
  },
  schedulesTable: {
    id: "schedules.id",
    recurrenceRule: "schedules.recurrenceRule",
    scheduledAt: "schedules.scheduledAt",
  },
  crossPostsTable: {
    id: "cross_posts.id",
  },
}));

let crossPostCounter = 0;
let scheduleCounter = 0;

function createSelectChain() {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn(async () => selectResults.shift() ?? []);
  chain.then = (resolve: (value: unknown) => void) => {
    resolve(selectResults.shift() ?? []);
  };
  return chain;
}

function createUpdateChain() {
  const chain: Record<string, unknown> = {};
  chain.set = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockResolvedValue(undefined);
  return chain;
}

vi.mock("@/server/db", () => ({
  db: {
    select: mockDbSelect.mockImplementation(() => createSelectChain()),
    insert: mockDbInsert.mockImplementation((table: unknown) => ({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(async () => {
          if (table === crossPostsTable) {
            crossPostCounter += 1;
            return [{ id: `cross-post-${crossPostCounter}` }];
          }

          if (table === schedulesTable) {
            scheduleCounter += 1;
            return [{ id: `schedule-${scheduleCounter}` }];
          }

          return [];
        }),
      }),
    })),
    update: mockDbUpdate.mockImplementation(() => createUpdateChain()),
  },
}));

vi.mock("@/server/db/schema", () => ({
  recurringSchedules: recurringSchedulesTable,
  schedules: schedulesTable,
  crossPosts: crossPostsTable,
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => ({ op: "eq" })),
  and: vi.fn((...conditions: unknown[]) => ({ op: "and", conditions })),
  lte: vi.fn(() => ({ op: "lte" })),
  gte: vi.fn(() => ({ op: "gte" })),
}));

vi.mock("@/lib/scheduling/recurring", () => ({
  getNextOccurrence: mockGetNextOccurrence,
}));

import { processRecurringSchedules } from "../process-recurring";

type InngestHandler = {
  fn: (args: {
    step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> };
  }) => Promise<unknown>;
};

function createStep() {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
  };
}

let sendSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  selectResults.length = 0;
  crossPostCounter = 0;
  scheduleCounter = 0;
  mockGetNextOccurrence.mockReturnValue(new Date("2026-03-17T14:00:00.000Z"));
  sendSpy = vi.spyOn(inngest, "send").mockResolvedValue(undefined as never);
});

afterEach(() => {
  sendSpy.mockRestore();
});

describe("processRecurringSchedules", () => {
  it("emits schedule/execute-post with created schedule ids", async () => {
    selectResults.push(
      [
        {
          id: "recurring-1",
          userId: "user-1",
          channelId: "channel-1",
          frequency: "daily",
          dayOfWeek: null,
          dayOfMonth: null,
          timeUtc: "10:00",
          timezone: "UTC",
          platforms: ["twitter"],
          contentTemplateId: null,
          nextRunAt: new Date("2026-03-16T10:15:00.000Z"),
        },
      ],
      [],
    );

    const step = createStep();
    const result = await (processRecurringSchedules as unknown as InngestHandler).fn({ step });

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith({
      name: "schedule/execute-post",
      data: {
        scheduleId: "schedule-1",
        userId: "user-1",
      },
      ts: new Date("2026-03-16T10:15:00.000Z").getTime(),
    });
    expect(sendSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ scheduleId: "cross-post-1" }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
        processed: 1,
        created: 1,
      }),
    );
  });
});
