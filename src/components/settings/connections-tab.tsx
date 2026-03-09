"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Unlink,
  Copy,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { disconnectPlatform } from "@/server/actions/settings";
import { createTelegramBotLink } from "@/server/actions/telegram-bot";
import type { ConnectionStatus, TelegramBotStatus } from "@/server/actions/settings";

const PLATFORM_ICONS: Record<string, string> = {
  linkedin: "in",
  twitter: "X",
};

const PLATFORM_NAMES: Record<string, string> = {
  linkedin: "LinkedIn",
  twitter: "Twitter / X",
};

type ConnectionCardProps = {
  connection: ConnectionStatus;
  onDisconnect: (platform: "linkedin" | "twitter") => void;
  isLoading: boolean;
};

function ConnectionCard({ connection, onDisconnect, isLoading }: ConnectionCardProps) {
  const t = useTranslations("settings");

  const statusIcon = connection.connected ? (
    connection.isExpiringSoon ? (
      <AlertTriangle
        className="h-5 w-5 text-amber-500"
        data-testid={`${connection.platform}-expiring-icon`}
      />
    ) : (
      <CheckCircle2
        className="h-5 w-5 text-emerald-500"
        data-testid={`${connection.platform}-connected-icon`}
      />
    )
  ) : (
    <XCircle
      className="text-muted-foreground h-5 w-5"
      data-testid={`${connection.platform}-disconnected-icon`}
    />
  );

  const statusBadge = connection.connected ? (
    connection.isExpiringSoon ? (
      <Badge
        variant="outline"
        className="border-amber-500 text-amber-600 dark:text-amber-400"
        data-testid={`${connection.platform}-expiring-badge`}
      >
        {t("connections.expiringSoon")}
      </Badge>
    ) : (
      <Badge
        variant="outline"
        className="border-emerald-500 text-emerald-600 dark:text-emerald-400"
        data-testid={`${connection.platform}-connected-badge`}
      >
        {t("connections.connected")}
      </Badge>
    )
  ) : (
    <Badge
      variant="outline"
      className="text-muted-foreground"
      data-testid={`${connection.platform}-disconnected-badge`}
    >
      {t("connections.disconnected")}
    </Badge>
  );

  return (
    <div
      className="flex items-center justify-between rounded-lg border p-4"
      data-testid={`connection-card-${connection.platform}`}
    >
      <div className="flex items-center gap-3">
        <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold">
          {PLATFORM_ICONS[connection.platform]}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{PLATFORM_NAMES[connection.platform]}</p>
            {statusIcon}
          </div>
          {connection.username && (
            <p className="text-muted-foreground text-xs">@{connection.username}</p>
          )}
          {connection.isExpiringSoon && connection.expiresAt && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t("connections.tokenExpiresAt", {
                date: new Date(connection.expiresAt).toLocaleDateString(),
              })}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {statusBadge}
        {connection.connected && (
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            data-testid={`disconnect-${connection.platform}-button`}
            onClick={() => onDisconnect(connection.platform)}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Unlink className="mr-1 h-4 w-4" />
                {t("connections.disconnect")}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

type ConnectionsTabProps = {
  initialConnections: ConnectionStatus[];
  initialTelegramBot: TelegramBotStatus;
};

export function ConnectionsTab({ initialConnections, initialTelegramBot }: ConnectionsTabProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isBotPending, startBotTransition] = useTransition();
  const [connections, setConnections] = useState<ConnectionStatus[]>(initialConnections);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const telegramBot = initialTelegramBot;

  function handleDisconnect(platform: "linkedin" | "twitter") {
    setError(null);
    setLoadingPlatform(platform);

    startTransition(async () => {
      const result = await disconnectPlatform(platform);
      if (result.success) {
        setConnections((prev) =>
          prev.map((c) =>
            c.platform === platform
              ? {
                  ...c,
                  connected: false,
                  username: null,
                  expiresAt: null,
                  isExpiringSoon: false,
                }
              : c,
          ),
        );
      } else {
        setError(result.error);
      }
      setLoadingPlatform(null);
    });
  }

  function handleTelegramBotLink() {
    setError(null);

    startBotTransition(async () => {
      const result = await createTelegramBotLink();
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setGeneratedLink(result.data.deepLinkUrl);
      toast.success(t("connections.telegramBot.linkReady"));
    });
  }

  function handleCopyTelegramLink() {
    if (!generatedLink) {
      return;
    }

    navigator.clipboard.writeText(generatedLink).then(
      () => toast.success(t("connections.telegramBot.linkCopied")),
      () => toast.error(t("connections.telegramBot.linkCopyFailed")),
    );
  }

  function handleRefreshTelegramBotStatus() {
    setError(null);
    router.refresh();
  }

  return (
    <Card data-testid="connections-tab-content">
      <CardHeader>
        <CardTitle>{t("connections.title")}</CardTitle>
        <CardDescription>{t("connections.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connections.map((connection) => (
          <ConnectionCard
            key={connection.platform}
            connection={connection}
            onDisconnect={handleDisconnect}
            isLoading={isPending && loadingPlatform === connection.platform}
          />
        ))}

        <div className="space-y-3 rounded-lg border p-4" data-testid="connection-card-telegram-bot">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{t("connections.telegramBot.title")}</p>
                {telegramBot.linked ? (
                  <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                    {t("connections.connected")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    {t("connections.disconnected")}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                {telegramBot.linked && telegramBot.telegramUserId
                  ? t("connections.telegramBot.linkedDescription", {
                      telegramUserId: telegramBot.telegramUserId,
                    })
                  : t("connections.telegramBot.description")}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTelegramBotLink}
              disabled={isBotPending}
              data-testid="connect-telegram-bot-button"
            >
              {isBotPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ExternalLink className="mr-1 h-4 w-4" />
                  {telegramBot.linked
                    ? t("connections.telegramBot.reconnect")
                    : t("connections.telegramBot.connect")}
                </>
              )}
            </Button>
          </div>

          {generatedLink && (
            <div className="bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
              <code className="min-w-0 flex-1 truncate">{generatedLink}</code>
              <Button asChild variant="ghost" size="sm" className="h-7 shrink-0 px-2">
                <a href={generatedLink} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleCopyTelegramLink}
                data-testid="copy-telegram-bot-link-button"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleRefreshTelegramBotStatus}
                data-testid="refresh-telegram-bot-status-button"
                title={t("connections.telegramBot.refreshStatus")}
                aria-label={t("connections.telegramBot.refreshStatus")}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {error && (
          <p className="text-destructive text-sm" data-testid="connections-error">
            {error}
          </p>
        )}

        <p className="text-muted-foreground pt-2 text-xs">{t("connections.connectNote")}</p>
      </CardContent>
    </Card>
  );
}
