import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { TelegramPostComposer } from "@/components/telegram-post/telegram-post-composer";
import { getConnectedChannels } from "@/server/actions/telegram-post";
import { getContent } from "@/server/actions/content";

type TelegramPostPageProps = {
  searchParams: Promise<{ contentId?: string }>;
};

export default async function TelegramPostPage({ searchParams }: TelegramPostPageProps) {
  const [t, channelsResult, params] = await Promise.all([
    getTranslations("telegramPost"),
    getConnectedChannels(),
    searchParams,
  ]);

  const channels = channelsResult.success ? channelsResult.data : [];
  const draftResult = params.contentId ? await getContent(params.contentId) : null;
  const initialDraft =
    draftResult && draftResult.success
      ? {
          id: draftResult.data.id,
          content: draftResult.data.content,
          channelId: draftResult.data.channelId,
          sourceMetadata: draftResult.data.sourceMetadata,
        }
      : null;

  return (
    <>
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />
      <TelegramPostComposer initialChannels={channels} initialDraft={initialDraft} />
    </>
  );
}
