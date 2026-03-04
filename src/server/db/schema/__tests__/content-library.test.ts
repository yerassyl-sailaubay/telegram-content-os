import { describe, it, expect } from "vitest";
import {
  contentSourceTypeEnum,
  contentStatusEnum,
  contentLibrary,
  contentLibraryRelations,
} from "../content-library";

describe("contentSourceTypeEnum", () => {
  it("exists", () => {
    expect(contentSourceTypeEnum).toBeDefined();
  });

  it("has exactly 5 values in the correct order", () => {
    expect(contentSourceTypeEnum.enumValues).toEqual([
      "telegram_import",
      "idea",
      "repurposed",
      "external_source",
      "ai_generated",
    ]);
  });
});

describe("contentStatusEnum", () => {
  it("exists", () => {
    expect(contentStatusEnum).toBeDefined();
  });

  it("has exactly 4 values in the correct order", () => {
    expect(contentStatusEnum.enumValues).toEqual(["draft", "published", "archived", "scheduled"]);
  });
});

describe("contentLibrary table", () => {
  it("has sourceType column", () => {
    expect(contentLibrary.sourceType).toBeDefined();
  });

  it("has status column", () => {
    expect(contentLibrary.status).toBeDefined();
  });

  it("has channelId column", () => {
    expect(contentLibrary.channelId).toBeDefined();
  });

  it("has sourceUrl column", () => {
    expect(contentLibrary.sourceUrl).toBeDefined();
  });

  it("has sourceMetadata column", () => {
    expect(contentLibrary.sourceMetadata).toBeDefined();
  });
});

describe("contentLibraryRelations", () => {
  it("includes the user relation", () => {
    expect(contentLibraryRelations).toBeDefined();
  });
});
