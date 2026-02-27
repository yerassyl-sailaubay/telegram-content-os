"use client";

import { formatDistanceToNow } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pencil, Trash2, FileText } from "lucide-react";
import type { ContentItem } from "@/server/actions/content";
import { useTranslations } from "next-intl";

type ContentCardProps = {
  item: ContentItem;
  onEdit: (item: ContentItem) => void;
  onDelete: (item: ContentItem) => void;
};

export function ContentCard({ item, onEdit, onDelete }: ContentCardProps) {
  const t = useTranslations("content");

  const tags = Array.isArray(item.tags) ? (item.tags as string[]) : [];

  return (
    <Card className="group flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <CardTitle className="line-clamp-1 text-base">
              {item.title || "Untitled"}
            </CardTitle>
          </div>
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(item)}
              aria-label={t("editContent")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(item)}
              aria-label={t("deleteContent")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {item.content || ""}
        </p>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2 pt-0">
        <div className="flex flex-wrap gap-1.5">
          {item.category && (
            <Badge variant="secondary">{item.category}</Badge>
          )}
          {item.isTemplate && (
            <Badge variant="outline">{t("template")}</Badge>
          )}
          {tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{tags.length - 3}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("updated")}{" "}
          {item.updatedAt
            ? formatDistanceToNow(new Date(item.updatedAt))
            : "—"}
        </p>
      </CardFooter>
    </Card>
  );
}
