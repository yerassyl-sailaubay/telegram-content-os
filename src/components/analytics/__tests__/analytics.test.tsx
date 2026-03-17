import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    void namespace;

    return (key: string, params?: Record<string, unknown>) => {
      const messages: Record<string, string> = {
        subscriberGrowth: "Subscriber Growth",
        growthRate: "+{rate}% growth",
        growthRateNegative: "-{rate}% decline",
        growthStable: "Stable",
        noGrowthData: "No growth data yet",
        noGrowthDataDescription: "Connect a channel to start tracking growth.",
        subscribers: "Subscribers",
        contentPerformance: "Content Performance",
        noDataYet: "No data yet",
        noDataDescription: "Cross-post your first content to see analytics here",
        tableContent: "Content",
        tableViews: "Views",
        tableReactions: "Reactions",
        tableForwards: "Forwards",
        tableDate: "Date",
        noChannelsForTelegram: "No channels connected yet",
        telegramBestPostingTimes: "Best posting times",
        telegramHeatmapSubtitle: "Avg views by day and hour",
        avgViewsCount: "{count} avg views",
        legendLow: "Low",
        legendHigh: "High",
        retry: "Try again",
        loading: "Loading...",
        selectChannel: "Select channel",
        range_7d: "7d",
        range_30d: "30d",
        range_90d: "90d",
        telegramInsightGrowthLabel: "Growth trend",
        telegramInsightGrowthNote: "Subscriber momentum over the selected period.",
        telegramInsightSlotLabel: "Best slot",
        telegramInsightSlotNote: "Top slot averages {count} views.",
        telegramInsightSlotFallback: "No posting time data yet.",
        telegramInsightTopPostLabel: "Top post",
        telegramInsightTopPostNote: "Highest view count in the selected range.",
        telegramInsightTopPostFallback: "No post performance data yet.",
        insightEmpty: "No data",
      };

      const base = messages[key] ?? key;
      if (!params) {
        return base;
      }

      return base.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? `{${token}}`));
    };
  },
}));

vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "line-chart" }, children),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "responsive-container" }, children),
}));

vi.mock("@/server/actions/analytics-telegram", () => ({
  fetchChannelGrowthRate: vi.fn(),
  fetchBestPostingTimes: vi.fn(),
  fetchContentPerformance: vi.fn(),
}));

import { MetricsCard } from "../metrics-card";
import { GrowthChart } from "../growth-chart";
import { ContentPerformanceTable } from "../content-performance-table";
import { TelegramAnalytics } from "../telegram-analytics";
import {
  fetchBestPostingTimes,
  fetchChannelGrowthRate,
  fetchContentPerformance,
} from "@/server/actions/analytics-telegram";
import type { PostPerformance } from "@/lib/analytics/telegram-enhanced";
import type { ChannelWithPostCount } from "@/server/actions/channels";

const mockFetchGrowth = vi.mocked(fetchChannelGrowthRate);
const mockFetchBestTimes = vi.mocked(fetchBestPostingTimes);
const mockFetchPerformance = vi.mocked(fetchContentPerformance);

function makeChannel(): ChannelWithPostCount {
  return {
    id: "channel-1",
    userId: "user-1",
    telegramChatId: "-100123456",
    title: "My Channel",
    username: "mychannel",
    description: null,
    memberCount: 1200,
    botTokenEncrypted: null,
    webhookSecret: null,
    connectedAt: new Date("2026-03-10T00:00:00Z"),
    createdAt: new Date("2026-03-10T00:00:00Z"),
    updatedAt: new Date("2026-03-10T00:00:00Z"),
    postCount: 18,
    lastPostAt: new Date("2026-03-11T09:00:00Z"),
  };
}

function setupSuccessfulAnalyticsMocks() {
  mockFetchGrowth.mockResolvedValue({
    success: true,
    data: {
      rate: 5,
      trend: "up",
      dataPoints: [
        { date: "2026-03-10", subscribers: 1200 },
        { date: "2026-03-11", subscribers: 1260 },
      ],
    },
  });

  mockFetchBestTimes.mockResolvedValue({
    success: true,
    data: {
      bestHours: [10],
      bestDays: ["Monday"],
      heatmap: [{ day: "Monday", hour: 10, avgViews: 420 }],
    },
  });

  mockFetchPerformance.mockResolvedValue({
    success: true,
    data: {
      posts: [
        {
          id: "post-1",
          content: "Strong Telegram post",
          postedAt: new Date("2026-03-11T10:00:00Z"),
          views: 1500,
          forwards: 24,
          totalReactions: 95,
        },
      ],
      topPost: {
        id: "post-1",
        content: "Strong Telegram post",
        postedAt: new Date("2026-03-11T10:00:00Z"),
        views: 1500,
        forwards: 24,
        totalReactions: 95,
      },
      avgViews: 1500,
      avgReactions: 95,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupSuccessfulAnalyticsMocks();
});

describe("MetricsCard", () => {
  it("renders primary content and positive trend", () => {
    render(
      <MetricsCard
        title="Scheduled"
        value={12}
        icon={<span aria-hidden="true">icon</span>}
        trend={8}
        trendLabel="vs last week"
      />,
    );

    expect(screen.getByText("Scheduled")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("+8%")).toBeTruthy();
    expect(screen.getByText("vs last week")).toBeTruthy();
  });

  it("renders negative trend value", () => {
    render(
      <MetricsCard
        title="Growth"
        value="42%"
        trend={-3}
        icon={<span aria-hidden="true">icon</span>}
      />,
    );

    expect(screen.getByText("-3%")).toBeTruthy();
  });
});

describe("GrowthChart", () => {
  it("renders empty state when there are no points", () => {
    render(<GrowthChart dataPoints={[]} rate={0} trend="stable" />);

    expect(screen.getByText("No growth data yet")).toBeTruthy();
  });

  it("renders chart and trend badge when points exist", () => {
    render(
      <GrowthChart
        dataPoints={[
          { date: "2026-03-10", subscribers: 1200 },
          { date: "2026-03-11", subscribers: 1260 },
        ]}
        rate={5}
        trend="up"
      />,
    );

    expect(screen.getByTestId("growth-chart")).toBeTruthy();
    expect(screen.getByTestId("responsive-container")).toBeTruthy();
    expect(screen.getByTestId("line-chart")).toBeTruthy();
    expect(screen.getAllByText("+5% growth").length).toBeGreaterThan(0);
  });

  it("renders decline badge for down trend", () => {
    render(
      <GrowthChart
        dataPoints={[
          { date: "2026-03-10", subscribers: 1300 },
          { date: "2026-03-11", subscribers: 1260 },
        ]}
        rate={-3}
        trend="down"
      />,
    );

    expect(screen.getByText("-3% decline")).toBeTruthy();
  });
});

describe("ContentPerformanceTable", () => {
  it("renders empty state when there are no posts", () => {
    render(<ContentPerformanceTable posts={[]} />);

    expect(screen.getByText("No data yet")).toBeTruthy();
  });

  it("sorts rows by views and toggles order on header click", () => {
    const posts: PostPerformance[] = [
      {
        id: "post-low",
        content: "Low views post",
        postedAt: new Date("2026-03-11T08:00:00Z"),
        views: 120,
        forwards: 5,
        totalReactions: 12,
      },
      {
        id: "post-high",
        content: "High views post",
        postedAt: new Date("2026-03-11T09:00:00Z"),
        views: 1500,
        forwards: 40,
        totalReactions: 80,
      },
    ];

    render(<ContentPerformanceTable posts={posts} />);

    let rows = screen.getAllByRole("row");
    expect(within(rows[1]!).getByText("High views post")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Views" }));

    rows = screen.getAllByRole("row");
    expect(within(rows[1]!).getByText("Low views post")).toBeTruthy();
  });
});

describe("TelegramAnalytics", () => {
  it("renders no-channel state", () => {
    render(<TelegramAnalytics channels={[]} />);

    expect(screen.getByText("No channels connected yet")).toBeTruthy();
  });

  it("loads analytics on mount for the default channel", async () => {
    render(<TelegramAnalytics channels={[makeChannel()]} />);

    await waitFor(() => {
      expect(mockFetchGrowth).toHaveBeenCalledTimes(1);
      expect(mockFetchBestTimes).toHaveBeenCalledTimes(1);
      expect(mockFetchPerformance).toHaveBeenCalledTimes(1);
    });

    const [channelId, dateRange] = mockFetchGrowth.mock.calls[0]!;
    expect(channelId).toBe("channel-1");
    expect(dateRange.start).toBeInstanceOf(Date);
    expect(dateRange.end).toBeInstanceOf(Date);

    expect(screen.getAllByText("+5% growth").length).toBeGreaterThan(0);
  });

  it("shows fetch error and retries when retry button is clicked", async () => {
    mockFetchGrowth
      .mockResolvedValueOnce({ success: false, error: "Growth failed" })
      .mockResolvedValueOnce({
        success: true,
        data: {
          rate: 4,
          trend: "up",
          dataPoints: [
            { date: "2026-03-10", subscribers: 1000 },
            { date: "2026-03-11", subscribers: 1040 },
          ],
        },
      });

    render(<TelegramAnalytics channels={[makeChannel()]} />);

    await waitFor(() => {
      expect(screen.getByText("Growth failed")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(mockFetchGrowth).toHaveBeenCalledTimes(2);
    });
  });
});
