import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { ContentLibraryClient } from "@/components/content/content-library-client";
import { listContent } from "@/server/actions/content";
import { listChannels } from "@/server/actions/channels";
import { TourTriggerWrapper } from "@/components/onboarding/tour-trigger-wrapper";

export default async function PostsPage() {
  const [t, contentResult, channelsResult] = await Promise.all([
    getTranslations("content"),
    listContent({ perPage: 50 }),
    listChannels(),
  ]);

  const initialItems = contentResult.success ? contentResult.data.items : [];
  const channels = channelsResult.success
    ? channelsResult.data.map((ch) => ({
        id: ch.id,
        name: ch.title ?? ch.username ?? ch.id,
      }))
    : [];

  return (
    <TourTriggerWrapper tourId="content-library-intro">
      <PageHeader title={t("title")} description={t("description")} />
      <ContentLibraryClient initialItems={initialItems} channels={channels} />
    </TourTriggerWrapper>
  );
}
