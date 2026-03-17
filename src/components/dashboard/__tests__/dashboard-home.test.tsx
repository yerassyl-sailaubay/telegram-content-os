import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ─── Mock next-intl ──────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    void namespace;

    return (key: string, params?: Record<string, unknown>) => {
      const messages: Record<string, string> = {
        // dashboard namespace
        welcomeBack: "Welcome back, {name}",
        welcomeFallbackName: "there",
        statScheduled: "Scheduled",
        statScheduledDescription: "Posts queued for publishing.",
        statWeeklyEngagement: "Engagement",
        statWeeklyEngagementDescription: "Reactions, clicks, and shares over 7 days.",
        statAiGenerations: "AI Generations",
        statAiDescription: "Used from this month's limit.",
        actionNewPost: "New Post",
        actionCreateFromUrl: "Create from URL",
        actionViewSchedule: "View Schedule",
        viewCalendar: "View all",
        activityFeedTitle: "Recent Activity",
        activityEmpty: "No activity yet",
        activityEmptyDescription: "Your publishing activity will appear here.",
        activityType_adapted: "adapted",
        activityType_scheduled: "scheduled",
        activityType_published: "published",
        activityType_failed: "failed",
        upcomingPostsTitle: "Upcoming Posts",
        upcomingEmpty: "No upcoming posts",
        upcomingEmptyDescription: "Schedule a post to see it here.",
        sparklineTitle: "7-Day Engagement",
        sparklineEmpty: "No engagement data yet",
        sparklineLabel: "Engagement",
      };
      const base = messages[key] ?? key;
      if (params) {
        return base.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
      }
      return base;
    };
  },
}));

// ─── Mock @/i18n/navigation ──────────────────────────────────────────────────

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => React.createElement("a", { href, className, "data-testid": "nav-link" }, children),
}));

// ─── Mock recharts ───────────────────────────────────────────────────────────

vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "line-chart" }, children),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "responsive-container" }, children),
}));

// ─── Imports after mocks ─────────────────────────────────────────────────────

import { WelcomeSection } from "../welcome-section";
import { QuickStatsSection } from "../quick-stats";
import { QuickActions } from "../quick-actions";
import { ActivityFeed } from "../activity-feed";
import { UpcomingPosts } from "../upcoming-posts";
import { EngagementSparkline } from "../engagement-sparkline";
import type {
  QuickStats,
  ActivityEvent,
  UpcomingPost,
  EngagementPoint,
} from "@/server/actions/dashboard";

// ─── Test data helpers ───────────────────────────────────────────────────────

function makeQuickStats(): QuickStats {
  return {
    crossPostsUsed: 3,
    crossPostsLimit: 5,
    scheduledCount: 2,
    weeklyEngagement: 142,
    connectedPlatforms: 2,
  };
}

function makeActivityEvents(): ActivityEvent[] {
  return [
    {
      id: "evt-1",
      type: "published",
      platform: "linkedin",
      contentSnippet: "This is a LinkedIn post about productivity",
      timestamp: new Date("2024-01-15T10:00:00Z"),
    },
    {
      id: "evt-2",
      type: "scheduled",
      platform: "twitter",
      contentSnippet: "Tweet about our latest feature",
      timestamp: new Date("2024-01-15T09:00:00Z"),
    },
    {
      id: "evt-3",
      type: "failed",
      platform: "linkedin",
      contentSnippet: null,
      timestamp: new Date("2024-01-14T15:00:00Z"),
    },
    {
      id: "evt-4",
      type: "adapted",
      platform: "twitter",
      contentSnippet: "Adapted tweet content",
      timestamp: new Date("2024-01-14T12:00:00Z"),
    },
  ];
}

function makeUpcomingPosts(): UpcomingPost[] {
  const future = new Date();
  future.setDate(future.getDate() + 1);
  return [
    {
      id: "sched-1",
      platform: "linkedin",
      contentSnippet: "Upcoming LinkedIn post",
      scheduledAt: future,
    },
    {
      id: "sched-2",
      platform: "twitter",
      contentSnippet: "Upcoming tweet",
      scheduledAt: new Date(future.getTime() + 86400000),
    },
  ];
}

function makeSparklineData(): EngagementPoint[] {
  return [
    { date: "2024-01-09", total: 10 },
    { date: "2024-01-10", total: 25 },
    { date: "2024-01-11", total: 15 },
    { date: "2024-01-12", total: 40 },
    { date: "2024-01-13", total: 30 },
    { date: "2024-01-14", total: 55 },
    { date: "2024-01-15", total: 20 },
  ];
}

function makeEmptySparklineData(): EngagementPoint[] {
  return [
    { date: "2024-01-09", total: 0 },
    { date: "2024-01-10", total: 0 },
    { date: "2024-01-11", total: 0 },
  ];
}

// ─── WelcomeSection tests ────────────────────────────────────────────────────

describe("WelcomeSection", () => {
  it("renders with data-testid", () => {
    render(
      React.createElement(WelcomeSection, {
        userName: "Alice",
        userEmail: "alice@example.com",
      }),
    );
    expect(screen.getByTestId("welcome-section")).toBeTruthy();
  });

  it("shows welcome message with user name", () => {
    render(
      React.createElement(WelcomeSection, {
        userName: "Alice",
        userEmail: "alice@example.com",
      }),
    );
    expect(screen.getByText(/Welcome back, Alice/)).toBeTruthy();
  });

  it("falls back to email when name is null", () => {
    render(
      React.createElement(WelcomeSection, {
        userName: null,
        userEmail: "alice@example.com",
      }),
    );
    expect(screen.getByText(/Welcome back, alice@example\.com/)).toBeTruthy();
  });

  it("falls back to default name when both are null", () => {
    render(
      React.createElement(WelcomeSection, {
        userName: null,
        userEmail: null,
      }),
    );
    expect(screen.getByText(/Welcome back, there/)).toBeTruthy();
  });

  it("shows current date", () => {
    render(
      React.createElement(WelcomeSection, {
        userName: "Alice",
        userEmail: null,
      }),
    );
    // Date should be present (any text containing year)
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeTruthy();
  });
});

// ─── QuickStatsSection tests ─────────────────────────────────────────────────

describe("QuickStatsSection", () => {
  it("renders with data-testid", () => {
    render(React.createElement(QuickStatsSection, { data: makeQuickStats() }));
    expect(screen.getByTestId("quick-stats")).toBeTruthy();
  });

  it("renders 3 metrics cards", () => {
    render(React.createElement(QuickStatsSection, { data: makeQuickStats() }));
    expect(screen.getAllByTestId("metrics-card").length).toBe(3);
  });

  it("shows cross-posts usage", () => {
    render(React.createElement(QuickStatsSection, { data: makeQuickStats() }));
    expect(screen.getByText("3 / 5")).toBeTruthy();
  });

  it("shows unlimited symbol for pro tier", () => {
    render(
      React.createElement(QuickStatsSection, {
        data: { ...makeQuickStats(), crossPostsLimit: -1 },
      }),
    );
    expect(screen.getByText(/∞/)).toBeTruthy();
  });

  it("shows scheduled count", () => {
    render(React.createElement(QuickStatsSection, { data: makeQuickStats() }));
    // scheduledCount=2 and connectedPlatforms=2 — both render as '2'
    const twos = screen.getAllByText("2");
    expect(twos.length).toBeGreaterThanOrEqual(1);
  });

  it("renders stat titles", () => {
    render(React.createElement(QuickStatsSection, { data: makeQuickStats() }));
    expect(screen.getByText("Scheduled")).toBeTruthy();
    expect(screen.getByText("Engagement")).toBeTruthy();
    expect(screen.getByText("AI Generations")).toBeTruthy();
  });
});

// ─── QuickActions tests ──────────────────────────────────────────────────────

describe("QuickActions", () => {
  it("renders with data-testid", () => {
    render(React.createElement(QuickActions, {}));
    expect(screen.getByTestId("quick-actions")).toBeTruthy();
  });

  it("renders New Post button", () => {
    render(React.createElement(QuickActions, {}));
    expect(screen.getByText("New Post")).toBeTruthy();
  });

  it("renders Create from URL button", () => {
    render(React.createElement(QuickActions, {}));
    expect(screen.getByText("Create from URL")).toBeTruthy();
  });

  it("renders View Schedule button", () => {
    render(React.createElement(QuickActions, {}));
    expect(screen.getByText("View Schedule")).toBeTruthy();
  });

  it("New Post links to telegram-post page", () => {
    render(React.createElement(QuickActions, {}));
    const links = screen.getAllByTestId("nav-link");
    const newPostLink = links.find((l) => l.getAttribute("href") === "/dashboard/telegram-post");
    expect(newPostLink).toBeTruthy();
  });

  it("Create from URL links to create page", () => {
    render(React.createElement(QuickActions, {}));
    const links = screen.getAllByTestId("nav-link");
    const createLink = links.find((l) => l.getAttribute("href") === "/dashboard/create");
    expect(createLink).toBeTruthy();
  });

  it("View Schedule links to schedule page", () => {
    render(React.createElement(QuickActions, {}));
    const links = screen.getAllByTestId("nav-link");
    const scheduleLink = links.find((l) => l.getAttribute("href") === "/dashboard/schedule");
    expect(scheduleLink).toBeTruthy();
  });
});

// ─── ActivityFeed tests ──────────────────────────────────────────────────────

describe("ActivityFeed", () => {
  it("renders with data-testid", () => {
    render(React.createElement(ActivityFeed, { events: makeActivityEvents() }));
    expect(screen.getByTestId("activity-feed")).toBeTruthy();
  });

  it("renders title", () => {
    render(React.createElement(ActivityFeed, { events: makeActivityEvents() }));
    expect(screen.getByText("Recent Activity")).toBeTruthy();
  });

  it("renders event items", () => {
    render(React.createElement(ActivityFeed, { events: makeActivityEvents() }));
    expect(screen.getByText(/LinkedIn post about productivity/)).toBeTruthy();
    expect(screen.getByText(/Tweet about our latest feature/)).toBeTruthy();
  });

  it("shows platform badges", () => {
    render(React.createElement(ActivityFeed, { events: makeActivityEvents() }));
    expect(screen.getAllByText("LinkedIn").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Twitter / X").length).toBeGreaterThan(0);
  });

  it("shows event type labels", () => {
    render(React.createElement(ActivityFeed, { events: makeActivityEvents() }));
    expect(screen.getByText("published")).toBeTruthy();
    expect(screen.getByText("scheduled")).toBeTruthy();
    expect(screen.getByText("failed")).toBeTruthy();
    expect(screen.getByText("adapted")).toBeTruthy();
  });

  it("shows empty state when no events", () => {
    render(React.createElement(ActivityFeed, { events: [] }));
    expect(screen.getByText("No activity yet")).toBeTruthy();
    expect(screen.getByText("Your publishing activity will appear here.")).toBeTruthy();
  });

  it("shows CTA link in empty state", () => {
    render(React.createElement(ActivityFeed, { events: [] }));
    const links = screen.getAllByTestId("nav-link");
    const createLink = links.find((l) => l.getAttribute("href") === "/dashboard/telegram-post");
    expect(createLink).toBeTruthy();
  });

  it("handles null contentSnippet gracefully", () => {
    const eventsWithNull: ActivityEvent[] = [
      {
        id: "evt-null",
        type: "failed",
        platform: "linkedin",
        contentSnippet: null,
        timestamp: new Date(),
      },
    ];
    render(React.createElement(ActivityFeed, { events: eventsWithNull }));
    expect(screen.getByTestId("activity-feed")).toBeTruthy();
    expect(screen.getByText("LinkedIn")).toBeTruthy();
  });
});

// ─── UpcomingPosts tests ──────────────────────────────────────────────────────

describe("UpcomingPosts", () => {
  it("renders with data-testid", () => {
    render(React.createElement(UpcomingPosts, { posts: makeUpcomingPosts() }));
    expect(screen.getByTestId("upcoming-posts")).toBeTruthy();
  });

  it("renders title", () => {
    render(React.createElement(UpcomingPosts, { posts: makeUpcomingPosts() }));
    expect(screen.getByText("Upcoming Posts")).toBeTruthy();
  });

  it("renders post content snippets", () => {
    render(React.createElement(UpcomingPosts, { posts: makeUpcomingPosts() }));
    expect(screen.getByText("Upcoming LinkedIn post")).toBeTruthy();
    expect(screen.getByText("Upcoming tweet")).toBeTruthy();
  });

  it("shows platform badges", () => {
    render(React.createElement(UpcomingPosts, { posts: makeUpcomingPosts() }));
    expect(screen.getByText("LinkedIn")).toBeTruthy();
    expect(screen.getByText("Twitter / X")).toBeTruthy();
  });

  it("shows scheduled time", () => {
    render(React.createElement(UpcomingPosts, { posts: makeUpcomingPosts() }));
    // Should show time in some form (in Xd, in Xh, or date)
    const timeTexts = screen.getAllByText(/in \d/);
    expect(timeTexts.length).toBeGreaterThan(0);
  });

  it("shows empty state when no posts", () => {
    render(React.createElement(UpcomingPosts, { posts: [] }));
    expect(screen.getByText("No upcoming posts")).toBeTruthy();
    expect(screen.getByText("Schedule a post to see it here.")).toBeTruthy();
  });

  it("shows CTA link in empty state", () => {
    render(React.createElement(UpcomingPosts, { posts: [] }));
    const links = screen.getAllByTestId("nav-link");
    const scheduleLink = links.find((l) => l.getAttribute("href") === "/dashboard/schedule");
    expect(scheduleLink).toBeTruthy();
  });
});

// ─── EngagementSparkline tests ────────────────────────────────────────────────

describe("EngagementSparkline", () => {
  it("renders with data-testid", () => {
    render(
      React.createElement(EngagementSparkline, {
        data: makeSparklineData(),
      }),
    );
    expect(screen.getByTestId("engagement-sparkline")).toBeTruthy();
  });

  it("renders title", () => {
    render(
      React.createElement(EngagementSparkline, {
        data: makeSparklineData(),
      }),
    );
    expect(screen.getByText("7-Day Engagement")).toBeTruthy();
  });

  it("renders chart when data has non-zero values", () => {
    render(
      React.createElement(EngagementSparkline, {
        data: makeSparklineData(),
      }),
    );
    expect(screen.getByTestId("responsive-container")).toBeTruthy();
    expect(screen.getByTestId("line-chart")).toBeTruthy();
  });

  it("shows empty state when all values are zero", () => {
    render(
      React.createElement(EngagementSparkline, {
        data: makeEmptySparklineData(),
      }),
    );
    expect(screen.getByText("No engagement data yet")).toBeTruthy();
  });

  it("shows empty state when data array is empty", () => {
    render(
      React.createElement(EngagementSparkline, {
        data: [],
      }),
    );
    expect(screen.getByText("No engagement data yet")).toBeTruthy();
  });
});
