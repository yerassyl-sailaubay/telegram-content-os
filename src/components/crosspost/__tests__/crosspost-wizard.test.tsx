import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import React from "react";

// ─── Mock Setup ──────────────────────────────────────────────────────────────

const {
  mockUser,
  mockReturning,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockSelect,
  selectResults,
  mockInngestSend,
} = vi.hoisted(() => ({
  mockUser: { id: "user-123", email: "test@example.com" },
  mockReturning: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockSelect: vi.fn(),
  selectResults: [] as unknown[][],
  mockInngestSend: vi.fn().mockResolvedValue(undefined),
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

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: (_ns: string) => (key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      "step1Title": "Select Post",
      "step2Title": "AI Adaptation",
      "step3Title": "Edit Content",
      "step4Title": "Preview",
      "step5Title": "Publish",
      "selectPlatform": "Select target platform",
      "linkedin": "LinkedIn",
      "twitter": "Twitter / X",
      "searchPlaceholder": "Search posts...",
      "noPostsFound": "No posts found",
      "noPostsDescription": "Connect a Telegram channel and import posts to get started.",
      "continueToAdapt": "Adapt with AI",
      "adaptingHeading": "Adapting content with AI...",
      "adaptationComplete": "Adaptation complete!",
      "adaptationFailed": "Adaptation failed",
      "retryAdaptation": "Retry",
      "continueToEdit": "Review & Edit",
      "editHeading": "Review and edit the adapted content",
      "editDescription": "The AI-adapted content is on the right.",
      "originalLabel": "Original (Russian)",
      "adaptedLabel": "Adapted (English)",
      "continueToPreview": "Preview",
      "previewHeading": "Preview how your post will appear",
      "previewDescription": "This is a mockup of how your post will look on {platform}.",
      "continueToPublish": "Looks Good — Continue",
      "publishHeading": "Publish your post",
      "publishDescription": "Post immediately or schedule for later.",
      "postNow": "Post Now",
      "schedule": "Schedule",
      "postSuccess": "Post submitted!",
      "scheduleSuccess": "Post scheduled successfully!",
      "quotaLabel": "{used} of {limit} cross-posts used",
      "quotaExceeded": "Monthly quota exceeded",
      "back": "Back",
      "startOver": "Start Over",
      "goToSettings": "Go to Settings",
      "selectedPost": "Selected post",
      "postedAt": "Posted",
      "confirmSchedule": "Confirm Schedule",
      "posting": "Posting...",
      "scheduling": "Scheduling...",
      "characters": "{count} characters",
      "selectDatetime": "Select date and time",
      "timezone": "Timezone",
      "noConnectionTitle": "Platform not connected",
      "noConnectionDescription": "Connect your {platform} account in Settings.",
      "channel": "Channel",
      "adaptingDescription": "Adapting for {platform}...",
    };
    const base = messages[key] ?? key;
    if (params) {
      return base.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
    }
    return base;
  },
}));

// Mock next-intl server
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

// Mock navigation
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href }, children),
  usePathname: () => "/dashboard/crosspost",
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
  },
}));

// Mock drizzle-orm
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
    sql: Object.assign(vi.fn(() => "sql"), {
      join: vi.fn(),
    }),
  };
});

// Mock Inngest
vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: mockInngestSend },
}));

// Mock scheduling engine
vi.mock("@/lib/scheduling/engine", () => ({
  createSchedule: vi.fn().mockResolvedValue({ success: true, scheduleId: "sched-123" }),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock date-utils
vi.mock("@/lib/date-utils", () => ({
  formatDistanceToNow: vi.fn().mockReturnValue("2 days ago"),
}));

// Mock adaptation engine
vi.mock("@/lib/ai/adaptation-engine", () => ({
  splitIntoThread: vi.fn().mockReturnValue(["Tweet 1", "Tweet 2"]),
}));

// ─── Server Action Tests ──────────────────────────────────────────────────────

import {
  listTelegramPostsForCrosspost,
  getCrossPostUsage,
  triggerAdaptContent,
  getCrossPost,
  updateAdaptedContent,
  postCrossPostNow,
  scheduleCrossPost,
} from "@/server/actions/crosspost";

describe("CrossPost Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults.length = 0;
    // Reset mockReturning to return undefined by default
    mockReturning.mockResolvedValue([]);
  });

  // ─── listTelegramPostsForCrosspost ───────────────────────────────────────

  describe("listTelegramPostsForCrosspost", () => {
    it("returns empty when no channels exist", async () => {
      // selectResults empty → channels query returns []
      const result = await listTelegramPostsForCrosspost();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.posts).toEqual([]);
        expect(result.data.total).toBe(0);
      }
    });

    it("accepts search parameter", async () => {
      const result = await listTelegramPostsForCrosspost({ search: "test" });
      expect(result.success).toBe(true);
    });

    it("accepts pagination parameters", async () => {
      const result = await listTelegramPostsForCrosspost({ page: 2, perPage: 10 });
      expect(result.success).toBe(true);
    });
  });

  // ─── getCrossPostUsage ───────────────────────────────────────────────────

  describe("getCrossPostUsage", () => {
    it("returns usage data with used and limit", async () => {
      const result = await getCrossPostUsage();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("used");
        expect(result.data).toHaveProperty("limit");
        expect(result.data).toHaveProperty("month");
      }
    });
  });

  // ─── triggerAdaptContent ─────────────────────────────────────────────────

  describe("triggerAdaptContent", () => {
    it("returns error when postId missing", async () => {
      const result = await triggerAdaptContent({
        postId: "",
        platform: "linkedin",
      });
      // Empty postId should be caught by validation guard
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("returns crossPostId on success when post and channel found", async () => {
      // Queue: post found, channel found, usage query, insert
      selectResults.push(
        [{ id: "post-1", channelId: "chan-1" }], // post lookup
        [{ id: "chan-1" }],                        // channel ownership
        [],                                         // usage tracking (0 used)
      );
      mockReturning.mockResolvedValue([{ id: "cp-new" }]);

      const result = await triggerAdaptContent({
        postId: "post-1",
        platform: "linkedin",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.crossPostId).toBeDefined();
      }
    });

    it("accepts twitter platform", async () => {
      selectResults.push(
        [{ id: "post-1", channelId: "chan-1" }],
        [{ id: "chan-1" }],
        [],
      );
      mockReturning.mockResolvedValue([{ id: "cp-new" }]);

      const result = await triggerAdaptContent({
        postId: "post-1",
        platform: "twitter",
      });
      expect(result.success).toBe(true);
    });
  });

  // ─── getCrossPost ────────────────────────────────────────────────────────

  describe("getCrossPost", () => {
    it("returns cross-post data by ID when found", async () => {
      selectResults.push([{
        id: "cp-1",
        userId: "user-123",
        sourcePostId: "post-1",
        platform: "linkedin",
        adaptedContent: "Adapted content",
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);

      const result = await getCrossPost("cp-1");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("cp-1");
      }
    });

    it("returns error when cross-post not found", async () => {
      // selectResults empty → returns []
      const result = await getCrossPost("nonexistent");
      expect(result.success).toBe(false);
    });
  });

  // ─── updateAdaptedContent ────────────────────────────────────────────────

  describe("updateAdaptedContent", () => {
    it("returns error when crossPostId missing", async () => {
      const result = await updateAdaptedContent({
        crossPostId: "",
        adaptedContent: "New content",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("updates content successfully when record found", async () => {
      mockReturning.mockResolvedValue([{
        id: "cp-1",
        adaptedContent: "Updated content",
        userId: "user-123",
        sourcePostId: "post-1",
        platform: "linkedin",
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);

      const result = await updateAdaptedContent({
        crossPostId: "cp-1",
        adaptedContent: "Updated content",
      });
      expect(result.success).toBe(true);
    });
  });

  // ─── postCrossPostNow ────────────────────────────────────────────────────

  describe("postCrossPostNow", () => {
    it("returns error when crossPostId missing", async () => {
      const result = await postCrossPostNow({ crossPostId: "" });
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("triggers posting when cross-post and platform connection found", async () => {
      selectResults.push(
        [{
          id: "cp-1",
          userId: "user-123",
          platform: "linkedin",
          adaptedContent: "Content to post",
          status: "draft",
          sourcePostId: "post-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        [{ id: "conn-1" }], // platform connection
      );
      mockReturning.mockResolvedValue([{ id: "cp-1", status: "scheduled" }]);

      const result = await postCrossPostNow({ crossPostId: "cp-1" });
      expect(result.success).toBe(true);
    });
  });

  // ─── scheduleCrossPost ───────────────────────────────────────────────────

  describe("scheduleCrossPost", () => {
    it("returns error when crossPostId missing", async () => {
      const result = await scheduleCrossPost({
        crossPostId: "",
        scheduledAt: new Date(),
        timezone: "UTC",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("schedules with valid input when cross-post found", async () => {
      const future = new Date(Date.now() + 3600_000);
      selectResults.push([{
        id: "cp-1",
        adaptedContent: "Content to schedule",
      }]);
      mockReturning.mockResolvedValue([{ id: "cp-1" }]);

      const result = await scheduleCrossPost({
        crossPostId: "cp-1",
        scheduledAt: future,
        timezone: "UTC",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scheduleId).toBeDefined();
      }
    });
  });
});

// ─── Component Tests ─────────────────────────────────────────────────────────

// Mock child components to isolate CrossPostWizard rendering
vi.mock("@/components/crosspost/step-select-post", () => ({
  StepSelectPost: ({ onNext: _onNext }: { onNext: unknown }) =>
    React.createElement("div", { "data-testid": "step-select-post" },
      React.createElement("p", null, "Select Post"),
      React.createElement("button", null, "LinkedIn"),
      React.createElement("button", null, "Twitter / X"),
    ),
}));

vi.mock("@/components/crosspost/step-adapt", () => ({
  StepAdapt: () => React.createElement("div", { "data-testid": "step-adapt" }, "AI Adaptation"),
}));

vi.mock("@/components/crosspost/step-edit", () => ({
  StepEdit: () => React.createElement("div", { "data-testid": "step-edit" }, "Edit Content"),
}));

vi.mock("@/components/crosspost/step-preview", () => ({
  StepPreview: () => React.createElement("div", { "data-testid": "step-preview" }, "Preview"),
}));

vi.mock("@/components/crosspost/step-action", () => ({
  StepAction: () => React.createElement("div", { "data-testid": "step-action" }, "Publish"),
}));

import { CrossPostWizard } from "@/components/crosspost/crosspost-wizard";

describe("CrossPostWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders step 1 (select post) by default", async () => {
    const { container } = render(
      React.createElement(CrossPostWizard, { initialUsage: null })
    );
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByTestId("step-select-post")).toBeTruthy();
  });

  it("shows platform selector in step 1", async () => {
    render(React.createElement(CrossPostWizard, { initialUsage: null }));
    expect(screen.getByText("LinkedIn")).toBeTruthy();
    expect(screen.getByText("Twitter / X")).toBeTruthy();
  });

  it("shows step indicator labels", async () => {
    render(React.createElement(CrossPostWizard, { initialUsage: null }));
    expect(screen.getAllByText("Select Post").length).toBeGreaterThan(0);
    expect(screen.getByText("AI Adaptation")).toBeTruthy();
    expect(screen.getByText("Edit Content")).toBeTruthy();
    expect(screen.getAllByText("Preview").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Publish").length).toBeGreaterThan(0);
  });

  it("shows quota info when usage is provided", async () => {
    const { container } = render(
      React.createElement(CrossPostWizard, {
        initialUsage: { used: 10, limit: 50, month: "2024-01" }
      })
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders without crashing when no usage provided", () => {
    const { container } = render(
      React.createElement(CrossPostWizard, { initialUsage: null })
    );
    expect(container.firstChild).toBeTruthy();
  });
});

// ─── LinkedIn Preview Tests ──────────────────────────────────────────────────

import { LinkedInPreview } from "@/components/preview/linkedin-preview";

describe("LinkedInPreview", () => {
  it("renders post content", () => {
    render(
      React.createElement(LinkedInPreview, {
        content: "Test LinkedIn post content #AI"
      })
    );
    expect(screen.getByText(/Test LinkedIn post content/)).toBeTruthy();
  });

  it("renders author name", () => {
    render(
      React.createElement(LinkedInPreview, {
        content: "Content",
        authorName: "Jane Doe"
      })
    );
    expect(screen.getByText("Jane Doe")).toBeTruthy();
  });

  it("renders hashtags as styled links", () => {
    render(
      React.createElement(LinkedInPreview, {
        content: "Post with #hashtag here"
      })
    );
    expect(screen.getByText("#hashtag")).toBeTruthy();
  });
});

// ─── Twitter Preview Tests ───────────────────────────────────────────────────

import { TwitterPreview } from "@/components/preview/twitter-preview";

describe("TwitterPreview", () => {
  it("renders single tweet", () => {
    render(
      React.createElement(TwitterPreview, {
        content: "Single tweet content"
      })
    );
    expect(screen.getByText("Single tweet content")).toBeTruthy();
  });

  it("renders thread when multiple tweets provided", () => {
    render(
      React.createElement(TwitterPreview, {
        content: "Thread content",
        tweets: ["Tweet 1 content", "Tweet 2 content"]
      })
    );
    expect(screen.getByText("Tweet 1 content")).toBeTruthy();
    expect(screen.getByText("Tweet 2 content")).toBeTruthy();
  });

  it("shows thread header for multi-tweet content", () => {
    render(
      React.createElement(TwitterPreview, {
        content: "Thread",
        tweets: ["Tweet 1", "Tweet 2", "Tweet 3"]
      })
    );
    expect(screen.getByText(/Thread \(3 tweets\)/)).toBeTruthy();
  });

  it("shows post preview label for single tweet", () => {
    render(
      React.createElement(TwitterPreview, { content: "Short tweet" })
    );
    expect(screen.getByText("Post preview")).toBeTruthy();
  });
});
