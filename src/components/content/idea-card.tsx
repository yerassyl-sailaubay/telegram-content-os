"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Sparkles, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/date-utils";
import { developIdea } from "@/server/actions/develop-idea";

interface IdeaCardProps {
  id: string;
  text: string;
  createdAt: Date | string;
  onDevelop?: () => void;
  className?: string;
}

export function IdeaCard({ id, text, createdAt, onDevelop, className }: IdeaCardProps) {
  const t = useTranslations("ideaCard");
  const [isPending, startTransition] = useTransition();

  const preview = text.length > 100 ? `${text.slice(0, 100).trimEnd()}…` : text;

  const handleDevelop = () => {
    startTransition(async () => {
      const result = await developIdea(id);

      if (result.success) {
        toast.info(t("developingToast"));
        onDevelop?.();
      } else {
        toast.error(result.error);
      }
    });
  };

  const relativeTime =
    createdAt instanceof Date
      ? formatDistanceToNow(createdAt)
      : formatDistanceToNow(new Date(createdAt));

  return (
    <Card
      data-testid="idea-card"
      className={cn("group flex flex-col gap-0 overflow-hidden py-0", className)}
    >
      <CardHeader className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
          <Badge variant="secondary" className="text-xs capitalize" data-testid="idea-card-badge">
            {t("badge")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 px-4 pb-2">
        <p data-testid="idea-card-text" className="text-foreground text-sm leading-relaxed">
          {preview}
        </p>
      </CardContent>

      <CardFooter className="mt-2 flex items-center justify-between gap-3 border-t px-4 py-3">
        <time
          data-testid="idea-card-date"
          className="text-muted-foreground text-xs tabular-nums"
          title={
            createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString()
          }
        >
          {relativeTime}
        </time>

        <Button
          size="sm"
          variant="outline"
          data-testid="idea-card-develop-btn"
          disabled={isPending}
          onClick={handleDevelop}
          className="shrink-0 gap-1.5"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {isPending ? t("developing") : t("develop")}
        </Button>
      </CardFooter>
    </Card>
  );
}
