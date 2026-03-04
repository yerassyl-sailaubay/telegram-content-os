"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Scissors, ListTree, BarChart2, Loader2, Minus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { repurposePost } from "@/server/actions/repurpose";
import type { RepurposeMode } from "@/lib/ai/types";

interface RepurposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  contentText: string;
}

const TRUNCATE_LENGTH = 200;

function truncateText(text: string): string {
  if (text.length <= TRUNCATE_LENGTH) return text;
  return text.slice(0, TRUNCATE_LENGTH) + "…";
}

interface ModeOption {
  mode: RepurposeMode;
  icon: React.ElementType;
  labelKey: string;
  descriptionKey: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    mode: "shorter",
    icon: Scissors,
    labelKey: "repurpose.modeShorterLabel",
    descriptionKey: "repurpose.modeShorterDescription",
  },
  {
    mode: "thread",
    icon: ListTree,
    labelKey: "repurpose.modeThreadLabel",
    descriptionKey: "repurpose.modeThreadDescription",
  },
  {
    mode: "poll",
    icon: BarChart2,
    labelKey: "repurpose.modePollLabel",
    descriptionKey: "repurpose.modePollDescription",
  },
];

export function RepurposeModal({
  open,
  onOpenChange,
  contentId,
  contentText,
}: RepurposeModalProps) {
  const t = useTranslations();
  const [selectedMode, setSelectedMode] = useState<RepurposeMode>("shorter");
  const [numVariations, setNumVariations] = useState(1);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    if (isPending) return;
    onOpenChange(false);
  }

  function handleSubmit() {
    startTransition(async () => {
      const options = selectedMode === "shorter" ? { numVariations } : undefined;
      const result = await repurposePost(contentId, selectedMode, options);

      if (result.success) {
        toast.success(t("repurpose.successToast"));
        onOpenChange(false);
      } else {
        toast.error(result.error ?? t("common.error"));
      }
    });
  }

  function decrementVariations() {
    setNumVariations((v) => Math.max(1, v - 1));
  }

  function incrementVariations() {
    setNumVariations((v) => Math.min(3, v + 1));
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="repurpose-modal">
        <DialogHeader>
          <DialogTitle>{t("repurpose.title")}</DialogTitle>
          <DialogDescription>{t("repurpose.description")}</DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-md border p-3">
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            {t("repurpose.originalContentLabel")}
          </p>
          <p className="text-sm leading-relaxed" data-testid="repurpose-content-preview">
            {truncateText(contentText)}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("repurpose.selectModeLabel")}</p>
          <div className="grid gap-2" data-testid="repurpose-mode-group">
            {MODE_OPTIONS.map(({ mode, icon: Icon, labelKey, descriptionKey }) => (
              <button
                key={mode}
                type="button"
                data-testid={`repurpose-mode-${mode}`}
                onClick={() => setSelectedMode(mode)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                  "hover:bg-accent/50 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                  selectedMode === mode
                    ? "border-primary bg-primary/5 ring-primary/30 ring-1"
                    : "border-border bg-background",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                    selectedMode === mode
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      selectedMode === mode ? "text-primary" : "text-foreground",
                    )}
                  >
                    {t(labelKey)}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">{t(descriptionKey)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedMode === "shorter" && (
          <div
            className="flex items-center justify-between rounded-md border p-3"
            data-testid="repurpose-variations-control"
          >
            <div>
              <p className="text-sm font-medium">{t("repurpose.numVariationsLabel")}</p>
              <p className="text-muted-foreground text-xs">{t("repurpose.numVariationsHint")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={decrementVariations}
                disabled={numVariations <= 1 || isPending}
                data-testid="repurpose-variations-decrement"
                aria-label={t("repurpose.decrementVariations")}
              >
                <Minus />
              </Button>
              <span
                className="w-5 text-center text-sm font-semibold tabular-nums"
                data-testid="repurpose-variations-value"
              >
                {numVariations}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={incrementVariations}
                disabled={numVariations >= 3 || isPending}
                data-testid="repurpose-variations-increment"
                aria-label={t("repurpose.incrementVariations")}
              >
                <Plus />
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
            data-testid="repurpose-cancel-button"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            data-testid="repurpose-submit-button"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                {t("repurpose.submitting")}
              </>
            ) : (
              t("repurpose.submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
