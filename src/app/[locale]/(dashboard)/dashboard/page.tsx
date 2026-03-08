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
import {
  AlertTriangle,
  CalendarDays,
  FileText,
  Lightbulb,
  Sparkles,
  TrendingUp,
} from "lucide-react";

function formatDashboardDate(locale: string) {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/12 bg-white/[0.06] px-4 py-3">
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
                    <div className="hidden min-w-[220px] rounded-[1.75rem] border border-white/12 bg-white/[0.05] p-5 lg:block">
                      <p className="text-xs font-semibold tracking-[0.16em] text-cyan-100/62 uppercase">
                        {t("heroCalloutLabel")}
                      </p>
                      <p className="mt-3 text-4xl font-semibold text-white">{calendarGaps}</p>
                      <p className="mt-2 text-sm leading-6 text-cyan-50/72">
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

          <Card className="border-border/70 bg-card/95 overflow-hidden shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle>{t("captureCardTitle")}</CardTitle>
              <CardDescription>{t("captureCardDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <QuickCapture />
            </CardContent>
          </Card>
        </div>

        {calendarGaps > 0 && (
          <Card className="border-amber-200/70 bg-[linear-gradient(135deg,rgba(251,191,36,0.14),rgba(255,255,255,0.85))] shadow-sm dark:border-amber-800/50 dark:bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(12,10,9,0.92))]">
            <CardContent className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-amber-500/15 p-2 text-amber-600 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    {t("calendarGapsAlert", { count: calendarGaps })}
                  </p>
                  <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-300/78">
                    {t("calendarGapsDetail")}
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/schedule"
                className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-white/70 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-white dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"
              >
                <CalendarDays className="h-4 w-4" />
                {t("calendarGapsCta")}
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricsCard
            title={t("statIdeas")}
            value={ideasCount}
            icon={<Lightbulb className="h-5 w-5" />}
            description={t("statIdeasDescription")}
          />
          <MetricsCard
            title={t("statDrafts")}
            value={draftsCount}
            icon={<FileText className="h-5 w-5" />}
            description={t("statDraftsDescription")}
          />
          <MetricsCard
            title={t("statPublishedThisWeek")}
            value={publishedThisWeek}
            icon={<TrendingUp className="h-5 w-5" />}
            description={t("statPublishedDescription")}
          />
          <MetricsCard
            title={t("statAiGenerations")}
            value={`${aiUsed} / ${aiLimitDisplay}`}
            icon={<Sparkles className="h-5 w-5" />}
            description={t("statAiDescription")}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
          <UpcomingPosts posts={upcomingPosts.slice(0, 4)} />
          <ActivityFeed events={(data?.recentActivity ?? []).slice(0, 6)} />
        </div>
      </div>
    </>
  );
}
