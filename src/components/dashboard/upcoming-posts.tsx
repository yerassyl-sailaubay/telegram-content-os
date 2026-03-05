"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Plus, ArrowRight } from "lucide-react";
import type { UpcomingPost } from "@/server/actions/dashboard";

type UpcomingPostsProps = {
  posts: UpcomingPost[];
};

function getPlatformLabel(platform: string): string {
  if (platform === "linkedin") return "LinkedIn";
  if (platform === "twitter") return "Twitter / X";
  return platform;
}

function formatScheduledTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMin = Math.ceil(diffMs / 60000);
  const diffHr = Math.ceil(diffMin / 60);
  const diffDay = Math.ceil(diffHr / 24);

  if (diffMin <= 60) return `in ${diffMin}m`;
  if (diffHr <= 24) return `in ${diffHr}h`;
  if (diffDay <= 7) return `in ${diffDay}d`;

  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UpcomingPosts({ posts }: UpcomingPostsProps) {
  const t = useTranslations("dashboard");

  if (posts.length === 0) {
    return (
      <Card data-testid="upcoming-posts">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">{t("upcomingPostsTitle")}</CardTitle>
          <Link
            href="/dashboard/schedule"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-2 transition-colors hover:underline"
          >
            {t("viewCalendar")}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <CalendarDays className="text-muted-foreground/40 h-8 w-8" />
            <p className="text-muted-foreground text-sm font-medium">{t("upcomingEmpty")}</p>
            <p className="text-muted-foreground text-xs">{t("upcomingEmptyDescription")}</p>
            <Button size="sm" asChild>
              <Link href="/dashboard/schedule">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("actionViewSchedule")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="upcoming-posts">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">{t("upcomingPostsTitle")}</CardTitle>
        <Link
          href="/dashboard/schedule"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-2 transition-colors hover:underline"
        >
          {t("viewCalendar")}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {posts.map((post) => (
            <li key={post.id} className="flex items-start gap-3 px-6 py-3">
              <div className="mt-0.5 flex-shrink-0">
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <div className="min-w-0 flex-1">
                <Badge variant="outline" className="text-xs">
                  {getPlatformLabel(post.platform)}
                </Badge>
                {post.contentSnippet && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {post.contentSnippet}
                  </p>
                )}
              </div>
              <span className="flex-shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400">
                {formatScheduledTime(post.scheduledAt)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
