import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { ChannelList } from "@/components/channels/channel-list";
import { ConnectChannelWizard } from "@/components/channels/connect-channel-wizard";
import { listChannels } from "@/server/actions/channels";
import { getTelegramClient } from "@/lib/telegram/client";

const BOT_USERNAME_LOOKUP_TIMEOUT_MS = 8000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function resolveBotUsername(): Promise<string> {
  if (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME) {
    return process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  }

  try {
    const tgClient = getTelegramClient();
    const me = await withTimeout(tgClient.getMe(), BOT_USERNAME_LOOKUP_TIMEOUT_MS);
    return me.username ?? "bot";
  } catch {
    return "bot";
  }
}

export default async function ChannelsPage() {
  const [t, botUsername, channelsResult] = await Promise.all([
    getTranslations("channels"),
    resolveBotUsername(),
    listChannels(),
  ]);

  if (!channelsResult.success) {
    return (
      <>
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={<ConnectChannelWizard botUsername={botUsername} />}
        />
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
          <p className="text-destructive text-sm">{channelsResult.error}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<ConnectChannelWizard botUsername={botUsername} />}
      />
      <ChannelList channels={channelsResult.data} />
    </>
  );
}
