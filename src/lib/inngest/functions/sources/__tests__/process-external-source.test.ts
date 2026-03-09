import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockParseUrl,
  mockExtractYouTubeTranscript,
  mockExtractArticle,
  mockDbInsert,
  mockDbUpdate,
} = vi.hoisted(() => ({
  mockParseUrl: vi.fn(),
  mockExtractYouTubeTranscript: vi.fn(),
  mockExtractArticle: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbUpdate: vi.fn(),
}));

vi.mock("@/lib/sources/url-parser", () => ({
  parseUrl: mockParseUrl,
}));

vi.mock("@/lib/sources/youtube", () => ({
  extractYouTubeTranscript: mockExtractYouTubeTranscript,
}));

vi.mock("@/lib/sources/article", () => ({
  extractArticle: mockExtractArticle,
}));

vi.mock("@/server/db", () => ({
  db: {
    insert: mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "content-item-uuid-1" }]),
      }),
    }),
    update: mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

vi.mock("@/server/db/schema", () => ({
  contentLibrary: {
    id: "id",
    userId: "userId",
    title: "title",
    content: "content",
    sourceType: "sourceType",
    status: "status",
    channelId: "channelId",
    sourceUrl: "sourceUrl",
    sourceMetadata: "sourceMetadata",
    isTemplate: "isTemplate",
    tags: "tags",
  },
  externalSources: {
    id: "id",
    userId: "userId",
    processingStatus: "processingStatus",
    title: "title",
    extractedText: "extractedText",
    extractedMetadata: "extractedMetadata",
    linkedDraftId: "linkedDraftId",
    errorMessage: "errorMessage",
    updatedAt: "updatedAt",
  },
}));

import { processExternalSource } from "../process-external-source";

type InngestHandler = { fn: (args: { event: unknown; step: unknown }) => Promise<unknown> };

function createMockStep() {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    sendEvent: vi.fn(async () => undefined),
  };
}

function createEvent(
  overrides: Partial<{ url: string; userId: string; channelId: string; sourceId?: string }> = {},
) {
  return {
    name: "sources/url.submitted" as const,
    data: {
      url: overrides.url ?? "https://www.youtube.com/watch?v=abc123",
      userId: overrides.userId ?? "user-uuid-1",
      channelId: overrides.channelId ?? "channel-uuid-1",
      sourceId: overrides.sourceId ?? "source-uuid-1",
    },
  };
}

async function runHandler(
  event: ReturnType<typeof createEvent>,
  step: ReturnType<typeof createMockStep>,
) {
  return (processExternalSource as unknown as InngestHandler).fn({ event, step });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDbInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "content-item-uuid-1" }]),
    }),
  });
  mockDbUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });
});

describe("processExternalSource", () => {
  it("is a valid Inngest function with accessible handler", () => {
    expect(processExternalSource).toBeDefined();
    expect((processExternalSource as unknown as InngestHandler).fn).toBeTypeOf("function");
  });

  it("YouTube URL → extract transcript → store directly in DB → emit generate event", async () => {
    const event = createEvent({ url: "https://www.youtube.com/watch?v=abc123" });
    const step = createMockStep();

    mockParseUrl.mockReturnValue({
      type: "youtube",
      url: "https://www.youtube.com/watch?v=abc123",
      videoId: "abc123",
    });
    mockExtractYouTubeTranscript.mockResolvedValue({
      content: "Hello world this is a YouTube transcript",
      sourceType: "youtube",
      metadata: { title: "Test Video", author: "Test Author", language: "en", wordCount: 7 },
    });

    const result = await runHandler(event, step);

    expect(mockParseUrl).toHaveBeenCalledWith("https://www.youtube.com/watch?v=abc123");
    expect(mockExtractYouTubeTranscript).toHaveBeenCalledWith("abc123");
    expect(mockDbInsert).toHaveBeenCalled();
    const insertCall = mockDbInsert.mock.results[0]?.value;
    expect(insertCall?.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-uuid-1",
        title: "Test Video",
        content: "Hello world this is a YouTube transcript",
        sourceType: "external_source",
        status: "draft",
        channelId: "channel-uuid-1",
        sourceUrl: "https://www.youtube.com/watch?v=abc123",
        sourceMetadata: expect.objectContaining({ title: "Test Video" }),
        isTemplate: false,
        tags: [],
      }),
    );

    expect(step.sendEvent).toHaveBeenCalledWith("emit-generate", {
      name: "ai/content.generate-from-source",
      data: {
        contentItemId: "content-item-uuid-1",
        userId: "user-uuid-1",
        channelId: "channel-uuid-1",
        sourceId: "source-uuid-1",
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
        contentItemId: "content-item-uuid-1",
        sourceType: "youtube",
      }),
    );
  });

  it("Article URL → extract article → store directly in DB → emit generate event", async () => {
    const event = createEvent({ url: "https://blog.example.com/great-article" });
    const step = createMockStep();

    mockParseUrl.mockReturnValue({
      type: "article",
      url: "https://blog.example.com/great-article",
    });
    mockExtractArticle.mockResolvedValue({
      content: "This is an interesting article about technology.",
      sourceType: "article",
      metadata: { title: "Great Article", author: "Jane Doe", wordCount: 8 },
    });

    const result = await runHandler(event, step);

    expect(mockParseUrl).toHaveBeenCalledWith("https://blog.example.com/great-article");
    expect(mockExtractArticle).toHaveBeenCalledWith("https://blog.example.com/great-article");
    expect(mockExtractYouTubeTranscript).not.toHaveBeenCalled();
    expect(mockDbInsert).toHaveBeenCalled();
    const insertCall = mockDbInsert.mock.results[0]?.value;
    expect(insertCall?.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-uuid-1",
        title: "Great Article",
        content: "This is an interesting article about technology.",
        sourceType: "external_source",
        status: "draft",
        channelId: "channel-uuid-1",
        sourceUrl: "https://blog.example.com/great-article",
        sourceMetadata: expect.objectContaining({ title: "Great Article" }),
      }),
    );

    expect(step.sendEvent).toHaveBeenCalledWith("emit-generate", {
      name: "ai/content.generate-from-source",
      data: {
        contentItemId: "content-item-uuid-1",
        userId: "user-uuid-1",
        channelId: "channel-uuid-1",
        sourceId: "source-uuid-1",
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
        contentItemId: "content-item-uuid-1",
        sourceType: "article",
      }),
    );
  });

  it("Unknown URL → throws error, no content stored, no event emitted", async () => {
    const event = createEvent({ url: "https://unknown-site.example/weird" });
    const step = createMockStep();

    mockParseUrl.mockReturnValue({ type: "unknown", url: "https://unknown-site.example/weird" });

    await expect(runHandler(event, step)).rejects.toThrow(/unsupported|unknown/i);
    expect(mockDbInsert).not.toHaveBeenCalled();
    expect(step.sendEvent).not.toHaveBeenCalled();
  });

  it("propagates extraction errors without storing content", async () => {
    const event = createEvent({ url: "https://www.youtube.com/watch?v=broken" });
    const step = createMockStep();

    mockParseUrl.mockReturnValue({
      type: "youtube",
      url: "https://www.youtube.com/watch?v=broken",
      videoId: "broken",
    });
    mockExtractYouTubeTranscript.mockRejectedValue(
      new Error("No transcript available for YouTube video: broken"),
    );

    await expect(runHandler(event, step)).rejects.toThrow(/transcript/i);
    expect(mockDbInsert).not.toHaveBeenCalled();
    expect(step.sendEvent).not.toHaveBeenCalled();
  });

  it("throws when DB insert fails (no rows returned), does not emit event", async () => {
    const event = createEvent({ url: "https://blog.example.com/article" });
    const step = createMockStep();

    mockParseUrl.mockReturnValue({ type: "article", url: "https://blog.example.com/article" });
    mockExtractArticle.mockResolvedValue({
      content: "Article content",
      sourceType: "article",
      metadata: { title: "Some Article", wordCount: 2 },
    });
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    });

    await expect(runHandler(event, step)).rejects.toThrow(/failed.*store|database/i);
    expect(step.sendEvent).not.toHaveBeenCalled();
  });

  it("executes steps in order including status transitions", async () => {
    const event = createEvent();
    const step = createMockStep();

    mockParseUrl.mockReturnValue({
      type: "youtube",
      url: "https://www.youtube.com/watch?v=abc123",
      videoId: "abc123",
    });
    mockExtractYouTubeTranscript.mockResolvedValue({
      content: "Transcript content",
      sourceType: "youtube",
      metadata: { title: "Video", wordCount: 2 },
    });

    await runHandler(event, step);

    const stepNames = step.run.mock.calls.map((call: unknown[]) => call[0]);
    expect(stepNames).toEqual([
      "mark-extracting",
      "parse-url",
      "extract-content",
      "store-content",
      "mark-extracted",
      "mark-generating",
    ]);
    expect(step.sendEvent).toHaveBeenCalledTimes(1);
  });

  it("throws when YouTube URL has no extractable videoId", async () => {
    const event = createEvent({ url: "https://www.youtube.com/" });
    const step = createMockStep();

    mockParseUrl.mockReturnValue({
      type: "youtube",
      url: "https://www.youtube.com/",
      videoId: undefined,
    });

    await expect(runHandler(event, step)).rejects.toThrow(/video.*id/i);
    expect(mockExtractYouTubeTranscript).not.toHaveBeenCalled();
    expect(mockDbInsert).not.toHaveBeenCalled();
    expect(step.sendEvent).not.toHaveBeenCalled();
  });

  it("works without sourceId (backward compatibility)", async () => {
    const event = createEvent({ sourceId: undefined });
    const step = createMockStep();

    mockParseUrl.mockReturnValue({
      type: "youtube",
      url: "https://www.youtube.com/watch?v=abc123",
      videoId: "abc123",
    });
    mockExtractYouTubeTranscript.mockResolvedValue({
      content: "Transcript",
      sourceType: "youtube",
      metadata: { title: "Video" },
    });

    const result = await runHandler(event, step);
    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
        contentItemId: "content-item-uuid-1",
      }),
    );
  });
});
