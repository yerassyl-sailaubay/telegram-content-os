"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2, Clock, Send, Zap } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { publishToTelegram } from "@/server/actions/publish-telegram";
import type { ContentItem } from "@/server/actions/content";
import type { Channel } from "@/server/actions/channels";

// ─── Types ───────────────────────────────────────────────────────────────────

type PublishMode = "now" | "schedule";
type PublishChannel = Pick<Channel, "id" | "title" | "username">;

type TelegramPublishFormProps = {
  content: ContentItem | null;
  channels: PublishChannel[];
};

// ─── Component ───────────────────────────────────────────────────────────────

export function TelegramPublishForm({ content, channels }: TelegramPublishFormProps) {
  const t = useTranslations("publish");

  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [publishMode, setPublishMode] = useState<PublishMode>("now");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  const channelName = selectedChannel?.title ?? selectedChannel?.username ?? "";

  // ─── Status Badge ─────────────────────────────────────────────────────────
  function getStatusBadgeVariant(
    status: string | null,
  ): "default" | "secondary" | "outline" | "destructive" {
    switch (status) {
      case "published":
        return "default";
      case "scheduled":
        return "secondary";
      case "archived":
        return "destructive";
      default:
        return "outline";
    }
  }

  function getStatusLabel(status: string | null): string {
    const key = `contentStatus_${status ?? "draft"}` as keyof ReturnType<typeof t>;
    try {
      return t(key as Parameters<typeof t>[0]);
    } catch {
      return status ?? "draft";
    }
  }

  // ─── Schedule Validation ──────────────────────────────────────────────────
  function buildScheduledAt(): { date: Date; error: string | null } {
    if (!selectedDate) {
      return { date: new Date(), error: t("noDateError") };
    }
    if (!selectedTime) {
      return { date: new Date(), error: t("noTimeError") };
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduled = new Date(selectedDate);
    scheduled.setHours(hours, minutes, 0, 0);

    if (scheduled.getTime() <= Date.now()) {
      return { date: scheduled, error: t("pastTimeError") };
    }

    return { date: scheduled, error: null };
  }

  // ─── Submit: Publish Now ──────────────────────────────────────────────────
  function handlePublishNow() {
    if (!selectedChannelId) {
      setError(t("noChannelError"));
      return;
    }
    if (!content) return;

    setError(null);
    startTransition(async () => {
      const result = await publishToTelegram(content.id, selectedChannelId);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setSuccess(true);
      toast.success(t("publishSuccess"));
    });
  }

  // ─── Submit: Schedule ─────────────────────────────────────────────────────
  function handleSchedule() {
    if (!selectedChannelId) {
      setError(t("noChannelError"));
      return;
    }
    if (!content) return;

    const { date, error: dateError } = buildScheduledAt();
    if (dateError) {
      setError(dateError);
      return;
    }

    setError(null);
    startTransition(async () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = await publishToTelegram(
        content.id,
        selectedChannelId,
        date.toISOString(),
        timezone,
      );
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setSuccess(true);
      toast.success(t("scheduleSuccess"));
    });
  }

  // ─── Success State ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div
        data-testid="publish-success"
        className="bg-card flex min-h-[320px] flex-col items-center justify-center gap-6 rounded-xl border p-10 text-center"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-green-500 bg-green-500/10">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-semibold">
            {publishMode === "now" ? t("publishSuccess") : t("scheduleSuccess")}
          </h3>
          {channelName && <p className="text-muted-foreground text-sm">{channelName}</p>}
        </div>
      </div>
    );
  }

  // ─── No Content State ─────────────────────────────────────────────────────
  if (!content) {
    return (
      <div
        data-testid="publish-no-content"
        className="bg-muted/30 flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center"
      >
        <Send className="text-muted-foreground/50 h-10 w-10" />
        <div className="space-y-1">
          <p className="font-medium">{t("noContent")}</p>
          <p className="text-muted-foreground text-sm">{t("noContentDescription")}</p>
        </div>
      </div>
    );
  }

  // ─── Main Form ────────────────────────────────────────────────────────────
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <Card data-testid="content-preview-card">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <CardTitle className="text-base">{t("contentPreviewTitle")}</CardTitle>
                <CardDescription>{t("contentPreviewDescription")}</CardDescription>
              </div>
              <Badge variant={getStatusBadgeVariant(content.status)}>
                {getStatusLabel(content.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {t("titleLabel")}
              </Label>
              <p
                data-testid="content-title"
                className="bg-muted/30 rounded-md border px-3 py-2.5 text-sm leading-relaxed font-medium"
              >
                {content.title}
              </p>
            </div>

            {content.content && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {t("bodyLabel")}
                  </Label>
                  <div
                    data-testid="content-body"
                    className="bg-muted/30 max-h-72 overflow-y-auto rounded-md border px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                  >
                    {content.content}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("channelSectionTitle")}</CardTitle>
            <CardDescription>{t("channelSectionDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {channels.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm font-medium">{t("noChannels")}</p>
                <p className="text-muted-foreground mt-1 text-xs">{t("noChannelsDescription")}</p>
              </div>
            ) : (
              <Select
                value={selectedChannelId}
                onValueChange={setSelectedChannelId}
                data-testid="channel-select"
              >
                <SelectTrigger data-testid="channel-select-trigger" className="w-full">
                  <SelectValue placeholder={t("selectChannelPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.title ?? channel.username ?? channel.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("publishModeTitle")}</CardTitle>
            <CardDescription>{t("publishModeDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              data-testid="publish-mode-toggle"
              className="bg-muted/30 grid grid-cols-2 gap-2 rounded-lg border p-1"
            >
              <button
                type="button"
                data-testid="mode-now-button"
                onClick={() => setPublishMode("now")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
                  publishMode === "now"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Zap className="h-3.5 w-3.5" />
                {t("publishNow")}
              </button>
              <button
                type="button"
                data-testid="mode-schedule-button"
                onClick={() => setPublishMode("schedule")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
                  publishMode === "schedule"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                {t("schedule")}
              </button>
            </div>

            {publishMode === "schedule" && (
              <div className="space-y-3" data-testid="schedule-options">
                <div className="space-y-1.5">
                  <Label className="text-sm">{t("selectDate")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        data-testid="date-picker-trigger"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : t("selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="publish-time" className="text-sm">
                    {t("timeLabel")}
                  </Label>
                  <input
                    id="publish-time"
                    data-testid="time-input"
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className={cn(
                      "border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none",
                      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  />
                </div>
              </div>
            )}

            {error && (
              <p data-testid="publish-error" className="text-destructive text-sm">
                {error}
              </p>
            )}

            {publishMode === "now" ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    data-testid="publish-now-trigger"
                    className="w-full"
                    disabled={isPending || !selectedChannelId || channels.length === 0}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    {isPending ? t("publishing") : t("publishNow")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("confirmTitle", { channelName: channelName || "—" })}
                    </AlertDialogTitle>
                    <AlertDialogDescription>{t("confirmDescription")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="confirm-cancel">
                      {t("confirmCancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction data-testid="confirm-publish" onClick={handlePublishNow}>
                      {t("confirmAction")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                data-testid="schedule-submit-button"
                className="w-full"
                onClick={handleSchedule}
                disabled={
                  isPending ||
                  !selectedChannelId ||
                  channels.length === 0 ||
                  !selectedDate ||
                  !selectedTime
                }
              >
                <Clock className="mr-2 h-4 w-4" />
                {isPending ? t("scheduling") : t("scheduleButton")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
