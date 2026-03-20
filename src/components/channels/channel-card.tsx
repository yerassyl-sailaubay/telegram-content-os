"use client";

import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, FileText, Calendar, ExternalLink, Unplug } from "lucide-react";
import Link from "next/link";
import type { ChannelWithPostCount } from "@/server/actions/channels";

type ChannelCardProps = {
  channel: ChannelWithPostCount;
  onDisconnect: (id: string) => void;
  isDisconnecting?: boolean;
};

export function ChannelCard({ channel, onDisconnect, isDisconnecting }: ChannelCardProps) {
  const t = useTranslations("channels");
  const tCommon = useTranslations("common");

  return (
    <Card className="group flex flex-col" data-testid="channel-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="line-clamp-1 text-base" data-testid="channel-card-title">
              {channel.title ?? channel.username ?? channel.telegramChatId}
            </CardTitle>
            {channel.username && (
              <p className="text-muted-foreground mt-0.5 text-sm">@{channel.username}</p>
            )}
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          >
            {t("statusActive")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-2 pb-3">
        <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
          {typeof channel.memberCount === "number" && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>
                {t("memberCount", {
                  count: channel.memberCount.toLocaleString(),
                })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>{t("postCount", { count: channel.postCount })}</span>
          </div>
        </div>

        {channel.lastPostAt && (
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Calendar className="h-3 w-3" />
            <span>
              {t("lastPost")}: {formatDistanceToNow(new Date(channel.lastPostAt))}
            </span>
          </div>
        )}

        {channel.connectedAt && (
          <p className="text-muted-foreground text-xs">
            {t("connectedOn")}: {formatDistanceToNow(new Date(channel.connectedAt))}
          </p>
        )}
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <Link href={`/dashboard/channels/${channel.id}`}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            {t("viewDetails")}
          </Link>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={isDisconnecting}
            >
              <Unplug className="mr-1.5 h-3.5 w-3.5" />
              {t("disconnect")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("disconnectConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("disconnectConfirmDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onDisconnect(channel.id)}
              >
                {t("disconnect")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
