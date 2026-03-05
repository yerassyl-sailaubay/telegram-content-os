"use client";

import * as React from "react";
import { formatDistanceToNow } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Pencil,
  Send,
  Archive,
  Sparkles,
  FileText,
  Lightbulb,
  Bot,
  RefreshCw,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateContentStatus, type ContentItem } from "@/server/actions/content";

// ─── Status Badge ─────────────────────────────────────────────────────────────

type StatusBadgeProps = {
  status: string | null;
  className?: string;
};

function StatusBadge({ status, className }: StatusBadgeProps) {
  const t = useTranslations("content");

  const config: Record<string, { label: string; className: string }> = {
    draft: {
      label: t("statusDraft"),
      className:
        "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    },
    published: {
      label: t("statusPublished"),
      className:
        "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    },
    archived: {
      label: t("statusArchived"),
      className:
        "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
    },
    scheduled: {
      label: t("statusScheduled"),
      className:
        "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    },
  };

  const cfg = config[status ?? "draft"] ?? config.draft;

  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium", cfg.className, className)}>
      {cfg.label}
    </Badge>
  );
}

// ─── Source Type Indicator ────────────────────────────────────────────────────

type SourceIndicatorProps = {
  sourceType: string | null;
};

function SourceIndicator({ sourceType }: SourceIndicatorProps) {
  const t = useTranslations("content");

  const config: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    idea: {
      label: t("sourceIdea"),
      icon: Lightbulb,
      className: "text-purple-500",
    },
    telegram_import: {
      label: t("sourceTelegramImport"),
      icon: MessageSquare,
      className: "text-sky-500",
    },
    repurposed: {
      label: t("sourceRepurposed"),
      icon: RefreshCw,
      className: "text-orange-500",
    },
    external_source: {
      label: t("sourceExternalSource"),
      icon: ExternalLink,
      className: "text-indigo-500",
    },
    ai_generated: {
      label: t("sourceAiGenerated"),
      icon: Bot,
      className: "text-emerald-500",
    },
  };

  if (!sourceType) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px]">
        <FileText className="h-3 w-3" />
        {t("statusDraft")}
      </span>
    );
  }

  const cfg = config[sourceType];
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium", cfg.className)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ─── Content Card ─────────────────────────────────────────────────────────────

type ContentCardProps = {
  item: ContentItem;
  onArchived?: (id: string) => void;
  onEdit?: (item: ContentItem) => void;
};

export function ContentCard({ item, onArchived, onEdit }: ContentCardProps) {
  const t = useTranslations("content");
  const [isArchiving, setIsArchiving] = React.useState(false);

  const title =
    item.title?.trim() ||
    (item.content ? item.content.slice(0, 60).replace(/\n/g, " ") + "…" : t("noTitle"));

  const preview = item.content
    ? item.content.slice(0, 120).replace(/\n+/g, " ") + (item.content.length > 120 ? "…" : "")
    : null;

  async function handleArchive() {
    if (isArchiving) return;
    setIsArchiving(true);
    try {
      const result = await updateContentStatus(item.id, "archived");
      if (result.success) {
        toast.success(t("archiveSuccess"));
        onArchived?.(item.id);
      } else {
        toast.error(t("archiveError"));
      }
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <Card
      className="group flex flex-col gap-0 py-0 transition-shadow hover:shadow-md"
      data-testid="content-card"
    >
      <CardHeader className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-sm leading-snug font-medium">{title}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                aria-label="Actions"
                data-testid="content-card-actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onEdit ? (
                <DropdownMenuItem onClick={() => onEdit(item)} data-testid="action-edit">
                  <Pencil className="h-4 w-4" />
                  {t("actionEdit")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild data-testid="action-edit">
                  <Link href={`/dashboard/posts/${item.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                    {t("actionEdit")}
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem data-testid="action-repurpose" disabled>
                <Sparkles className="h-4 w-4" />
                {t("actionRepurpose")}
              </DropdownMenuItem>
              <DropdownMenuItem asChild data-testid="action-publish-telegram">
                <Link href={`/dashboard/telegramPost?contentId=${item.id}`}>
                  <Send className="h-4 w-4" />
                  {t("actionPublishTelegram")}
                </Link>
              </DropdownMenuItem>
              {item.status !== "archived" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleArchive}
                    disabled={isArchiving}
                    data-testid="action-archive"
                  >
                    <Archive className="h-4 w-4" />
                    {t("actionArchive")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex-1 px-4 pb-3">
        {preview && <p className="text-muted-foreground line-clamp-2 text-xs">{preview}</p>}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 px-4 pt-0 pb-4">
        <div className="flex min-w-0 items-center gap-2">
          <StatusBadge status={item.status} />
          <SourceIndicator sourceType={item.sourceType} />
        </div>
        <time
          className="text-muted-foreground shrink-0 text-[10px]"
          dateTime={item.createdAt?.toISOString()}
        >
          {item.createdAt ? formatDistanceToNow(new Date(item.createdAt)) : "—"}
        </time>
      </CardFooter>
    </Card>
  );
}
