"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { disconnectPlatform } from "@/server/actions/settings";
import type { ConnectionStatus } from "@/server/actions/settings";

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
};

export function ConnectionsTab({ initialConnections }: ConnectionsTabProps) {
  const t = useTranslations("settings");
  const [isPending, startTransition] = useTransition();
  const [connections, setConnections] = useState<ConnectionStatus[]>(initialConnections);
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
