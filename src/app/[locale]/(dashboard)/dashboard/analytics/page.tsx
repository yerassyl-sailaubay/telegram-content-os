import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { TelegramAnalytics } from "@/components/analytics/telegram-analytics";
import { listChannels } from "@/server/actions/channels";
import { TourTriggerWrapper } from "@/components/onboarding/tour-trigger-wrapper";

export default async function AnalyticsPage() {
  const [tNav, tAnalytics, channelsResult] = await Promise.all([
    getTranslations("nav"),
    getTranslations("analytics"),
    listChannels(),
  ]);

  const channels = channelsResult.success ? channelsResult.data : [];

  return (
    <TourTriggerWrapper tourId="analytics-intro">
      <PageHeader title={tNav("analytics")} description={tAnalytics("pageDescription")} />

      <div className="space-y-8 pb-10">
        <section className="space-y-4">
          <div>
            <h2 className="text-foreground text-xl font-semibold tracking-tight">
              {tAnalytics("telegramAnalyticsTitle")}
            </h2>
            <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-6">
              {tAnalytics("telegramAnalyticsDescription")}
            </p>
          </div>
          <TelegramAnalytics channels={channels} />
        </section>
      </div>
    </TourTriggerWrapper>
  );
}
