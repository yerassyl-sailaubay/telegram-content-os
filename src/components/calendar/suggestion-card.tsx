"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { CheckIcon, XIcon, CalendarIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createContentItem } from "@/server/actions/content";
import type { CalendarFillSuggestion } from "@/lib/ai/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type SuggestionCardProps = {
  suggestion: CalendarFillSuggestion;
  channelId: string;
  onAccept: (suggestion: CalendarFillSuggestion) => void;
  onDismiss: (suggestion: CalendarFillSuggestion) => void;
};

// ─── Source type badge color map ──────────────────────────────────────────────

const sourceTypeBadgeClass: Record<string, string> = {
  idea: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  repurpose:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  external:
    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  draft:
    "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200 dark:border-slate-800",
};

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(Math.min(100, Math.max(0, value * 100)));
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-muted-foreground min-w-[3rem] text-right font-mono text-xs tabular-nums">
        {pct}%
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SuggestionCard({
  suggestion,
  channelId,
  onAccept,
  onDismiss,
}: SuggestionCardProps) {
  const t = useTranslations("suggestionCard");
  const [accepting, setAccepting] = React.useState(false);

  const sourceTypeKey = `sourceType_${suggestion.sourceType}` as
    | "sourceType_idea"
    | "sourceType_repurpose"
    | "sourceType_external"
    | "sourceType_draft";

  const badgeClass = sourceTypeBadgeClass[suggestion.sourceType] ?? sourceTypeBadgeClass.idea;

  async function handleAccept() {
    setAccepting(true);
    try {
      const result = await createContentItem({
        title: suggestion.suggestedContent,
        content: suggestion.suggestedContent,
        sourceType: "idea",
        status: "draft",
        channelId,
        sourceMetadata: {
          generatedBy: "calendar-fill",
          date: suggestion.date,
          confidence: suggestion.confidence,
        },
      });

      if (result.success) {
        toast.success(t("acceptSuccess"));
        onAccept(suggestion);
      } else {
        toast.error(result.error ?? t("acceptError"));
      }
    } catch {
      toast.error(t("acceptError"));
    } finally {
      setAccepting(false);
    }
  }

  function handleDismiss() {
    onDismiss(suggestion);
  }

  const dateDisplay = React.useMemo(() => {
    try {
      return format(new Date(suggestion.date + "T00:00:00"), "EEE, MMM d");
    } catch {
      return suggestion.date;
    }
  }, [suggestion.date]);

  return (
    <Card
      data-testid="suggestion-card"
      className="group border-border/60 relative overflow-hidden transition-shadow hover:shadow-md"
    >
      {/* Subtle accent stripe */}
      <div className="absolute top-0 left-0 h-full w-0.5 bg-gradient-to-b from-violet-400 to-purple-600 opacity-60" />

      <CardContent className="py-4 pl-5">
        {/* Header row: date + source badge */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <CalendarIcon className="size-3.5 shrink-0" />
            <span data-testid="suggestion-date">{dateDisplay}</span>
          </div>
          <Badge
            data-testid="suggestion-source-type"
            className={cn("shrink-0 border text-[10px] font-medium", badgeClass)}
          >
            {t(sourceTypeKey)}
          </Badge>
        </div>

        {/* Content preview */}
        <div className="mb-3 flex items-start gap-2">
          <SparklesIcon className="mt-0.5 size-3.5 shrink-0 text-violet-500" />
          <p data-testid="suggestion-content" className="line-clamp-3 text-sm leading-snug">
            {suggestion.suggestedContent}
          </p>
        </div>

        {/* Confidence bar */}
        <div className="mb-4">
          <ConfidenceBar value={suggestion.confidence} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            data-testid="suggestion-accept"
            size="sm"
            className="flex-1 gap-1.5 bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-700 dark:hover:bg-violet-600"
            disabled={accepting}
            onClick={handleAccept}
          >
            <CheckIcon className="size-3.5" />
            {accepting ? t("accepting") : t("accept")}
          </Button>
          <Button
            data-testid="suggestion-dismiss"
            size="sm"
            variant="outline"
            className="text-muted-foreground hover:text-destructive gap-1.5"
            onClick={handleDismiss}
          >
            <XIcon className="size-3.5" />
            {t("dismiss")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
