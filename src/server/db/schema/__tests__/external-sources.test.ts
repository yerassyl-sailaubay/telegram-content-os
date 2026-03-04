import { describe, it, expect } from "vitest";
import {
  externalSourceTypeEnum,
  sourceProcessingStatusEnum,
  externalSources,
  externalSourcesRelations,
} from "../external-sources";

describe("externalSourceTypeEnum", () => {
  it("exists", () => {
    expect(externalSourceTypeEnum).toBeDefined();
  });

  it("has exactly 3 values in the correct order", () => {
    expect(externalSourceTypeEnum.enumValues).toEqual(["youtube", "article", "podcast"]);
  });
});

describe("sourceProcessingStatusEnum", () => {
  it("exists", () => {
    expect(sourceProcessingStatusEnum).toBeDefined();
  });

  it("has exactly 6 values in the correct order", () => {
    expect(sourceProcessingStatusEnum.enumValues).toEqual([
      "pending",
      "extracting",
      "extracted",
      "generating",
      "completed",
      "failed",
    ]);
  });
});

describe("externalSources table", () => {
  it("has id column", () => {
    expect(externalSources.id).toBeDefined();
  });

  it("has userId column", () => {
    expect(externalSources.userId).toBeDefined();
  });

  it("has sourceUrl column", () => {
    expect(externalSources.sourceUrl).toBeDefined();
  });

  it("has sourceType column", () => {
    expect(externalSources.sourceType).toBeDefined();
  });

  it("has title column", () => {
    expect(externalSources.title).toBeDefined();
  });

  it("has extractedText column", () => {
    expect(externalSources.extractedText).toBeDefined();
  });

  it("has extractedMetadata column", () => {
    expect(externalSources.extractedMetadata).toBeDefined();
  });

  it("has processingStatus column", () => {
    expect(externalSources.processingStatus).toBeDefined();
  });

  it("has errorMessage column", () => {
    expect(externalSources.errorMessage).toBeDefined();
  });

  it("has linkedDraftId column", () => {
    expect(externalSources.linkedDraftId).toBeDefined();
  });

  it("has createdAt column", () => {
    expect(externalSources.createdAt).toBeDefined();
  });

  it("has updatedAt column", () => {
    expect(externalSources.updatedAt).toBeDefined();
  });
});

describe("externalSourcesRelations", () => {
  it("is defined", () => {
    expect(externalSourcesRelations).toBeDefined();
  });
});
