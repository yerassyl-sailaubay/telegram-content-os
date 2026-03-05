import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { MediaEmptyState } from "@/components/media/media-empty-state";

export default async function MediaPage() {
  const t = await getTranslations("nav");

  return (
    <>
      <PageHeader title={t("media")} />
      <MediaEmptyState />
    </>
  );
}
