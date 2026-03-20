import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TelegramPostComposer } from "../telegram-post-composer";

const { mockSaveTelegramDraft, mockScheduleTelegramPost } = vi.hoisted(() => ({
  mockSaveTelegramDraft: vi.fn(),
  mockScheduleTelegramPost: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => {
    const messages: Record<string, Record<string, string>> = {
      telegramPost: {
        noChannels: "No channels connected",
        connectChannelFirst: "Connect channel first",
        title: "New Telegram Post",
        description: "Compose",
        selectChannel: "Select Channel",
        selectChannelPlaceholder: "Choose channel",
        untitledChannel: "Untitled Channel",
        image: "Image",
        addImage: "Add image",
        uploading: "Uploading",
        content: "Content",
        contentPlaceholder: "Write post",
        formatting: "Formatting",
        plainText: "Plain Text",
        postToTelegram: "Post to Telegram",
        posting: "Posting",
        postSuccess: "Post published",
        preview: "Preview",
        previewDescription: "Preview description",
        previewChannelName: "Channel Name",
        previewSubscribers: "1 subscribers",
        previewPlaceholder: "Preview placeholder",
        subscribers: "subscribers",
        cancel: "Cancel",
        saveDraft: "Save Draft",
        savingDraft: "Saving Draft...",
        draftSaved: "Draft saved",
        scheduleMode: "Schedule",
        scheduleDate: "Schedule Date",
        scheduleTime: "Schedule Time",
        schedulePost: "Schedule Post",
        schedulingPost: "Scheduling...",
        scheduleSuccess: "Post scheduled",
      },
      aiWriter: {
        generateWithAI: "Generate with AI",
        generatedSuccess: "Generated",
        analyzing: "Analyzing",
        analyzeChannel: "Analyze",
        dialogTitle: "Dialog",
        dialogDescription: "Dialog desc",
        channelProfile: "Profile",
        noProfileYet: "No profile",
        analyzeFirst: "Analyze first",
        topicLabel: "Topic",
        topicPlaceholder: "Topic...",
        toneLabel: "Tone",
        optional: "Optional",
        tonePlaceholder: "Tone...",
        generate: "Generate",
        generating: "Generating",
      },
      common: {
        error: "Something went wrong",
      },
    };
    return messages[ns]?.[key] ?? key;
  },
}));

vi.mock("@/server/actions/telegram-post", () => ({
  postToTelegram: vi.fn(),
  uploadImageForPost: vi.fn(),
  saveTelegramDraft: mockSaveTelegramDraft,
  scheduleTelegramPost: mockScheduleTelegramPost,
}));

vi.mock("@/server/actions/ai-writer", () => ({
  generatePostWithAI: vi.fn(),
  analyzeChannelVoice: vi.fn(),
  getChannelProfile: vi.fn().mockResolvedValue({ success: true, data: null }),
}));

describe("TelegramPostComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveTelegramDraft.mockResolvedValue({
      success: true,
      data: { id: "content-1", status: "draft" },
    });
    mockScheduleTelegramPost.mockResolvedValue({
      success: true,
      data: { id: "content-1", status: "scheduled" },
    });
  });

  it("renders save draft and schedule actions", () => {
    render(
      <TelegramPostComposer
        initialChannels={[
          { id: "ch-1", title: "Main Channel", username: "main", memberCount: 100 },
        ]}
        initialDraft={{
          id: "content-1",
          content: "Hello world",
          channelId: "ch-1",
          sourceMetadata: null,
        }}
      />,
    );

    expect(screen.getByTestId("save-draft-button")).toBeTruthy();
    expect(screen.getByTestId("schedule-mode-button")).toBeTruthy();
  });

  it("calls saveTelegramDraft with current composer content", async () => {
    render(
      <TelegramPostComposer
        initialChannels={[
          { id: "ch-1", title: "Main Channel", username: "main", memberCount: 100 },
        ]}
        initialDraft={{
          id: "content-1",
          content: "Hello world",
          channelId: "ch-1",
          sourceMetadata: null,
        }}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Write post"), {
      target: { value: "Updated draft content" },
    });

    fireEvent.click(screen.getByTestId("save-draft-button"));

    await waitFor(() => {
      expect(mockSaveTelegramDraft).toHaveBeenCalledWith({
        contentId: "content-1",
        channelId: "ch-1",
        content: "Updated draft content",
        parseMode: "MarkdownV2",
        imageUrl: undefined,
      });
    });
  });

  it("calls scheduleTelegramPost when date and time are set", async () => {
    render(
      <TelegramPostComposer
        initialChannels={[
          { id: "ch-1", title: "Main Channel", username: "main", memberCount: 100 },
        ]}
        initialDraft={{
          id: "content-1",
          content: "Hello world",
          channelId: "ch-1",
          sourceMetadata: null,
        }}
      />,
    );

    fireEvent.click(screen.getByTestId("schedule-mode-button"));
    fireEvent.change(screen.getByTestId("schedule-date-input"), {
      target: { value: "2030-06-20" },
    });
    fireEvent.change(screen.getByTestId("schedule-time-input"), {
      target: { value: "12:30" },
    });
    fireEvent.click(screen.getByTestId("schedule-submit-button"));

    await waitFor(() => {
      expect(mockScheduleTelegramPost).toHaveBeenCalledTimes(1);
    });
  });
});
