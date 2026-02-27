import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { SchedulePageClient } from "./client";

export default async function SchedulePage() {
  const t = await getTranslations("schedule");

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <SchedulePageClient />
    </>
  );
}
