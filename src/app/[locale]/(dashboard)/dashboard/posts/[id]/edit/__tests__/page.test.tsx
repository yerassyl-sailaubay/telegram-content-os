import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const {
  mockGetTranslations,
  mockGetConnectedChannels,
  mockGetContent,
  mockNotFound,
  mockPageHeader,
  mockComposer,
} = vi.hoisted(() => ({
  mockGetTranslations: vi.fn(),
  mockGetConnectedChannels: vi.fn(),
  mockGetContent: vi.fn(),
  mockNotFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  mockPageHeader: vi.fn(({ title, description }: { title: string; description: string }) =>
    React.createElement("div", null, `${title}::${description}`),
  ),
  mockComposer: vi.fn(
    ({
      initialDraft,
      initialChannels,
    }: {
      initialDraft: { id: string; channelId: string | null };
      initialChannels: Array<{ id: string }>;
    }) =>
      React.createElement(
        "div",
        null,
        `composer:${initialDraft.id}:${initialDraft.channelId ?? "none"}:${initialChannels.length}`,
      ),
  ),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: mockGetTranslations,
}));

vi.mock("@/server/actions/telegram-post", () => ({
  getConnectedChannels: mockGetConnectedChannels,
}));

vi.mock("@/server/actions/content", () => ({
  getContent: mockGetContent,
}));

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

vi.mock("@/components/layout/page-header", () => ({
  PageHeader: mockPageHeader,
}));

vi.mock("@/components/telegram-post/telegram-post-composer", () => ({
  TelegramPostComposer: mockComposer,
}));

import EditPostPage from "../page";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTranslations.mockResolvedValue((key: string) => {
    const values: Record<string, string> = {
      editPageTitle: "Edit Telegram Post",
      editPageDescription: "Update your saved draft or scheduled post",
    };
    return values[key] ?? key;
  });
  mockGetConnectedChannels.mockResolvedValue({
    success: true,
    data: [{ id: "ch-1", title: "Main", username: "main", memberCount: 100 }],
  });
});

describe("EditPostPage", () => {
  it("renders edit page with prefilled draft data", async () => {
    mockGetContent.mockResolvedValue({
      success: true,
      data: {
        id: "content-1",
        content: "Draft content",
        channelId: "ch-1",
        sourceMetadata: { telegramComposer: { parseMode: "HTML" } },
        status: "draft",
      },
    });

    const element = await EditPostPage({
      params: Promise.resolve({ locale: "ru", id: "content-1" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Edit Telegram Post");
    expect(html).toContain("composer:content-1:ch-1:1");
  });

  it("throws notFound when content is missing", async () => {
    mockGetContent.mockResolvedValue({
      success: false,
      error: "Content not found",
    });

    await expect(
      EditPostPage({ params: Promise.resolve({ locale: "ru", id: "missing" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });

  it("throws notFound when content status is not editable", async () => {
    mockGetContent.mockResolvedValue({
      success: true,
      data: {
        id: "content-1",
        content: "Published content",
        channelId: "ch-1",
        sourceMetadata: null,
        status: "published",
      },
    });

    await expect(
      EditPostPage({ params: Promise.resolve({ locale: "ru", id: "content-1" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
