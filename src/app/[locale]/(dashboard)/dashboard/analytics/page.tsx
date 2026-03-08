import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { RadioTower, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { TelegramAnalytics } from "@/components/analytics/telegram-analytics";
import { Card, CardContent } from "@/components/ui/card";
import { listChannels } from "@/server/actions/channels";

function HeroStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/12 bg-white/[0.06] p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-white/10 text-cyan-100">
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-cyan-50/58 uppercase">
            {label}
          </p>
          <p className="mt-1 text-xl font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const [tNav, tAnalytics, channelsResult] = await Promise.all([
    getTranslations("nav"),
    getTranslations("analytics"),
    listChannels(),
  ]);

  const channels = channelsResult.success ? channelsResult.data : [];

  return (
    <>
      <PageHeader title={tNav("analytics")} description={tAnalytics("pageDescription")} />

      <div className="space-y-8 pb-10">
        <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.24),transparent_30%),linear-gradient(135deg,#0f172a,#0f2940_48%,#0f172a)] text-white shadow-[0_28px_80px_rgba(15,23,42,0.42)]">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-8">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold tracking-[0.18em] text-cyan-100/72 uppercase">
                  {tAnalytics("heroEyebrow")}
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {tAnalytics("heroTitle")}
                </h2>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <HeroStat
                  icon={<RadioTower className="h-5 w-5" />}
                  label={tAnalytics("heroCards.channelsLabel")}
                  value={channels.length.toString()}
                />
                <HeroStat
                  icon={<BarChart3 className="h-5 w-5" />}
                  label={tAnalytics("heroCards.volumeLabel")}
                  value={tAnalytics("heroCards.volumeNote")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
    </>
  );
}
