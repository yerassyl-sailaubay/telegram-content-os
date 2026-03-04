import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Setup ──────────────────────────────────────────────────────────────

const { mockUser, mockReturning, mockInsert, mockUpdate, mockDelete, mockSelect, selectResults } =
  vi.hoisted(() => ({
    mockUser: { id: "user-123", email: "test@example.com" },
    mockReturning: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
    mockDelete: vi.fn(),
    mockSelect: vi.fn(),
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
  },
}));

// Mock drizzle-orm — preserve real exports, override operators
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, val: unknown) => ({ type: "eq", val })),
    and: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
  };
});

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ─── Import under test (after mocks) ────────────────────────────────────────

import {
  getSettings,
  updateProfile,
  updatePreferences,
  disconnectPlatform,
} from "@/server/actions/settings";

// ─── Test Data ───────────────────────────────────────────────────────────────

const mockUserRecord = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  avatarUrl: null,
  locale: "en",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPreferences = {
  id: "pref-1",
  userId: "user-123",
  timezone: "UTC",
  language: "en",
  aiModel: "auto" as const,
  adaptationTone: "professional" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSubscription = {
  id: "sub-1",
  userId: "user-123",
  plan: "free" as const,
  status: "active" as const,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  stripePriceId: null,
  cancelAtPeriodEnd: false,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockConnection = {
  id: "conn-1",
  userId: "user-123",
  platform: "linkedin" as const,
  accessTokenEncrypted: "encrypted",
  refreshTokenEncrypted: null,
  tokenExpiresAt: null,
  platformUserId: "li-user-1",
  platformUsername: "testuser",
  connectedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  selectResults.length = 0;
  mockReturning.mockReset();
});

// ─── getSettings ─────────────────────────────────────────────────────────────

describe("getSettings", () => {
  it("returns full settings data for a user", async () => {
    // user record
    selectResults.push([mockUserRecord]);
    // preferences
    selectResults.push([mockPreferences]);
    // platform connections
    selectResults.push([mockConnection]);
    // subscription
    selectResults.push([mockSubscription]);

    const result = await getSettings();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profile.name).toBe("Test User");
      expect(result.data.profile.email).toBe("test@example.com");
      expect(result.data.profile.timezone).toBe("UTC");
      expect(result.data.preferences.aiModel).toBe("auto");
      expect(result.data.preferences.adaptationTone).toBe("professional");
      expect(result.data.billing.plan).toBe("free");
      expect(result.data.connections).toHaveLength(2);
    }
  });

  it("returns defaults when no preferences exist", async () => {
    selectResults.push([mockUserRecord]);
    selectResults.push([]); // no preferences
    selectResults.push([]); // no connections
    selectResults.push([]); // no subscription

    const result = await getSettings();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profile.timezone).toBe("UTC");
      expect(result.data.preferences.aiModel).toBe("auto");
      expect(result.data.billing.plan).toBe("free");
    }
  });

  it("returns error when unauthorized", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as ReturnType<typeof createClient> extends Promise<infer T> ? T : never);

    const result = await getSettings();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Unauthorized");
    }
  });

  it("marks connection as expiring soon when token expires within 7 days", async () => {
    const soonExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    const expiringConnection = {
      ...mockConnection,
      tokenExpiresAt: soonExpiry,
    };

    selectResults.push([mockUserRecord]);
    selectResults.push([mockPreferences]);
    selectResults.push([expiringConnection]);
    selectResults.push([mockSubscription]);

    const result = await getSettings();
    expect(result.success).toBe(true);
    if (result.success) {
      const linkedinConn = result.data.connections.find((c) => c.platform === "linkedin");
      expect(linkedinConn?.isExpiringSoon).toBe(true);
    }
  });
});

// ─── updateProfile ───────────────────────────────────────────────────────────

describe("updateProfile", () => {
  it("updates name, timezone, and language when preferences exist", async () => {
    mockReturning.mockResolvedValue([]);
    selectResults.push([{ id: "pref-1" }]); // existing prefs check

    const result = await updateProfile({
      name: "New Name",
      timezone: "America/New_York",
      language: "ru",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("New Name");
      expect(result.data.timezone).toBe("America/New_York");
      expect(result.data.language).toBe("ru");
    }
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("inserts preferences when none exist", async () => {
    mockReturning.mockResolvedValue([]);
    selectResults.push([]); // no existing prefs

    const result = await updateProfile({
      name: "New Name",
      timezone: "Europe/London",
      language: "en",
    });

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("returns error when name is empty", async () => {
    const result = await updateProfile({
      name: "   ",
      timezone: "UTC",
      language: "en",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Name is required");
    }
  });
});

// ─── updatePreferences ───────────────────────────────────────────────────────

describe("updatePreferences", () => {
  it("updates AI model and adaptation tone when preferences exist", async () => {
    mockReturning.mockResolvedValue([]);
    selectResults.push([{ id: "pref-1" }]); // existing prefs

    const result = await updatePreferences({
      aiModel: "gemini-pro",
      adaptationTone: "casual",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aiModel).toBe("gemini-pro");
      expect(result.data.adaptationTone).toBe("casual");
    }
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("inserts preferences when none exist", async () => {
    mockReturning.mockResolvedValue([]);
    selectResults.push([]); // no existing prefs

    const result = await updatePreferences({
      aiModel: "gemini-flash",
      adaptationTone: "match-original",
    });

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });
});

// ─── disconnectPlatform ──────────────────────────────────────────────────────

describe("disconnectPlatform", () => {
  it("disconnects a connected platform", async () => {
    mockReturning.mockResolvedValue([{ id: "conn-1" }]);
    selectResults.push([{ id: "conn-1" }]); // connection found

    const result = await disconnectPlatform("linkedin");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.platform).toBe("linkedin");
    }
    expect(mockDelete).toHaveBeenCalled();
  });

  it("returns error when platform not connected", async () => {
    selectResults.push([]); // no connection found

    const result = await disconnectPlatform("twitter");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not connected");
    }
  });

  it("handles disconnect for twitter platform", async () => {
    mockReturning.mockResolvedValue([{ id: "conn-2" }]);
    selectResults.push([{ id: "conn-2" }]);

    const result = await disconnectPlatform("twitter");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.platform).toBe("twitter");
    }
  });
});
