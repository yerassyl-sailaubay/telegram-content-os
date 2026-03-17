import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDbSelect,
  mockDbDelete,
  mockDbWhereDelete,
  mockDbLimit,
  selectBatches,
  aiPromptCacheTable,
} = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbDelete: vi.fn(),
  mockDbWhereDelete: vi.fn(),
  mockDbLimit: vi.fn(),
  selectBatches: [] as Array<Array<{ id: string }>>,
  aiPromptCacheTable: {
    id: "ai_prompt_cache.id",
    expiresAt: "ai_prompt_cache.expiresAt",
  },
}));

function createSelectChain() {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = mockDbLimit.mockImplementation(async () => selectBatches.shift() ?? []);
  return chain;
}

vi.mock("@/server/db", () => ({
  db: {
    select: mockDbSelect.mockImplementation(() => createSelectChain()),
    delete: mockDbDelete.mockImplementation(() => ({
      where: mockDbWhereDelete.mockResolvedValue(undefined),
    })),
  },
}));

vi.mock("@/server/db/schema", () => ({
  aiPromptCache: aiPromptCacheTable,
}));

vi.mock("drizzle-orm", () => ({
  asc: vi.fn((column: unknown) => ({ op: "asc", column })),
  inArray: vi.fn((column: unknown, values: unknown[]) => ({ op: "inArray", column, values })),
  lte: vi.fn((column: unknown, value: unknown) => ({ op: "lte", column, value })),
}));

import { cleanupPromptCache } from "../cleanup-prompt-cache";

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

beforeEach(() => {
  vi.clearAllMocks();
  selectBatches.length = 0;
});

describe("cleanupPromptCache", () => {
  it("deletes expired rows in batches until done", async () => {
    selectBatches.push(
      Array.from({ length: 500 }, (_, index) => ({ id: `expired-${index + 1}` })),
      Array.from({ length: 120 }, (_, index) => ({ id: `expired-${index + 501}` })),
      [],
    );

    const step = createStep();
    const result = await (cleanupPromptCache as unknown as InngestHandler).fn({ step });

    expect(mockDbDelete).toHaveBeenCalledTimes(2);
    expect(mockDbWhereDelete).toHaveBeenCalledTimes(2);
    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
        deletedRows: 620,
        batches: 2,
        batchSize: 500,
        maxBatches: 20,
        truncated: false,
      }),
    );
  });

  it("stops after max batches and reports truncation", async () => {
    for (let batch = 0; batch < 20; batch += 1) {
      const offset = batch * 500;
      selectBatches.push(
        Array.from({ length: 500 }, (_, index) => ({ id: `expired-${offset + index + 1}` })),
      );
    }

    const step = createStep();
    const result = await (cleanupPromptCache as unknown as InngestHandler).fn({ step });

    expect(mockDbDelete).toHaveBeenCalledTimes(20);
    expect(result).toEqual(
      expect.objectContaining({
        status: "completed",
        deletedRows: 10000,
        batches: 20,
        truncated: true,
      }),
    );
  });
});
