import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getDashboardHomeData } from "@/server/actions/dashboard";
import { getDraftsAndIdeas, getContentByStatus } from "@/server/actions/content";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { UpcomingPosts } from "@/components/dashboard/upcoming-posts";
import { QuickCapture } from "@/components/content/quick-capture";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { MetricsCard } from "@/components/analytics/metrics-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CalendarDays, Sparkles } from "lucide-react";
import { EngagementChart } from "@/components/dashboard/engagement-chart";

function formatDashboardDate(locale: string) {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-3xl border border-white/12 bg-white/[0.06] px-4 py-3">
      <p className="text-xs font-semibold tracking-[0.16em] text-white/55 uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const locale = await getLocale();
  const [t, dashboardResult, draftsIdeasResult, publishedResult] = await Promise.all([
    getTranslations("dashboard"),
    getDashboardHomeData(),
    getDraftsAndIdeas(),
    getContentByStatus("published", { limit: 100 }),
  ]);

  const data = dashboardResult.success ? dashboardResult.data : null;
  const draftsIdeas = draftsIdeasResult.success ? draftsIdeasResult.data : null;
  const publishedItems = publishedResult.success ? publishedResult.data : [];

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const publishedThisWeek = publishedItems.filter(
    (item) => item.createdAt && new Date(item.createdAt) >= sevenDaysAgo,
  ).length;

  const upcomingPosts = data?.upcomingPosts ?? [];
  const scheduledDays = new Set(
    upcomingPosts.map((p) => new Date(p.scheduledAt).toISOString().split("T")[0]),
  );
  const calendarGaps = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d.toISOString().split("T")[0]!;
  }).filter((day) => !scheduledDays.has(day)).length;

  const ideasCount = draftsIdeas?.ideas.length ?? 0;
  const draftsCount = draftsIdeas?.drafts.length ?? 0;
  const aiUsed = data?.quickStats.crossPostsUsed ?? 0;
  const aiLimit = data?.quickStats.crossPostsLimit ?? 0;
  const aiLimitDisplay = aiLimit === -1 ? "∞" : String(aiLimit);
  const displayName = data?.userName ?? data?.userEmail ?? t("welcomeFallbackName");
  const today = formatDashboardDate(locale);

  return (
    <>
      <PageHeader title={t("title")} description={t("pageDescription")} />

      <div className="space-y-8 pb-10">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <Card className="overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_32%),linear-gradient(135deg,#0f172a,#10243a_48%,#0f172a)] text-white shadow-[0_28px_80px_rgba(15,23,42,0.45)]">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-xs font-semibold tracking-[0.18em] text-cyan-100/72 uppercase">
                      {today}
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                      {t("welcomeBack", { name: displayName })}
                    </h2>
                  </div>

                  {calendarGaps > 0 && (
                    <div
                      className={
                        "hidden min-w-[220px] rounded-[1.75rem] border p-5 transition-all duration-500 lg:block " +
                        (calendarGaps >= 5
                          ? "border-red-500/40 bg-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.2)]"
                          : calendarGaps >= 3
                            ? "border-amber-500/40 bg-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.15)]"
                            : "border-white/12 bg-white/[0.05]")
                      }
                    >
                      <div className="flex items-center gap-2">
                        {calendarGaps >= 3 && (
                          <AlertTriangle
                            className={
                              "h-4 w-4 " + (calendarGaps >= 5 ? "text-red-400" : "text-amber-400")
                            }
                          />
                        )}
                        <p
                          className={
                            "text-xs font-semibold tracking-[0.16em] uppercase transition-colors " +
                            (calendarGaps >= 5
                              ? "text-red-300/80"
                              : calendarGaps >= 3
                                ? "text-amber-300/80"
                                : "text-cyan-100/62")
                          }
                        >
                          {t("heroCalloutLabel")}
                        </p>
                      </div>
                      <p className="mt-3 text-4xl font-semibold text-white">{calendarGaps}</p>
                      <p
                        className={
                          "mt-2 text-sm leading-6 transition-colors " +
                          (calendarGaps >= 5
                            ? "text-red-200/90"
                            : calendarGaps >= 3
                              ? "text-amber-200/90"
                              : "text-cyan-50/72")
                        }
                      >
                        {t("heroCalloutDescription")}
                      </p>
                    </div>
                  )}
                </div>

                <QuickActions />

                <div className="grid gap-3 sm:grid-cols-4">
                  <HeroStat label={t("statIdeas")} value={ideasCount.toString()} />
                  <HeroStat label={t("statDrafts")} value={draftsCount.toString()} />
                  <HeroStat
                    label={t("upcomingPostsTitle")}
                    value={upcomingPosts.length.toString()}
                  />
                  <HeroStat
                    label={t("statPublishedThisWeek")}
                    value={publishedThisWeek.toString()}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/95 flex flex-col overflow-hidden shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle>{t("captureCardTitle")}</CardTitle>
              <CardDescription>{t("captureCardDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between">
              <QuickCapture />
              <div className="border-border/50 mt-8 border-t pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                    <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
                      {t("statAiGenerations")}
                    </p>
                  </div>
                  <p className="text-foreground text-xs font-bold">
                    {aiUsed} / {aiLimitDisplay}
                  </p>
                </div>
                <div className="bg-muted mt-3 h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all"
                    style={{
                      width: `${aiLimit > 0 ? Math.min((aiUsed / aiLimit) * 100, 100) : 100}%`,
                    }}
                  />
                </div>
                <p className="text-muted-foreground mt-3 text-[11px]">{t("statAiDescription")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
          <UpcomingPosts posts={upcomingPosts.slice(0, 4)} />
          <ActivityFeed events={(data?.recentActivity ?? []).slice(0, 6)} />
        </div>

        <div className="mt-4">
          <EngagementChart
            data={data?.engagementSparkline ?? []}
            locale={locale}
            total={data?.quickStats.weeklyEngagement ?? 0}
          />
        </div>
      </div>
    </>
  );
}
