"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Lightbulb, SendHorizonal } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createContentItem } from "@/server/actions/content";

export function QuickCapture({ onSaved }: { onSaved?: () => void }) {
  const t = useTranslations("quickCapture");
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = text.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await createContentItem({
        title: trimmed.slice(0, 100),
        content: trimmed,
        sourceType: "idea",
        status: "draft",
      });

      if (result.success) {
        setText("");
        toast.success(t("savedToast"));
        onSaved?.();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} data-testid="quick-capture" className="flex flex-col gap-2">
      <div className="relative">
        <Lightbulb
          className={cn(
            "absolute top-3 left-3 h-4 w-4 transition-colors",
            text.trim() ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground",
          )}
        />
        <Textarea
          data-testid="quick-capture-textarea"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("placeholder")}
          disabled={isPending}
          className="resize-none pr-10 pl-9"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {text.trim() ? t("hintSubmit") : t("hintEmpty")}
        </p>
        <Button
          type="submit"
          size="sm"
          data-testid="quick-capture-submit"
          disabled={isPending || !text.trim()}
          className="shrink-0 gap-1.5 bg-slate-800 text-white hover:bg-slate-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:bg-slate-300 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <SendHorizonal className="h-3.5 w-3.5" />
          )}
          {isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
