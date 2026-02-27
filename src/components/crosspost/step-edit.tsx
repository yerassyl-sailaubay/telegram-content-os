"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { updateAdaptedContent } from "@/server/actions/crosspost";
import type { CrossPost, Platform } from "@/server/actions/crosspost";

type StepEditProps = {
  crossPost: CrossPost;
  originalContent: string;
  platform: Platform;
  onNext: (adaptedContent: string) => void;
  onBack: () => void;
};

const PLATFORM_LIMIT: Record<Platform, number> = {
  linkedin: 3000,
  twitter: 280,
};

export function StepEdit({
  crossPost,
  originalContent,
  platform,
  onNext,
  onBack,
}: StepEditProps) {
  const t = useTranslations("crosspost");
  const [adaptedText, setAdaptedText] = useState(
    crossPost.adaptedContent ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const limit = PLATFORM_LIMIT[platform];
  const charCount = adaptedText.length;
  const isOverLimit = charCount > limit;
  const platformLabel = platform === "linkedin" ? t("linkedin") : t("twitter");

  function handleContinue() {
    setError(null);
    startTransition(async () => {
      const result = await updateAdaptedContent({
        crossPostId: crossPost.id,
        adaptedContent: adaptedText,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onNext(adaptedText);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("editDescription")}</p>

      <div className="grid grid-cols-2 gap-4">
        {/* Left: Original Russian */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{t("originalLabel")}</label>
            <Badge variant="outline" className="text-xs">
              {originalContent.length} {t("characters", { count: "" }).replace("{count} ", "").trim()}
            </Badge>
          </div>
          <Textarea
            value={originalContent}
            readOnly
            className="h-64 resize-none bg-muted/30 text-sm leading-relaxed"
            dir="auto"
          />
        </div>

        {/* Right: Adapted English */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              {t("adaptedLabel")}
              <Badge variant="secondary" className="ml-2 capitalize text-xs">
                {platformLabel}
              </Badge>
            </label>
            <span
              className={`text-xs font-medium tabular-nums ${
                isOverLimit ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {charCount}/{limit}
            </span>
          </div>
          <Textarea
            value={adaptedText}
            onChange={(e) => setAdaptedText(e.target.value)}
            className={`h-64 resize-none text-sm leading-relaxed ${
              isOverLimit ? "border-destructive focus-visible:ring-destructive" : ""
            }`}
            placeholder={t("adaptedLabel")}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isOverLimit && (
        <p className="text-sm text-destructive">
          Content exceeds {platform} limit by {charCount - limit} characters.
        </p>
      )}

      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="ghost" onClick={onBack}>
          {t("back")}
        </Button>
        <Button
          onClick={handleContinue}
          disabled={isPending || !adaptedText.trim()}
        >
          {t("continueToPreview")}
          <ChevronRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
