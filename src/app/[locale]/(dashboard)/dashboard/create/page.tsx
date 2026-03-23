import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { UrlInputForm } from "@/components/create/url-input-form";
import { TourTriggerWrapper } from "@/components/onboarding/tour-trigger-wrapper";

export default async function CreateFromUrlPage() {
  const t = await getTranslations("createFromUrl");

  return (
    <TourTriggerWrapper tourId="ai-generation-intro">
      <PageHeader title={t("title")} description={t("description")} />
      <UrlInputForm />
    </TourTriggerWrapper>
  );
}
