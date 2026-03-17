import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";

const { mockRefresh, mockUpdateAdminBillingRecord } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  mockUpdateAdminBillingRecord: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement("div", props, children),
  TabsList: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement("div", props, children),
  TabsTrigger: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement("button", { type: "button", ...props }, children),
  TabsContent: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement("div", props, children),
}));

vi.mock("@/server/actions/admin", () => ({
  updateAdminBillingRecord: (...args: unknown[]) => mockUpdateAdminBillingRecord(...args),
}));

import { AdminConsole } from "../admin-console";
import type { AdminConsoleData } from "@/server/actions/admin";

function makeData(): AdminConsoleData {
  return {
    access: {
      mode: "restricted",
      configuredAdmins: ["admin@example.com"],
      currentUserEmail: "admin@example.com",
    },
    generatedAt: "2026-03-05T12:00:00.000Z",
    currentUsageMonth: "2026-03",
    overview: {
      totalUsers: 10,
      paidUsers: 3,
      pastDueUsers: 1,
      crossPostsLast24h: 8,
      failedCrossPostsLast24h: 1,
      pendingSchedules: 4,
      failedSchedulesLast24h: 1,
      totalCrossPostsThisMonth: 77,
      totalAiCallsThisMonth: 155,
    },
    envChecks: [
      { key: "DATABASE_URL", configured: true },
      { key: "STRIPE_SECRET_KEY", configured: true },
    ],
    billingUsers: [
      {
        userId: "user-1",
        email: "creator@example.com",
        name: "Creator",
        plan: "plus",
        status: "active",
        cancelAtPeriodEnd: false,
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        currentPeriodEnd: "2026-03-31T00:00:00.000Z",
        usageMonth: "2026-03",
        crossPostsUsed: 12,
        aiCallsUsed: 20,
        subscriptionUpdatedAt: "2026-03-01T00:00:00.000Z",
      },
    ],
    crossPostEvents: [],
    scheduleFailures: [],
    sourceFailures: [],
    analyticsSyncEvents: [],
    aiInsights: {
      totalCostUsdThisMonth: 1.25,
      totalCostUsdLast24h: 0.12,
      totalTokensThisMonth: 2200,
      totalAiEventsThisMonth: 14,
      promptCacheActiveEntries: 5,
      promptCacheTotalHits: 3,
      promptCacheHitRatePercent: 17.6,
      topCostFeatures: [
        {
          feature: "calendar_fill",
          calls: 4,
          totalTokens: 1000,
          totalCostUsd: 0.5,
          avgCostUsd: 0.125,
        },
      ],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateAdminBillingRecord.mockResolvedValue({
    success: true,
    data: { userId: "user-1" },
  });
});

describe("AdminConsole", () => {
  it("renders admin console with tabs and billing row", async () => {
    render(React.createElement(AdminConsole, { initialData: makeData() }));

    expect(screen.getByTestId("admin-console")).toBeTruthy();
    expect(screen.getByTestId("admin-tabs")).toBeTruthy();
    expect(await screen.findByTestId("admin-billing-row-user-1")).toBeTruthy();
  });

  it("calls billing update action when save is clicked", async () => {
    render(React.createElement(AdminConsole, { initialData: makeData() }));

    fireEvent.change(await screen.findByTestId("admin-plan-user-1"), {
      target: { value: "pro" },
    });
    fireEvent.change(screen.getByTestId("admin-crossposts-user-1"), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByTestId("admin-aicalls-user-1"), {
      target: { value: "60" },
    });
    fireEvent.click(screen.getByTestId("admin-save-user-1"));

    await waitFor(() => {
      expect(mockUpdateAdminBillingRecord).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdateAdminBillingRecord).toHaveBeenCalledWith({
      userId: "user-1",
      plan: "pro",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2026-03-31",
      usageMonth: "2026-03",
      crossPostsUsed: 25,
      aiCallsUsed: 60,
    });
    expect(mockRefresh).toHaveBeenCalled();
  });
});
