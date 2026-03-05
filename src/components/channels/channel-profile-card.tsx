"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { formatDistanceToNow } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import type { ChannelProfile } from "@/lib/ai/types";

type ChannelProfileCardProps = {
  profile: {
    niche: string | null;
    tone: string | null;
    topTopics: string[];
    language: string;
    generatedAt: Date | string | null;
  };
  onRefresh: () => Promise<{ success: boolean; error?: string }>;
};

export function ChannelProfileCard({
  profile,
  onRefresh,
}: ChannelProfileCardProps) {
  const t = useTranslations("channelProfile");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRefresh() {
    setError(null);
    startTransition(async () => {
      const result = await onRefresh();
      if (!result.success && result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isPending}
        >
          <RefreshCw
            className={`mr-1.5 h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
          />
          {t("refreshProfile")}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Niche */}
        {profile.niche && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("niche")}
            </p>
            <p className="text-sm">{profile.niche}</p>
          </div>
        )}

        {/* Tone */}
        {profile.tone && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("tone")}
            </p>
            <p className="text-sm">{profile.tone}</p>
          </div>
        )}

        {/* Top Topics */}
        {profile.topTopics.length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-muted-foreground">
              {t("topTopics")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.topTopics.map((topic) => (
                <Badge key={topic} variant="secondary">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Language */}
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {t("language")}
          </p>
          <p className="text-sm">{profile.language}</p>
        </div>

        {/* Generated At */}
        {profile.generatedAt && (
          <p className="text-xs text-muted-foreground">
            {t("generatedAt")}:{" "}
            {formatDistanceToNow(
              typeof profile.generatedAt === "string"
                ? new Date(profile.generatedAt)
                : profile.generatedAt,
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
