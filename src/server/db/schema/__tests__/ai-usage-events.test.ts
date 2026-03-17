import { describe, expect, it } from "vitest";
import { aiUsageEvents, aiUsageEventsRelations } from "../ai-usage-events";

describe("aiUsageEvents table", () => {
  it("has userId column", () => {
    expect(aiUsageEvents.userId).toBeDefined();
  });

  it("has feature column", () => {
    expect(aiUsageEvents.feature).toBeDefined();
  });

  it("has modelId column", () => {
    expect(aiUsageEvents.modelId).toBeDefined();
  });

  it("has token columns", () => {
    expect(aiUsageEvents.promptTokens).toBeDefined();
    expect(aiUsageEvents.completionTokens).toBeDefined();
    expect(aiUsageEvents.totalTokens).toBeDefined();
  });

  it("has cost columns", () => {
    expect(aiUsageEvents.inputCostUsd).toBeDefined();
    expect(aiUsageEvents.outputCostUsd).toBeDefined();
    expect(aiUsageEvents.totalCostUsd).toBeDefined();
  });
});

describe("aiUsageEventsRelations", () => {
  it("is defined", () => {
    expect(aiUsageEventsRelations).toBeDefined();
  });
});
