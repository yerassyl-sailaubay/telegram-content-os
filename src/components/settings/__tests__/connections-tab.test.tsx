import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { mockRefresh, mockCreateTelegramBotLink, mockDisconnectPlatform, mockClipboardWriteText } =
  vi.hoisted(() => ({
    mockRefresh: vi.fn(),
    mockCreateTelegramBotLink: vi.fn(),
    mockDisconnectPlatform: vi.fn(),
    mockClipboardWriteText: vi.fn(),
  }));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    if (key === "connections.telegramBot.linkedDescription" && values?.telegramUserId) {
      return `Linked to Telegram user ${values.telegramUserId}`;
    }

    return key;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/server/actions/telegram-bot", () => ({
  createTelegramBotLink: (...args: unknown[]) => mockCreateTelegramBotLink(...args),
}));

vi.mock("@/server/actions/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/actions/settings")>();
  return {
    ...actual,
    disconnectPlatform: (...args: unknown[]) => mockDisconnectPlatform(...args),
  };
});

import { ConnectionsTab } from "../connections-tab";
import type { ConnectionStatus, TelegramBotStatus } from "@/server/actions/settings";

const initialConnections: ConnectionStatus[] = [
  {
    platform: "linkedin",
    connected: false,
    username: null,
    expiresAt: null,
    isExpiringSoon: false,
  },
  {
    platform: "twitter",
    connected: false,
    username: null,
    expiresAt: null,
    isExpiringSoon: false,
  },
];

function renderTab(initialTelegramBot: TelegramBotStatus) {
  return render(
    React.createElement(ConnectionsTab, {
      initialConnections,
      initialTelegramBot,
    }),
  );
}

describe("ConnectionsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockClipboardWriteText },
      configurable: true,
    });
    mockClipboardWriteText.mockResolvedValue(undefined);
    mockCreateTelegramBotLink.mockResolvedValue({
      success: true,
      data: {
        botUsername: "teleflow_bot",
        token: "token-123",
        deepLinkUrl: "https://t.me/teleflow_bot?start=token-123",
        expiresAt: "2026-03-09T12:15:00.000Z",
      },
    });
    mockDisconnectPlatform.mockResolvedValue({ success: true, data: undefined });
  });

  it("refreshes the page after a bot link is generated", async () => {
    renderTab({
      linked: false,
      telegramUserId: null,
      linkedAt: null,
    });

    fireEvent.click(screen.getByTestId("connect-telegram-bot-button"));

    await screen.findByTestId("refresh-telegram-bot-status-button");
    fireEvent.click(screen.getByTestId("refresh-telegram-bot-status-button"));

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("syncs displayed Telegram bot status when server props refresh", async () => {
    const { rerender } = renderTab({
      linked: false,
      telegramUserId: null,
      linkedAt: null,
    });

    expect(screen.getByText("connections.telegramBot.description")).toBeTruthy();

    rerender(
      React.createElement(ConnectionsTab, {
        initialConnections,
        initialTelegramBot: {
          linked: true,
          telegramUserId: "777",
          linkedAt: "2026-03-09T12:00:00.000Z",
        },
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("Linked to Telegram user 777")).toBeTruthy();
    });
  });

  it("copies the /start command after generating a bot link", async () => {
    renderTab({
      linked: false,
      telegramUserId: null,
      linkedAt: null,
    });

    fireEvent.click(screen.getByTestId("connect-telegram-bot-button"));

    await screen.findByTestId("copy-telegram-bot-start-command-button");
    fireEvent.click(screen.getByTestId("copy-telegram-bot-start-command-button"));

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledWith("/start token-123");
    });
  });
});
