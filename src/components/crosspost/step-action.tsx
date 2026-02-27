"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, ExternalLink, Zap } from "lucide-react";
import { postCrossPostNow, scheduleCrossPost } from "@/server/actions/crosspost";
import type { CrossPost, Platform, CrossPostUsage } from "@/server/actions/crosspost";
import { Link } from "@/i18n/navigation";

type StepActionProps = {
  crossPost: CrossPost;
  platform: Platform;
  usage: CrossPostUsage | null;
  onStartOver: () => void;
};

type ActionMode = "choose" | "schedule" | "success";

export function StepAction({
  crossPost,
  platform,
  usage,
  onStartOver,
}: StepActionProps) {
  const t = useTranslations("crosspost");
  const [mode, setMode] = useState<ActionMode>("choose");
  const [successType, setSuccessType] = useState<"now" | "scheduled" | null>(
    null,
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePostNow() {
    setError(null);
    startTransition(async () => {
      const result = await postCrossPostNow({ crossPostId: crossPost.id });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccessType("now");
      setMode("success");
    });
  }

  function handleSchedule() {
    if (!scheduledAt) {
      setError(t("selectDatetimeError"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await scheduleCrossPost({
        crossPostId: crossPost.id,
        scheduledAt: new Date(scheduledAt),
        timezone,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccessType("scheduled");
      setMode("success");
    });
  }

  const platformLabel = platform === "linkedin" ? t("linkedin") : t("twitter");

  // Success state
  if (mode === "success") {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center space-y-6 py-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-green-500 bg-green-500/10">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">
            {successType === "now" ? t("postSuccess") : t("scheduleSuccess")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {platformLabel}
          </p>
        </div>
        <Button onClick={onStartOver}>{t("startOver")}</Button>
      </div>
    );
  }

  // Schedule mode
  if (mode === "schedule") {
    return (
      <div className="space-y-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scheduled-at">{t("selectDatetime")}</Label>
            <Input
              id="scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">{t("timezone")}</Label>
            <Input
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Asia/Almaty"
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" onClick={() => setMode("choose")}>
            {t("back")}
          </Button>
          <Button onClick={handleSchedule} disabled={isPending || !scheduledAt}>
            {isPending ? t("scheduling") : t("confirmSchedule")}
          </Button>
        </div>
      </div>
    );
  }

  // Choose mode (default)
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("publishDescription")}</p>

      {/* Quota */}
      {usage && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-sm ${
            usage.used >= usage.limit
              ? "border-destructive/50 bg-destructive/10 text-destructive"
              : "border-border bg-muted/40"
          }`}
        >
          {usage.used >= usage.limit
            ? t("quotaExceeded")
            : t("quotaLabel", { used: usage.used, limit: usage.limit })}
        </div>
      )}

      {/* Action cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm"
          onClick={handlePostNow}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">{t("postNow")}</CardTitle>
            </div>
            <CardDescription>
              {t("postNowDescription", { platform: platformLabel })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                handlePostNow();
              }}
              disabled={isPending || (usage?.used ?? 0) >= (usage?.limit ?? 50)}
            >
              {isPending ? t("posting") : t("postNow")}
            </Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm"
          onClick={() => setMode("schedule")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-muted p-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-base">{t("schedule")}</CardTitle>
            </div>
            <CardDescription>{t("scheduleDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                setMode("schedule");
              }}
              disabled={isPending || (usage?.used ?? 0) >= (usage?.limit ?? 50)}
            >
              {t("schedule")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="ghost"
          asChild
        >
          <Link href="/dashboard/settings">
            <ExternalLink className="mr-1.5 h-4 w-4" />
            {t("goToSettings")}
          </Link>
        </Button>
        <Badge variant="outline" className="capitalize">
          {platformLabel}
        </Badge>
      </div>
    </div>
  );
}
