import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getDashboardHomeData } from "@/server/actions/dashboard";
import { getDraftsAndIdeas, getContentByStatus } from "@/server/actions/content";
import { WelcomeSection } from "@/components/dashboard/welcome-section";
import { QuickStatsSection } from "@/components/dashboard/quick-stats";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { UpcomingPosts } from "@/components/dashboard/upcoming-posts";
import { QuickCapture } from "@/components/content/quick-capture";
import { MetricsCard } from "@/components/analytics/metrics-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  FileText,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
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

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="space-y-6 pb-8">
        <WelcomeSection userName={data?.userName ?? null} userEmail={data?.userEmail ?? null} />

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold">{t("captureTitle")}</span>
            </div>
            <QuickCapture />
          </CardContent>
        </Card>

        <div>
          <h2 className="text-foreground mb-3 text-sm font-semibold tracking-wide uppercase opacity-60">
            {t("contentStatsTitle")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricsCard
              title={t("statIdeas")}
              value={ideasCount}
              icon={<Lightbulb className="h-5 w-5" />}
            />
            <MetricsCard
              title={t("statDrafts")}
              value={draftsCount}
              icon={<FileText className="h-5 w-5" />}
            />
            <MetricsCard
              title={t("statPublishedThisWeek")}
              value={publishedThisWeek}
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <MetricsCard
              title={t("statAiGenerations")}
              value={`${aiUsed} / ${aiLimitDisplay}`}
              icon={<Sparkles className="h-5 w-5" />}
            />
          </div>
        </div>

        {calendarGaps > 0 && (
          <div
            className={cn(
              "flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3",
              "dark:border-amber-800/50 dark:bg-amber-950/30",
            )}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {t("calendarGapsAlert", { count: calendarGaps })}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              asChild
              className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/40"
            >
              <Link href="/dashboard/schedule">
                <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                {t("calendarGapsCta")}
              </Link>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <UpcomingPosts posts={upcomingPosts.slice(0, 3)} />
          </div>

          <div className="lg:col-span-2">
            <ActivityFeed events={(data?.recentActivity ?? []).slice(0, 5)} />
          </div>
        </div>

        {data && (
          <details className="group">
            <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-medium transition-colors select-none">
              {t("crossPostStatsToggle")}
            </summary>
            <div className="mt-3">
              <QuickStatsSection data={data.quickStats} />
            </div>
          </details>
        )}
      </div>
    </>
  );
}
