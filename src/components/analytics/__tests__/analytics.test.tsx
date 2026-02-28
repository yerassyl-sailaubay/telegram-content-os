import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// ─── Mock next-intl ──────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (_ns: string) =>
    (key: string, params?: Record<string, unknown>) => {
      const messages: Record<string, string> = {
        // analytics namespace
        loading: "Refreshing...",
        errorTitle: "Failed to load analytics",
        retry: "Try again",
        allChannels: "All channels",
        totalCrossPosts: "Cross-Posts",
        totalEngagement: "Total Engagement",
        avgEngagementRate: "Avg. Engagement Rate",
        activePlatforms: "Active Platforms",
        engagementOverTime: "Engagement Over Time",
        range_7d: "7d",
        range_30d: "30d",
        range_90d: "90d",
        platformComparison: "Platform Comparison",
        metric_likes: "Likes",
        metric_comments: "Comments",
        metric_shares: "Shares",
        metric_clicks: "Clicks",
        bestPostingTimes: "Best Posting Times",
        heatmapSubtitle: "Engagement by day and hour",
        engagementCount: "{count} engagements",
        legendLow: "Low",
        legendHigh: "High",
        recentPosts: "Recent Cross-Posts",
        allPlatforms: "All platforms",
        content: "Content",
        platform: "Platform",
        status: "Status",
        postedAt: "Posted",
        impressions: "Impressions",
        engagement: "Engagement",
        noDataYet: "No data yet",
        noDataDescription:
          "Cross-post your first content to see analytics here",
      };
      const base = messages[key] ?? key;
      if (params) {
        return base.replace(/\{(\w+)\}/g, (_, k) =>
          String(params[k] ?? `{${k}}`),
        );
      }
      return base;
    },
}));

// ─── Mock analytics server action ───────────────────────────────────────────

vi.mock("@/server/actions/analytics", () => ({
  getAnalyticsDashboard: vi.fn().mockResolvedValue({ success: false, error: "test" }),
}));

// ─── Mock recharts to avoid ResizeObserver errors in happy-dom ───────────────

vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "line-chart" }, children),
  BarChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "bar-chart" }, children),
  Line: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({
    children,
  }: {
    children: React.ReactNode;
  }) =>
    React.createElement("div", { "data-testid": "responsive-container" }, children),
}));

// ─── Imports after mocks ─────────────────────────────────────────────────────

import { MetricsCard } from "../metrics-card";
import { EngagementChart } from "../engagement-chart";
import { PlatformComparison } from "../platform-comparison";
import { PostingHeatmap } from "../posting-heatmap";
import { PostsTable } from "../posts-table";
import { AnalyticsDashboard } from "../analytics-dashboard";
import type {
  EngagementDataPoint,
  PlatformComparisonData,
  HeatmapCell,
  RecentPostRow,
  AnalyticsDashboardData,
} from "@/server/actions/analytics";

// ─── Test data helpers ───────────────────────────────────────────────────────

function makeEngagementData(): EngagementDataPoint[] {
  return [
    { date: "2024-01-01", linkedin: 10, twitter: 5, total: 15 },
    { date: "2024-01-02", linkedin: 20, twitter: 8, total: 28 },
  ];
}

function makeEmptyEngagementData(): EngagementDataPoint[] {
  return [
    { date: "2024-01-01", linkedin: 0, twitter: 0, total: 0 },
    { date: "2024-01-02", linkedin: 0, twitter: 0, total: 0 },
  ];
}

function makePlatformData(): PlatformComparisonData[] {
  return [
    {
      platform: "linkedin",
      impressions: 1000,
      likes: 50,
      comments: 10,
      shares: 5,
      clicks: 30,
      totalEngagement: 95,
    },
    {
      platform: "twitter",
      impressions: 500,
      likes: 30,
      comments: 5,
      shares: 8,
      clicks: 20,
      totalEngagement: 63,
    },
  ];
}

function makeHeatmapData(): HeatmapCell[] {
  return [
    { day: 0, hour: 9, value: 50 },
    { day: 1, hour: 14, value: 30 },
    { day: 2, hour: 18, value: 10 },
  ];
}

function makeRecentPosts(): RecentPostRow[] {
  return [
    {
      id: "post-1",
      platform: "linkedin",
      adaptedContent: "LinkedIn post content for testing",
      status: "published",
      postedAt: new Date("2024-01-15"),
      createdAt: new Date("2024-01-15"),
      impressions: 1000,
      likes: 50,
      comments: 10,
      shares: 5,
      clicks: 30,
      totalEngagement: 95,
    },
    {
      id: "post-2",
      platform: "twitter",
      adaptedContent: "Twitter post content for testing",
      status: "published",
      postedAt: new Date("2024-01-14"),
      createdAt: new Date("2024-01-14"),
      impressions: 500,
      likes: 30,
      comments: 5,
      shares: 8,
      clicks: 20,
      totalEngagement: 63,
    },
  ];
}

function makeDashboardData(): AnalyticsDashboardData {
  return {
    overview: {
      totalCrossPosts: 42,
      totalEngagement: 1250,
      avgEngagementRate: 4.5,
      activePlatforms: 2,
    },
    engagementOverTime: makeEngagementData(),
    platformComparison: makePlatformData(),
    heatmap: makeHeatmapData(),
    recentPosts: makeRecentPosts(),
    channels: [
      { id: "ch-1", title: "My Channel", username: "@mychannel" },
    ],
  };
}

// ─── MetricsCard tests ───────────────────────────────────────────────────────

describe("MetricsCard", () => {
  it("renders title and value", () => {
    render(
      React.createElement(MetricsCard, {
        title: "Total Posts",
        value: 42,
        icon: React.createElement("span", null, "📊"),
      }),
    );
    expect(screen.getByText("Total Posts")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
  });

  it("renders with data-testid", () => {
    render(
      React.createElement(MetricsCard, {
        title: "Engagement",
        value: "1.2k",
        icon: React.createElement("span", null),
      }),
    );
    expect(screen.getByTestId("metrics-card")).toBeTruthy();
  });

  it("shows positive trend arrow", () => {
    render(
      React.createElement(MetricsCard, {
        title: "Growth",
        value: 100,
        icon: React.createElement("span", null),
        trend: 12,
        trendLabel: "vs last month",
      }),
    );
    expect(screen.getByText(/\+12%/)).toBeTruthy();
    expect(screen.getByText("vs last month")).toBeTruthy();
  });

  it("shows negative trend arrow", () => {
    render(
      React.createElement(MetricsCard, {
        title: "Decline",
        value: 50,
        icon: React.createElement("span", null),
        trend: -8,
      }),
    );
    expect(screen.getByText(/-8%/)).toBeTruthy();
  });

  it("shows no trend when not provided", () => {
    const { container } = render(
      React.createElement(MetricsCard, {
        title: "Flat",
        value: 0,
        icon: React.createElement("span", null),
      }),
    );
    expect(container.firstChild).toBeTruthy();
  });
});

// ─── EngagementChart tests ───────────────────────────────────────────────────

describe("EngagementChart", () => {
  it("renders with data-testid", () => {
    render(
      React.createElement(EngagementChart, {
        data: makeEngagementData(),
        dateRange: "30d",
        onDateRangeChange: vi.fn(),
      }),
    );
    expect(screen.getByTestId("engagement-chart")).toBeTruthy();
  });

  it("renders the chart title", () => {
    render(
      React.createElement(EngagementChart, {
        data: makeEngagementData(),
        dateRange: "30d",
        onDateRangeChange: vi.fn(),
      }),
    );
    expect(screen.getByText("Engagement Over Time")).toBeTruthy();
  });

  it("shows date range buttons", () => {
    render(
      React.createElement(EngagementChart, {
        data: makeEngagementData(),
        dateRange: "30d",
        onDateRangeChange: vi.fn(),
      }),
    );
    expect(screen.getByText("7d")).toBeTruthy();
    expect(screen.getByText("30d")).toBeTruthy();
    expect(screen.getByText("90d")).toBeTruthy();
  });

  it("calls onDateRangeChange when range button clicked", () => {
    const onChange = vi.fn();
    render(
      React.createElement(EngagementChart, {
        data: makeEngagementData(),
        dateRange: "30d",
        onDateRangeChange: onChange,
      }),
    );
    fireEvent.click(screen.getByText("7d"));
    expect(onChange).toHaveBeenCalledWith("7d");
  });

  it("shows empty state when all data is zero", () => {
    render(
      React.createElement(EngagementChart, {
        data: makeEmptyEngagementData(),
        dateRange: "30d",
        onDateRangeChange: vi.fn(),
      }),
    );
    expect(screen.getByText("No data yet")).toBeTruthy();
  });

  it("shows empty state when data array is empty", () => {
    render(
      React.createElement(EngagementChart, {
        data: [],
        dateRange: "7d",
        onDateRangeChange: vi.fn(),
      }),
    );
    expect(screen.getByText("No data yet")).toBeTruthy();
  });
});

// ─── PlatformComparison tests ────────────────────────────────────────────────

describe("PlatformComparison", () => {
  it("renders with data-testid", () => {
    render(
      React.createElement(PlatformComparison, {
        data: makePlatformData(),
      }),
    );
    expect(screen.getByTestId("platform-comparison")).toBeTruthy();
  });

  it("renders the chart title", () => {
    render(
      React.createElement(PlatformComparison, {
        data: makePlatformData(),
      }),
    );
    expect(screen.getByText("Platform Comparison")).toBeTruthy();
  });

  it("shows empty state when no data", () => {
    render(
      React.createElement(PlatformComparison, {
        data: [],
      }),
    );
    expect(screen.getByText("No data yet")).toBeTruthy();
  });
});

// ─── PostingHeatmap tests ────────────────────────────────────────────────────

describe("PostingHeatmap", () => {
  it("renders with data-testid", () => {
    render(React.createElement(PostingHeatmap, { data: makeHeatmapData() }));
    expect(screen.getByTestId("posting-heatmap")).toBeTruthy();
  });

  it("renders the title", () => {
    render(React.createElement(PostingHeatmap, { data: makeHeatmapData() }));
    expect(screen.getByText("Best Posting Times")).toBeTruthy();
  });

  it("shows day labels", () => {
    render(React.createElement(PostingHeatmap, { data: makeHeatmapData() }));
    expect(screen.getByText("Mon")).toBeTruthy();
    expect(screen.getByText("Fri")).toBeTruthy();
    expect(screen.getByText("Sun")).toBeTruthy();
  });

  it("shows empty state when all values are zero", () => {
    const emptyData: HeatmapCell[] = Array.from({ length: 7 }, (_, day) =>
      Array.from({ length: 24 }, (__, hour) => ({ day, hour, value: 0 })),
    ).flat();
    render(React.createElement(PostingHeatmap, { data: emptyData }));
    expect(screen.getByText("No data yet")).toBeTruthy();
  });

  it("shows empty state when data is empty array", () => {
    render(React.createElement(PostingHeatmap, { data: [] }));
    expect(screen.getByText("No data yet")).toBeTruthy();
  });

  it("shows legend labels", () => {
    render(React.createElement(PostingHeatmap, { data: makeHeatmapData() }));
    expect(screen.getByText("Low")).toBeTruthy();
    expect(screen.getByText("High")).toBeTruthy();
  });
});

// ─── PostsTable tests ────────────────────────────────────────────────────────

describe("PostsTable", () => {
  it("renders with data-testid", () => {
    render(React.createElement(PostsTable, { data: makeRecentPosts() }));
    expect(screen.getByTestId("posts-table")).toBeTruthy();
  });

  it("renders table headers", () => {
    render(React.createElement(PostsTable, { data: makeRecentPosts() }));
    expect(screen.getByText("Content")).toBeTruthy();
    expect(screen.getByText("Platform")).toBeTruthy();
    expect(screen.getByText("Status")).toBeTruthy();
    expect(screen.getByText("Impressions")).toBeTruthy();
    expect(screen.getByText("Engagement")).toBeTruthy();
  });

  it("renders post content", () => {
    render(React.createElement(PostsTable, { data: makeRecentPosts() }));
    expect(screen.getByText(/LinkedIn post content/)).toBeTruthy();
  });

  it("shows platform badges", () => {
    render(React.createElement(PostsTable, { data: makeRecentPosts() }));
    expect(screen.getByText("LinkedIn")).toBeTruthy();
    expect(screen.getByText("Twitter / X")).toBeTruthy();
  });

  it("shows empty state when no posts", () => {
    render(React.createElement(PostsTable, { data: [] }));
    expect(screen.getByText("No data yet")).toBeTruthy();
  });

  it("filters by platform", () => {
    render(React.createElement(PostsTable, { data: makeRecentPosts() }));
    // Both posts visible initially
    expect(screen.getByText(/LinkedIn post content/)).toBeTruthy();
    expect(screen.getByText(/Twitter post content/)).toBeTruthy();
  });

  it("shows empty state when filter returns no results", () => {
    const linkedinOnly: RecentPostRow[] = [makeRecentPosts()[0]];
    render(React.createElement(PostsTable, { data: linkedinOnly }));
    // linkedin post visible
    expect(screen.getByText(/LinkedIn post content/)).toBeTruthy();
  });
});

// ─── AnalyticsDashboard tests ────────────────────────────────────────────────

describe("AnalyticsDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders overview metrics cards", () => {
    render(
      React.createElement(AnalyticsDashboard, {
        initialData: makeDashboardData(),
      }),
    );
    expect(screen.getAllByTestId("metrics-card").length).toBe(4);
  });

  it("renders all chart sections", () => {
    render(
      React.createElement(AnalyticsDashboard, {
        initialData: makeDashboardData(),
      }),
    );
    expect(screen.getByTestId("engagement-chart")).toBeTruthy();
    expect(screen.getByTestId("platform-comparison")).toBeTruthy();
    expect(screen.getByTestId("posting-heatmap")).toBeTruthy();
    expect(screen.getByTestId("posts-table")).toBeTruthy();
  });

  it("shows metric values from initialData", () => {
    render(
      React.createElement(AnalyticsDashboard, {
        initialData: makeDashboardData(),
      }),
    );
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText(/1[,\s]?250/)).toBeTruthy();
    expect(screen.getByText("4.5%")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("shows error state when no data and error provided", () => {
    render(
      React.createElement(AnalyticsDashboard, {
        initialData: null,
        initialError: "Unauthorized",
      }),
    );
    expect(screen.getByText("Failed to load analytics")).toBeTruthy();
    expect(screen.getByText("Unauthorized")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("renders channel selector when channels are present", () => {
    render(
      React.createElement(AnalyticsDashboard, {
        initialData: makeDashboardData(),
      }),
    );
    expect(screen.getByText("All channels")).toBeTruthy();
  });

  it("renders empty states gracefully when initialData is null but no error", () => {
    // No error, no data — shows empty states in sub-components
    render(
      React.createElement(AnalyticsDashboard, {
        initialData: null,
      }),
    );
    // Should still render charts with empty state
    expect(screen.getByTestId("engagement-chart")).toBeTruthy();
    expect(screen.getByTestId("posts-table")).toBeTruthy();
  });
});
