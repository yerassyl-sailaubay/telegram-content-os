import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin/access";
import { getTelegramClient } from "@/lib/telegram/client";

export const runtime = "nodejs";

async function getSupabaseClient() {
  const { createClient } = await import("@/lib/supabase/server");
  return createClient();
}

function resolveExpectedWebhookUrl(): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    return null;
  }

  return `${appUrl.replace(/\/+$/, "")}/api/telegram/webhook`;
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hasBotToken = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
    const hasWebhookSecret = Boolean(process.env.TELEGRAM_WEBHOOK_SECRET?.trim());
    const expectedUrl = resolveExpectedWebhookUrl();

    if (!hasBotToken) {
      return NextResponse.json(
        {
          status: "misconfigured",
          error: "TELEGRAM_BOT_TOKEN is not configured",
          env: {
            hasBotToken,
            hasWebhookSecret,
            hasAppUrl: Boolean(expectedUrl),
          },
        },
        { status: 500 },
      );
    }

    const tgClient = getTelegramClient();
    const [me, webhookInfo] = await Promise.all([tgClient.getMe(), tgClient.getWebhookInfo()]);

    return NextResponse.json({
      status: "ok",
      bot: {
        id: me.id,
        username: me.username ?? null,
      },
      webhook: {
        currentUrl: webhookInfo.url ?? "",
        expectedUrl,
        isActive: Boolean(webhookInfo.url),
        matchesExpectedUrl: expectedUrl ? webhookInfo.url === expectedUrl : null,
        pendingUpdateCount: webhookInfo.pending_update_count,
        allowedUpdates: webhookInfo.allowed_updates ?? [],
        lastErrorDate: webhookInfo.last_error_date
          ? new Date(webhookInfo.last_error_date * 1000).toISOString()
          : null,
        lastErrorMessage: webhookInfo.last_error_message ?? null,
      },
      env: {
        hasBotToken,
        hasWebhookSecret,
        hasAppUrl: Boolean(expectedUrl),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check Telegram webhook";
    console.error("Telegram webhook health check failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
