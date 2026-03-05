import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { TelegramAnalytics } from "@/components/analytics/telegram-analytics";
import { getAnalyticsDashboard } from "@/server/actions/analytics";
import { listChannels } from "@/server/actions/channels";

export default async function AnalyticsPage() {
  const [tNav, tAnalytics, analyticsResult, channelsResult] = await Promise.all([
    getTranslations("nav"),
    getTranslations("analytics"),
    getAnalyticsDashboard("30d"),
    listChannels(),
  ]);

  const initialData = analyticsResult.success ? analyticsResult.data : null;
  const initialError = analyticsResult.success ? undefined : analyticsResult.error;
  const channels = channelsResult.success ? channelsResult.data : [];

  return (
    <>
      <PageHeader title={tNav("analytics")} />

      <div className="space-y-6">
        <div className="border-b pb-2">
          <h2 className="text-xl font-semibold tracking-tight">
            {tAnalytics("telegramAnalyticsTitle")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {tAnalytics("telegramAnalyticsDescription")}
          </p>
        </div>
        <TelegramAnalytics channels={channels} />
      </div>

      <div className="mt-10">
        <AnalyticsDashboard initialData={initialData} initialError={initialError} />
      </div>
    </>
  );
}
