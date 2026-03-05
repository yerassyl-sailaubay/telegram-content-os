import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { CrossPostWizard } from "@/components/crosspost/crosspost-wizard";
import { getCrossPostUsage } from "@/server/actions/crosspost";

export default async function CrossPostPage() {
  const t = await getTranslations("crosspost");

  // Pre-fetch quota for display
  const usageResult = await getCrossPostUsage();
  const usage = usageResult.success ? usageResult.data : null;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <CrossPostWizard initialUsage={usage} />
    </>
  );
}
