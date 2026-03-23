import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { SchedulePageClient } from "@/app/[locale]/(dashboard)/schedule/client";
import { TourTriggerWrapper } from "@/components/onboarding/tour-trigger-wrapper";

export default async function SchedulePage() {
  const t = await getTranslations("schedule");

  return (
    <TourTriggerWrapper tourId="schedule-intro">
      <PageHeader title={t("title")} description={t("description")} />
      <SchedulePageClient />
    </TourTriggerWrapper>
  );
}
