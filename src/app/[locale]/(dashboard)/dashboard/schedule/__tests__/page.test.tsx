import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { mockGetTranslations, mockPageHeader, mockSchedulePageClient } = vi.hoisted(() => ({
  mockGetTranslations: vi.fn(),
  mockPageHeader: vi.fn(({ title, description }: { title: string; description: string }) =>
    React.createElement("div", null, `header:${title}:${description}`),
  ),
  mockSchedulePageClient: vi.fn(() => React.createElement("div", null, "schedule-client")),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: mockGetTranslations,
}));

vi.mock("@/components/layout/page-header", () => ({
  PageHeader: mockPageHeader,
}));

vi.mock("@/app/[locale]/(dashboard)/schedule/client", () => ({
  SchedulePageClient: mockSchedulePageClient,
}));

import SchedulePage from "../page";

describe("/dashboard/schedule page", () => {
  it("renders the real schedule calendar surface", async () => {
    mockGetTranslations.mockResolvedValue((key: string) => {
      const values: Record<string, string> = {
        title: "Schedule",
        description: "Plan and schedule your content across platforms",
      };
      return values[key] ?? key;
    });

    const element = await SchedulePage();
    const html = renderToStaticMarkup(element);

    expect(mockGetTranslations).toHaveBeenCalledWith("schedule");
    expect(html).toContain("header:Schedule:Plan and schedule your content across platforms");
    expect(html).toContain("schedule-client");
  });
});
