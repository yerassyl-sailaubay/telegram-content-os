"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { LinkedInPreview } from "@/components/preview/linkedin-preview";
import { TwitterPreview } from "@/components/preview/twitter-preview";
import { splitIntoThread } from "@/lib/ai/adaptation-engine";
import type { Platform } from "@/server/actions/crosspost";

type StepPreviewProps = {
  adaptedContent: string;
  platform: Platform;
  onNext: () => void;
  onBack: () => void;
};

export function StepPreview({
  adaptedContent,
  platform,
  onNext,
  onBack,
}: StepPreviewProps) {
  const t = useTranslations("crosspost");

  const platformLabel = platform === "linkedin" ? t("linkedin") : t("twitter");

  // For Twitter, compute thread if needed
  const tweets =
    platform === "twitter" ? splitIntoThread(adaptedContent) : undefined;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {t("previewDescription", { platform: platformLabel })}
      </p>

      {/* Preview */}
      <div className="flex justify-center">
        {platform === "linkedin" ? (
          <LinkedInPreview content={adaptedContent} />
        ) : (
          <TwitterPreview
            content={adaptedContent}
            tweets={tweets && tweets.length > 1 ? tweets : undefined}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="ghost" onClick={onBack}>
          {t("back")}
        </Button>
        <Button onClick={onNext}>
          {t("continueToPublish")}
          <ChevronRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
