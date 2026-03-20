import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ContentCard } from "../content-card";
import type { ContentItem } from "@/server/actions/content";

const { mockUpdateContentStatus } = vi.hoisted(() => ({
  mockUpdateContentStatus: vi.fn().mockResolvedValue({ success: true, data: { id: "item-1" } }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      statusDraft: "Draft",
      statusPublished: "Published",
      statusArchived: "Archived",
      statusScheduled: "Scheduled",
      sourceIdea: "Idea",
      sourceTelegramImport: "From Telegram",
      sourceRepurposed: "Repurposed",
      sourceExternalSource: "External Source",
      sourceAiGenerated: "AI Generated",
      actionRepurpose: "Repurpose",
      actionPublishTelegram: "Publish to Telegram",
      actionArchive: "Archive",
      actionEdit: "Edit",
      archiveSuccess: "Content archived",
      archiveError: "Failed to archive content",
      showTranscript: "Show transcript",
      hideTranscript: "Hide transcript",
      voiceTranscriptLabel: "Voice transcript",
      noTitle: "Untitled",
    };
    return messages[key] ?? key;
  },
}));

vi.mock("@/server/actions/content", () => ({
  updateContentStatus: (...args: unknown[]) => mockUpdateContentStatus(...args),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function makeItem(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: "item-1",
    userId: "user-1",
    parentId: null,
    title: "Voice Draft",
    content: "Draft content body",
    category: null,
    tags: [],
    isTemplate: false,
    sourceType: "ai_generated",
    status: "draft",
    channelId: null,
    sourceUrl: null,
    sourceMetadata: null,
    createdAt: new Date("2026-03-20T00:00:00.000Z"),
    updatedAt: new Date("2026-03-20T00:00:00.000Z"),
    ...overrides,
  } as ContentItem;
}

describe("ContentCard voice transcript", () => {
  it("shows transcript toggle and expands transcript block", () => {
    const item = makeItem({
      sourceMetadata: {
        telegramCaptureType: "bot_inbox_voice",
        voiceTranscript: "This is the original transcript from voice.",
      },
    });

    render(<ContentCard item={item} />);

    const toggle = screen.getByTestId("toggle-voice-transcript");
    expect(toggle).toBeTruthy();
    expect(screen.queryByTestId("voice-transcript-block")).toBeNull();

    fireEvent.click(toggle);

    expect(screen.getByTestId("voice-transcript-block")).toBeTruthy();
    expect(screen.getByText("Voice transcript")).toBeTruthy();
    expect(screen.getByText("This is the original transcript from voice.")).toBeTruthy();
  });

  it("does not render transcript controls when transcript is absent", () => {
    const item = makeItem({
      sourceMetadata: {
        telegramCaptureType: "bot_inbox_voice",
      },
    });

    render(<ContentCard item={item} />);

    expect(screen.queryByTestId("toggle-voice-transcript")).toBeNull();
    expect(screen.queryByTestId("voice-transcript-block")).toBeNull();
  });
});
