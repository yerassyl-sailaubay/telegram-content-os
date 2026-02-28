import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { getAnalyticsDashboard } from "@/server/actions/analytics";

export default async function AnalyticsPage() {
  const t = await getTranslations("nav");

  const result = await getAnalyticsDashboard("30d");

  const initialData = result.success ? result.data : null;
  const initialError = result.success ? undefined : result.error;

  return (
    <>
      <PageHeader title={t("analytics")} />
      <AnalyticsDashboard
        initialData={initialData}
        initialError={initialError}
      />
    </>
  );
}
