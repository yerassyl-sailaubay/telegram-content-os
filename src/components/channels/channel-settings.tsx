"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateChannelSettings } from "@/server/actions/channels";
import type { Channel } from "@/server/actions/channels";

type ChannelSettingsProps = {
  channel: Channel;
};

export function ChannelSettings({ channel }: ChannelSettingsProps) {
  const t = useTranslations("channels");
  const [autoImport, setAutoImport] = useState(true);
  const [, startTransition] = useTransition();

  function handleAutoImportToggle() {
    const newValue = !autoImport;
    setAutoImport(newValue);
    startTransition(async () => {
      await updateChannelSettings({ id: channel.id });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("settings")}</CardTitle>
        <CardDescription>{t("channelInfo")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Channel metadata */}
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
          {channel.username && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("username")}</span>
              <span className="font-mono font-medium">@{channel.username}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("channelId")}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {channel.telegramChatId}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge
              variant="secondary"
              className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            >
              {t("statusActive")}
            </Badge>
          </div>
        </div>

        {/* Auto-import toggle */}
        <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("autoImport")}</p>
            <p className="text-xs text-muted-foreground">
              {t("autoImportDescription")}
            </p>
          </div>
          <Button
            variant={autoImport ? "default" : "outline"}
            size="sm"
            onClick={handleAutoImportToggle}
            className="shrink-0"
          >
            {autoImport ? t("autoImportEnabled") : t("autoImportDisabled")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
