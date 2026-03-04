import { describe, it, expect } from "vitest";
import {
  scheduleTargetTypeEnum,
  schedules,
  schedulesRelations,
  scheduleStatusEnum,
} from "../schedules";

describe("scheduleTargetTypeEnum", () => {
  it("has correct enum values", () => {
    expect(scheduleTargetTypeEnum.enumValues).toEqual(["cross_post", "telegram_publish"]);
  });
});

describe("scheduleStatusEnum", () => {
  it("still has unchanged enum values", () => {
    expect(scheduleStatusEnum.enumValues).toEqual([
      "pending",
      "processing",
      "completed",
      "failed",
      "cancelled",
    ]);
  });
});

describe("schedules table", () => {
  it("has crossPostId column", () => {
    expect(schedules.crossPostId).toBeDefined();
  });

  it("has contentLibraryId column", () => {
    expect(schedules.contentLibraryId).toBeDefined();
  });

  it("has targetType column", () => {
    expect(schedules.targetType).toBeDefined();
  });

  it("has channelId column", () => {
    expect(schedules.channelId).toBeDefined();
  });
});

describe("schedulesRelations", () => {
  it("is defined", () => {
    expect(schedulesRelations).toBeDefined();
  });
});
