"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle, Wand2, Plus } from "lucide-react";
import type { ActivityEvent } from "@/server/actions/dashboard";

type ActivityFeedProps = {
  events: ActivityEvent[];
};

function getPlatformLabel(platform: string): string {
  if (platform === "linkedin") return "LinkedIn";
  if (platform === "twitter") return "Twitter / X";
  return platform;
}

function getEventIcon(type: ActivityEvent["type"]) {
  switch (type) {
    case "published":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "scheduled":
      return <Clock className="h-4 w-4 text-blue-500" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-rose-500" />;
    default:
      return <Wand2 className="text-muted-foreground h-4 w-4" />;
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  const t = useTranslations("dashboard");

  if (events.length === 0) {
    return (
      <Card data-testid="activity-feed">
        <CardHeader>
          <CardTitle className="text-base font-semibold">{t("activityFeedTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <Wand2 className="text-muted-foreground/40 h-8 w-8" />
            <p className="text-muted-foreground text-sm font-medium">{t("activityEmpty")}</p>
            <p className="text-muted-foreground text-xs">{t("activityEmptyDescription")}</p>
            <Button size="sm" asChild>
              <Link href="/dashboard/crosspost">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("actionNewCrossPost")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="activity-feed">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("activityFeedTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {events.map((event) => (
            <li key={event.id} className="flex items-start gap-3 px-6 py-3">
              <div className="mt-0.5 flex-shrink-0">{getEventIcon(event.type)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getPlatformLabel(event.platform)}
                  </Badge>
                  <span className="text-muted-foreground text-xs capitalize">
                    {t(`activityType_${event.type}`)}
                  </span>
                </div>
                {event.contentSnippet && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {event.contentSnippet}
                  </p>
                )}
              </div>
              <span className="text-muted-foreground flex-shrink-0 text-xs">
                {formatRelativeTime(event.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
