import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { TelegramPostComposer } from "@/components/telegram-post/telegram-post-composer";
import { getConnectedChannels } from "@/server/actions/telegram-post";

export default async function TelegramPostPage() {
  const t = await getTranslations("telegramPost");

  // Fetch connected channels
  const channelsResult = await getConnectedChannels();
  const channels = channelsResult.success ? channelsResult.data : [];

  return (
    <>
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />
      <TelegramPostComposer initialChannels={channels} />
    </>
  );
}
