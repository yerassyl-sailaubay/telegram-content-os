import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { TelegramPostComposer } from "@/components/telegram-post/telegram-post-composer";
import { getConnectedChannels } from "@/server/actions/telegram-post";
import { getContent } from "@/server/actions/content";

type EditPostPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function EditPostPage({ params }: EditPostPageProps) {
  const [t, channelsResult, contentResult] = await Promise.all([
    getTranslations("telegramPost"),
    getConnectedChannels(),
    params.then(({ id: contentId }) => getContent(contentId)),
  ]);

  if (!contentResult.success) {
    notFound();
  }

  const editableStatuses = new Set(["draft", "scheduled"]);
  if (!editableStatuses.has(contentResult.data.status ?? "")) {
    notFound();
  }

  const channels = channelsResult.success ? channelsResult.data : [];
  const initialDraft = {
    id: contentResult.data.id,
    content: contentResult.data.content,
    channelId: contentResult.data.channelId,
    sourceMetadata: contentResult.data.sourceMetadata,
  };

  return (
    <>
      <PageHeader title={t("editPageTitle")} description={t("editPageDescription")} />
      <TelegramPostComposer initialChannels={channels} initialDraft={initialDraft} />
    </>
  );
}
