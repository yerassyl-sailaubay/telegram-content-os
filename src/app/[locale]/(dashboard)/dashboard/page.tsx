import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { getDashboardHomeData } from "@/server/actions/dashboard";
import { WelcomeSection } from "@/components/dashboard/welcome-section";
import { QuickStatsSection } from "@/components/dashboard/quick-stats";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { UpcomingPosts } from "@/components/dashboard/upcoming-posts";
import { EngagementSparkline } from "@/components/dashboard/engagement-sparkline";

export default async function DashboardPage() {
  const t = await getTranslations("nav");

  const result = await getDashboardHomeData();
  const data = result.success ? result.data : null;

  return (
    <>
      <PageHeader title={t("dashboard")} />
      <div className="space-y-6 pb-8">
        {/* Welcome + date */}
        <WelcomeSection userName={data?.userName ?? null} userEmail={data?.userEmail ?? null} />

        {/* Quick stats row */}
        {data ? (
          <QuickStatsSection data={data.quickStats} />
        ) : (
          <QuickStatsSection
            data={{
              crossPostsUsed: 0,
              crossPostsLimit: 5,
              scheduledCount: 0,
              weeklyEngagement: 0,
              connectedPlatforms: 0,
            }}
          />
        )}

        {/* Quick action buttons */}
        <QuickActions />

        {/* Main content: activity + sparkline / upcoming */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Activity feed — 2/3 width */}
          <div className="lg:col-span-2">
            <ActivityFeed events={data?.recentActivity ?? []} />
          </div>

          {/* Right column: sparkline + upcoming */}
          <div className="flex flex-col gap-6">
            <EngagementSparkline data={data?.engagementSparkline ?? []} />
            <UpcomingPosts posts={data?.upcomingPosts ?? []} />
          </div>
        </div>
      </div>
    </>
  );
}
