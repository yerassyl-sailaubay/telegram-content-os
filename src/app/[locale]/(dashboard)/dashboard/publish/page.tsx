import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { TelegramPublishForm } from "@/components/publish/telegram-publish-form";
import { getContent } from "@/server/actions/content";
import { listChannels } from "@/server/actions/channels";

export default async function PublishPage({
  searchParams,
}: {
  searchParams: Promise<{ contentId?: string }>;
}) {
  const [t, params] = await Promise.all([getTranslations("publish"), searchParams]);

  const [contentResult, channelsResult] = await Promise.all([
    params.contentId ? getContent(params.contentId) : Promise.resolve(null),
    listChannels(),
  ]);

  const content = contentResult && contentResult.success ? contentResult.data : null;
  const channels = channelsResult.success
    ? channelsResult.data.map((channel) => ({
        id: channel.id,
        title: channel.title,
        username: channel.username,
      }))
    : [];

  return (
    <>
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />
      <TelegramPublishForm content={content} channels={channels} />
    </>
  );
}
