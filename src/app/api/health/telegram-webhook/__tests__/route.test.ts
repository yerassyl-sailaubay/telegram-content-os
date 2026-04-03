import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockGetMe, mockGetWebhookInfo, mockIsAdminEmail } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetMe: vi.fn(),
  mockGetWebhookInfo: vi.fn(),
  mockIsAdminEmail: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

vi.mock("@/lib/admin/access", () => ({
  isAdminEmail: mockIsAdminEmail,
}));

vi.mock("@/lib/telegram/client", () => ({
  getTelegramClient: vi.fn().mockReturnValue({
    getMe: mockGetMe,
    getWebhookInfo: mockGetWebhookInfo,
  }),
}));

import { GET } from "../route";

describe("GET /api/health/telegram-webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://teleflow.test");
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "bot-token");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "webhook-secret");
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const response = await GET();
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when user is not admin", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { email: "user@example.com" } } });
    mockIsAdminEmail.mockReturnValueOnce(false);

    const response = await GET();
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("returns webhook health payload for admin users", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { email: "admin@example.com" } } });
    mockIsAdminEmail.mockReturnValueOnce(true);
    mockGetMe.mockResolvedValueOnce({ id: 42, username: "tg_content_os_bot" });
    mockGetWebhookInfo.mockResolvedValueOnce({
      url: "https://teleflow.test/api/telegram/webhook",
      has_custom_certificate: false,
      pending_update_count: 0,
      allowed_updates: ["message", "channel_post", "edited_channel_post"],
      last_error_date: undefined,
      last_error_message: undefined,
    });

    const response = await GET();
    const body = (await response.json()) as {
      status: string;
      webhook: { isActive: boolean; matchesExpectedUrl: boolean | null };
      env: { hasBotToken: boolean; hasWebhookSecret: boolean; hasAppUrl: boolean };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.webhook.isActive).toBe(true);
    expect(body.webhook.matchesExpectedUrl).toBe(true);
    expect(body.env.hasBotToken).toBe(true);
    expect(body.env.hasWebhookSecret).toBe(true);
    expect(body.env.hasAppUrl).toBe(true);
  });

  it("returns 500 when TELEGRAM_BOT_TOKEN is missing", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    mockGetUser.mockResolvedValueOnce({ data: { user: { email: "admin@example.com" } } });
    mockIsAdminEmail.mockReturnValueOnce(true);

    const response = await GET();
    const body = (await response.json()) as {
      status: string;
      error: string;
    };

    expect(response.status).toBe(500);
    expect(body.status).toBe("misconfigured");
    expect(body.error).toContain("TELEGRAM_BOT_TOKEN");
    expect(mockGetMe).not.toHaveBeenCalled();
    expect(mockGetWebhookInfo).not.toHaveBeenCalled();
  });
});
