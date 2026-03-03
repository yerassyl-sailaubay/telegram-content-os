import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { ScheduleEmptyState } from "@/components/schedule/schedule-empty-state";

export default async function SchedulePage() {
  const t = await getTranslations("nav");

  return (
    <>
      <PageHeader title={t("schedule")} />
      <ScheduleEmptyState />
    </>
  );
}
