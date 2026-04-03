import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { ChannelList } from "@/components/channels/channel-list";
import { ConnectChannelWizard } from "@/components/channels/connect-channel-wizard";
import { listChannels } from "@/server/actions/channels";
import { resolveTelegramBotUsername } from "@/lib/telegram/bot-identity";
import { elapsedMs, logHotRoutePerf } from "@/lib/perf/hot-routes";

export default async function ChannelsPage() {
  const startedAt = performance.now();
  const [t, botUsername, channelsResult] = await Promise.all([
    getTranslations("channels"),
    resolveTelegramBotUsername(),
    listChannels(),
  ]);

  if (!channelsResult.success) {
    logHotRoutePerf("route:/dashboard/channels", {
      totalMs: elapsedMs(startedAt),
      success: false,
      error: channelsResult.error,
    });

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

  logHotRoutePerf("route:/dashboard/channels", {
    totalMs: elapsedMs(startedAt),
    success: true,
    channels: channelsResult.data.length,
  });

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
