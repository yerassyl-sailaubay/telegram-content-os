"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, ChevronRight, RefreshCw } from "lucide-react";
import { triggerAdaptContent, getCrossPost } from "@/server/actions/crosspost";
import type { TelegramPostWithChannel, Platform, CrossPost } from "@/server/actions/crosspost";

type StepAdaptProps = {
  post: TelegramPostWithChannel;
  platform: Platform;
  onNext: (crossPost: CrossPost) => void;
  onBack: () => void;
};

type AdaptState = "idle" | "pending" | "polling" | "done" | "error";

export function StepAdapt({ post, platform, onNext, onBack }: StepAdaptProps) {
  const t = useTranslations("crosspost");
  const tCommon = useTranslations("common");
  const [state, setState] = useState<AdaptState>("idle");
  const [crossPostId, setCrossPostId] = useState<string | null>(null);
  const [crossPost, setCrossPost] = useState<CrossPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startAdaptation = useCallback(async () => {
    setState("pending");
    setError(null);
    try {
      const result = await triggerAdaptContent({
        postId: post.id,
        platform,
      });

      if (!result.success) {
        setState("error");
        setError(result.error);
        return;
      }

      setCrossPostId(result.data.crossPostId);
      setState("polling");
    } catch {
      setState("error");
      setError(tCommon("error"));
    }
  }, [post.id, platform, tCommon]);

  // Auto-start on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      void startAdaptation();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [startAdaptation]);

  // Poll for completion
  useEffect(() => {
    if (state !== "polling" || !crossPostId) return;

    let cancelled = false;

    const poll = async () => {
      let result;
      try {
        result = await getCrossPost(crossPostId);
      } catch {
        if (cancelled) return;
        setState("error");
        setError(tCommon("error"));
        return;
      }
      if (cancelled) return;

      if (!result.success) {
        setState("error");
        setError(result.error);
        return;
      }

      const cp = result.data;

      if (cp.adaptedContent) {
        setCrossPost(cp);
        setState("done");
        return;
      }

      if (cp.status === "failed") {
        const metadata = cp.engagementData;
        const errorMessage =
          metadata &&
          typeof metadata === "object" &&
          "errorMessage" in metadata &&
          typeof metadata.errorMessage === "string" &&
          metadata.errorMessage.trim().length > 0
            ? metadata.errorMessage
            : t("adaptationFailed");
        setState("error");
        setError(errorMessage);
        return;
      }

      // Keep polling
      if (!cancelled) {
        setTimeout(poll, 2000);
      }
    };

    const timer = setTimeout(poll, 2000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state, crossPostId, tCommon, t]);

  const platformLabel = platform === "linkedin" ? t("linkedin") : t("twitter");

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center space-y-6 py-8">
      {/* Status indicator */}
      <div className="relative flex items-center justify-center">
        {(state === "pending" || state === "polling") && (
          <div className="bg-primary/20 absolute inset-0 animate-ping rounded-full" />
        )}
        <div
          className={`relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-colors ${
            state === "done"
              ? "border-green-500 bg-green-500/10"
              : state === "error"
                ? "border-destructive bg-destructive/10"
                : "border-primary bg-primary/10"
          }`}
        >
          {state === "done" ? (
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          ) : state === "error" ? (
            <XCircle className="text-destructive h-10 w-10" />
          ) : (
            <Loader2 className="text-primary h-10 w-10 animate-spin" />
          )}
        </div>
      </div>

      {/* Text */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">
          {state === "done"
            ? t("adaptationComplete")
            : state === "error"
              ? t("adaptationFailed")
              : t("adaptingHeading")}
        </h3>
        {state !== "done" && state !== "error" && (
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">
            {t("adaptingDescription", { platform: platformLabel })}
          </p>
        )}
        {error && <p className="text-destructive mt-2 text-sm">{error}</p>}
      </div>

      {/* Progress dots for polling */}
      {(state === "pending" || state === "polling") && (
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="bg-primary h-2 w-2 animate-bounce rounded-full"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      )}

      {/* Platform badge */}
      {state !== "error" && (
        <Badge variant="secondary" className="capitalize">
          {platformLabel}
        </Badge>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={state === "pending" || state === "polling"}
        >
          {t("back")}
        </Button>
        {state === "error" && (
          <Button variant="outline" onClick={startAdaptation}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            {t("retryAdaptation")}
          </Button>
        )}
        {state === "done" && crossPost && (
          <Button onClick={() => onNext(crossPost)}>
            {t("continueToEdit")}
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
