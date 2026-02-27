import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { ChannelList } from "@/components/channels/channel-list";
import { ConnectChannelWizard } from "@/components/channels/connect-channel-wizard";
import { listChannels } from "@/server/actions/channels";
import { getTelegramClient } from "@/lib/telegram/client";

export default async function ChannelsPage() {
  const t = await getTranslations("channels");

  // Fetch bot username for the connect wizard
  let botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "bot";
  try {
    if (!process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME) {
      const tgClient = getTelegramClient();
      const me = await tgClient.getMe();
      botUsername = me.username ?? "bot";
    }
  } catch {
    // Use fallback value
  }

  const channelsResult = await listChannels();

  if (!channelsResult.success) {
    return (
      <>
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={<ConnectChannelWizard botUsername={botUsername} />}
        />
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-destructive">{channelsResult.error}</p>
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
