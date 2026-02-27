import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Setup ──────────────────────────────────────────────────────────────

const {
  mockUser,
  mockReturning,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockSelect,
  mockSelectDistinct,
  selectResults,
} = vi.hoisted(() => ({
  mockUser: { id: "user-123", email: "test@example.com" },
  mockReturning: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockSelect: vi.fn(),
  mockSelectDistinct: vi.fn(),
  // Queue of results for select queries (consumed in order)
  selectResults: [] as unknown[][],
}));

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockUser },
      }),
    },
  }),
}));

// Build a chainable mock that resolves to queued data when awaited
function createSelectChain() {
  const chain: Record<string, unknown> = {};
  const thenFn = (resolve: (val: unknown) => void) => {
    resolve(selectResults.shift() ?? []);
  };
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.then = thenFn;
  return chain;
}

function createMutationChain() {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockReturnValue(chain);
  chain.set = vi.fn().mockReturnValue(chain);
  chain.returning = mockReturning;
  return chain;
}

vi.mock("@/server/db", () => ({
  db: {
    insert: (...args: unknown[]) => {
      mockInsert(...args);
      return createMutationChain();
    },
    update: (...args: unknown[]) => {
      mockUpdate(...args);
      return createMutationChain();
    },
    delete: (...args: unknown[]) => {
      mockDelete(...args);
      return createMutationChain();
    },
    select: (...args: unknown[]) => {
      mockSelect(...args);
      return createSelectChain();
    },
    selectDistinct: (...args: unknown[]) => {
      mockSelectDistinct(...args);
      return createSelectChain();
    },
  },
}));

// Mock drizzle-orm — preserve real exports (relations, pgTable, etc.), override operators
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, val: unknown) => ({ type: "eq", val })),
    and: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
    desc: vi.fn((col: unknown) => ({ type: "desc", col })),
    asc: vi.fn((col: unknown) => ({ type: "asc", col })),
    ilike: vi.fn((_col: unknown, val: unknown) => ({ type: "ilike", val })),
    or: vi.fn((...conditions: unknown[]) => ({ type: "or", conditions })),
  };
});

// ─── Import under test (after mocks) ────────────────────────────────────────

import {
  createContent,
  updateContent,
  deleteContent,
  getContent,
  listContent,
  searchContent,
  getUserCategories,
  renameCategory,
  deleteCategory,
} from "../content";

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  selectResults.length = 0;
});

describe("createContent", () => {
  it("returns error when title is empty", async () => {
    const result = await createContent({ title: "", content: "body" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Title is required");
    }
  });

  it("returns error when title is whitespace only", async () => {
    const result = await createContent({ title: "   ", content: "body" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Title is required");
    }
  });

  it("creates content with valid input", async () => {
    const mockItem = {
      id: "content-1",
      userId: "user-123",
      title: "Test Title",
      content: "Test body",
      category: null,
      tags: [],
      isTemplate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockReturning.mockResolvedValueOnce([mockItem]);

    const result = await createContent({
      title: "Test Title",
      content: "Test body",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Test Title");
    }
    expect(mockInsert).toHaveBeenCalled();
  });

  it("trims title and tags", async () => {
    const mockItem = {
      id: "content-1",
      userId: "user-123",
      title: "Trimmed",
      content: "",
      category: "cat",
      tags: ["a", "b"],
      isTemplate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockReturning.mockResolvedValueOnce([mockItem]);

    const result = await createContent({
      title: "  Trimmed  ",
      content: "",
      category: " cat ",
      tags: [" a ", " b ", ""],
    });

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("defaults isTemplate to false", async () => {
    const mockItem = {
      id: "content-1",
      userId: "user-123",
      title: "Test",
      content: "",
      category: null,
      tags: [],
      isTemplate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockReturning.mockResolvedValueOnce([mockItem]);

    const result = await createContent({ title: "Test", content: "" });
    expect(result.success).toBe(true);
  });
});

describe("updateContent", () => {
  it("returns error when ID is missing", async () => {
    const result = await updateContent({ id: "", title: "New title" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Content ID is required");
    }
  });

  it("returns error when content not found", async () => {
    // select().from().where().limit() awaited → returns []
    selectResults.push([]);

    const result = await updateContent({ id: "nonexistent", title: "New" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Content not found");
    }
  });

  it("returns error when title is empty string", async () => {
    selectResults.push([{ id: "content-1", userId: "user-123", title: "Old Title" }]);

    const result = await updateContent({ id: "content-1", title: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Title cannot be empty");
    }
  });

  it("updates content with valid input", async () => {
    selectResults.push([{ id: "content-1", userId: "user-123", title: "Old Title" }]);

    const updatedItem = {
      id: "content-1",
      userId: "user-123",
      title: "New Title",
      updatedAt: new Date(),
    };
    mockReturning.mockResolvedValueOnce([updatedItem]);

    const result = await updateContent({
      id: "content-1",
      title: "New Title",
    });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });
});

describe("deleteContent", () => {
  it("returns error when ID is missing", async () => {
    const result = await deleteContent("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Content ID is required");
    }
  });

  it("returns error when content not found", async () => {
    mockReturning.mockResolvedValueOnce([]);

    const result = await deleteContent("nonexistent");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Content not found");
    }
  });

  it("deletes content and returns id", async () => {
    mockReturning.mockResolvedValueOnce([{ id: "content-1" }]);

    const result = await deleteContent("content-1");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("content-1");
    }
    expect(mockDelete).toHaveBeenCalled();
  });
});

describe("getContent", () => {
  it("returns error when not found", async () => {
    selectResults.push([]);

    const result = await getContent("nonexistent");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Content not found");
    }
  });

  it("returns content when found", async () => {
    selectResults.push([
      { id: "content-1", userId: "user-123", title: "Test", content: "body" },
    ]);

    const result = await getContent("content-1");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("content-1");
    }
  });
});

describe("listContent", () => {
  it("returns paginated results with defaults", async () => {
    // First select = count query
    selectResults.push([{ count: 2 }]);
    // Second select = items query
    selectResults.push([
      { id: "1", title: "A" },
      { id: "2", title: "B" },
    ]);

    const result = await listContent();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.perPage).toBe(20);
      expect(result.data.total).toBe(2);
      expect(result.data.items).toHaveLength(2);
    }
  });

  it("respects page and perPage params", async () => {
    selectResults.push([{ count: 50 }]);
    selectResults.push([]);

    const result = await listContent({ page: 3, perPage: 10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.perPage).toBe(10);
      expect(result.data.totalPages).toBe(5);
    }
  });

  it("clamps perPage to valid range", async () => {
    selectResults.push([{ count: 0 }]);
    selectResults.push([]);

    const result = await listContent({ perPage: 500 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.perPage).toBe(100);
    }
  });

  it("clamps page to minimum of 1", async () => {
    selectResults.push([{ count: 0 }]);
    selectResults.push([]);

    const result = await listContent({ page: -1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
    }
  });
});

describe("searchContent", () => {
  it("returns empty array for empty query", async () => {
    const result = await searchContent("");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("returns empty array for whitespace query", async () => {
    const result = await searchContent("   ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it("performs full-text search for valid query", async () => {
    selectResults.push([{ id: "1", title: "Matching content" }]);

    const result = await searchContent("matching");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
    }
  });
});

describe("getUserCategories", () => {
  it("returns distinct categories", async () => {
    selectResults.push([
      { category: "Blog" },
      { category: "Tutorial" },
    ]);

    const result = await getUserCategories();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["Blog", "Tutorial"]);
    }
  });

  it("filters out null categories", async () => {
    selectResults.push([
      { category: "Blog" },
      { category: null },
    ]);

    const result = await getUserCategories();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["Blog"]);
    }
  });
});

describe("renameCategory", () => {
  it("returns error for empty old name", async () => {
    const result = await renameCategory("", "New");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Category names are required");
    }
  });

  it("returns error for empty new name", async () => {
    const result = await renameCategory("Old", "  ");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Category names are required");
    }
  });

  it("renames category and returns count", async () => {
    mockReturning.mockResolvedValueOnce([{ id: "1" }, { id: "2" }]);

    const result = await renameCategory("Old", "New");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(2);
    }
  });
});

describe("deleteCategory", () => {
  it("returns error for empty name", async () => {
    const result = await deleteCategory("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Category name is required");
    }
  });

  it("sets category to null and returns count", async () => {
    mockReturning.mockResolvedValueOnce([{ id: "1" }]);

    const result = await deleteCategory("Old Category");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(1);
    }
  });
});
