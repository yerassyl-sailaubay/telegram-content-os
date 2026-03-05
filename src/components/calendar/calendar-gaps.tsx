"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { addDays, format } from "date-fns";
import { SparklesIcon, RefreshCwIcon, CalendarX2Icon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SuggestionCard } from "@/components/calendar/suggestion-card";
import { requestCalendarSuggestions, getCalendarSuggestions } from "@/server/actions/calendar";
import type { CalendarFillSuggestion } from "@/lib/ai/types";

type Channel = {
  id: string;
  name: string;
};

type CalendarGapsProps = {
  channels: Channel[];
  initialChannelId?: string;
  initialSuggestions?: CalendarFillSuggestion[];
};

function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function getNext7Days(): Date[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => addDays(today, i));
}

export function CalendarGaps({
  channels,
  initialChannelId,
  initialSuggestions = [],
}: CalendarGapsProps) {
  const t = useTranslations("calendarGaps");

  const defaultChannelId = initialChannelId ?? channels[0]?.id ?? "";
  const [channelId, setChannelId] = React.useState(defaultChannelId);
  const [requesting, setRequesting] = React.useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);
  const [suggestions, setSuggestions] =
    React.useState<CalendarFillSuggestion[]>(initialSuggestions);

  const gapDatesAsDate = React.useMemo(() => getNext7Days(), []);
  const gapCount = gapDatesAsDate.length;

  async function handleRequestSuggestions() {
    if (!channelId) return;
    setRequesting(true);
    try {
      const today = new Date();
      const start = toDateString(today);
      const end = toDateString(addDays(today, 6));
      const result = await requestCalendarSuggestions(channelId, start, end);
      if (result.success) {
        toast.success(t("suggestionsRequested"));
      } else {
        toast.error(result.error ?? t("suggestionsRequestError"));
      }
    } catch {
      toast.error(t("suggestionsRequestError"));
    } finally {
      setRequesting(false);
    }
  }

  async function handleRefreshSuggestions() {
    if (!channelId) return;
    setLoadingSuggestions(true);
    try {
      const result = await getCalendarSuggestions(channelId);
      if (result.success) {
        setSuggestions(result.data);
      } else {
        toast.error(result.error ?? t("suggestionsRefreshError"));
      }
    } catch {
      toast.error(t("suggestionsRefreshError"));
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function handleAccept(accepted: CalendarFillSuggestion) {
    setSuggestions((prev) =>
      prev.filter(
        (s) => !(s.date === accepted.date && s.suggestedContent === accepted.suggestedContent),
      ),
    );
  }

  function handleDismiss(dismissed: CalendarFillSuggestion) {
    setSuggestions((prev) =>
      prev.filter(
        (s) => !(s.date === dismissed.date && s.suggestedContent === dismissed.suggestedContent),
      ),
    );
  }

  React.useEffect(() => {
    setSuggestions(initialSuggestions);
  }, [channelId, initialSuggestions]);

  const noChannels = channels.length === 0;

  if (noChannels) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
        <CalendarX2Icon className="text-muted-foreground/40 size-10" />
        <div>
          <p className="font-medium">{t("noChannels")}</p>
          <p className="text-muted-foreground mt-1 text-sm">{t("noChannelsDescription")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger data-testid="channel-selector" className="w-full min-w-[200px]">
                <SelectValue placeholder={t("selectChannel")} />
              </SelectTrigger>
              <SelectContent>
                {channels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-xl border shadow-sm">
            <Calendar
              mode="single"
              defaultMonth={new Date()}
              modifiers={{
                gap: gapDatesAsDate,
              }}
              modifiersClassNames={{
                gap: cn(
                  "relative after:absolute after:inset-0.5 after:rounded after:border after:border-dashed",
                  "after:border-rose-400/60 after:bg-rose-50/40",
                  "dark:after:border-rose-600/40 dark:after:bg-rose-950/20",
                ),
              }}
              showOutsideDays={false}
              className="p-3"
            />
          </div>

          <div className="bg-muted/20 flex items-center justify-between rounded-lg border px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <span
                className="inline-block h-3 w-3 rounded border border-dashed border-rose-400 bg-rose-50 dark:bg-rose-950/20"
                aria-hidden
              />
              {gapCount > 0 ? (
                <span className="font-medium text-rose-600 dark:text-rose-400">
                  {t("gapCount", { count: gapCount })}
                </span>
              ) : (
                <span className="text-muted-foreground">{t("noGaps")}</span>
              )}
            </div>
          </div>

          <Button
            data-testid="get-ai-suggestions-btn"
            onClick={handleRequestSuggestions}
            disabled={requesting || !channelId}
            className="w-full gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 dark:from-violet-700 dark:to-purple-700 dark:hover:from-violet-600 dark:hover:to-purple-600"
          >
            <SparklesIcon className="size-4" />
            {requesting ? t("requestingSuggestions") : t("getAiSuggestions")}
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{t("suggestionsTitle")}</h3>
              <p className="text-muted-foreground text-sm">{t("suggestionsDescription")}</p>
            </div>
            <Button
              data-testid="refresh-suggestions-btn"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={handleRefreshSuggestions}
              disabled={loadingSuggestions || !channelId}
            >
              <RefreshCwIcon className={cn("size-3.5", loadingSuggestions && "animate-spin")} />
              {t("refreshSuggestions")}
            </Button>
          </div>

          {loadingSuggestions ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[160px] w-full rounded-xl" />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
              <SparklesIcon className="text-muted-foreground/30 size-8" />
              <div>
                <p className="text-sm font-medium">{t("noSuggestions")}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t("noSuggestionsDescription")}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {suggestions.map((suggestion, i) => (
                <SuggestionCard
                  key={`${suggestion.date}-${i}`}
                  suggestion={suggestion}
                  channelId={channelId}
                  onAccept={handleAccept}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
