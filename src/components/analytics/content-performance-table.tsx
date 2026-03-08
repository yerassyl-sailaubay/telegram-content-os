"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PostPerformance } from "@/lib/analytics/telegram-enhanced";

type SortKey = "views" | "totalReactions" | "forwards" | "postedAt";
type SortDir = "asc" | "desc";

type ContentPerformanceTableProps = {
  posts: PostPerformance[];
};

function SortIcon({
  column,
  activeColumn,
  direction,
}: {
  column: SortKey;
  activeColumn: SortKey;
  direction: SortDir;
}) {
  if (column !== activeColumn) {
    return <ChevronsUpDown className="text-muted-foreground/50 h-3.5 w-3.5" />;
  }
  if (direction === "asc") {
    return <ChevronUp className="text-foreground h-3.5 w-3.5" />;
  }
  return <ChevronDown className="text-foreground h-3.5 w-3.5" />;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateContent(content: string | null, maxLen = 80): string {
  if (!content) return "—";
  if (content.length <= maxLen) return content;
  return content.slice(0, maxLen).trimEnd() + "…";
}

export function ContentPerformanceTable({ posts }: ContentPerformanceTableProps) {
  const t = useTranslations("analytics");
  const [sortKey, setSortKey] = React.useState<SortKey>("views");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...posts].sort((a, b) => {
    let aVal: number | Date | null;
    let bVal: number | Date | null;

    if (sortKey === "postedAt") {
      aVal = a.postedAt;
      bVal = b.postedAt;
      const aTime = aVal ? new Date(aVal).getTime() : 0;
      const bTime = bVal ? new Date(bVal).getTime() : 0;
      return sortDir === "asc" ? aTime - bTime : bTime - aTime;
    }

    aVal = a[sortKey];
    bVal = b[sortKey];
    return sortDir === "asc"
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const isEmpty = posts.length === 0;

  const columns: { key: SortKey; label: string }[] = [
    { key: "views", label: t("tableViews") },
    { key: "totalReactions", label: t("tableReactions") },
    { key: "forwards", label: t("tableForwards") },
    { key: "postedAt", label: t("tableDate") },
  ];

  return (
    <Card data-testid="content-performance-table" className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{t("contentPerformance")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isEmpty ? (
          <div className="flex h-[200px] items-center justify-center p-6 text-center">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">{t("noDataYet")}</p>
              <p className="text-muted-foreground text-xs">{t("noDataDescription")}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                    {t("tableContent")}
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="text-muted-foreground px-4 py-3 text-right font-medium"
                    >
                      <button
                        onClick={() => handleSort(col.key)}
                        className={cn(
                          "hover:text-foreground inline-flex items-center gap-1 rounded transition-colors",
                          sortKey === col.key && "text-foreground",
                        )}
                      >
                        {col.label}
                        <SortIcon column={col.key} activeColumn={sortKey} direction={sortDir} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((post, i) => (
                  <tr
                    key={post.id}
                    className={cn(
                      "hover:bg-muted/50 transition-colors",
                      i !== sorted.length - 1 && "border-b",
                    )}
                  >
                    <td className="max-w-[260px] px-4 py-3 text-left">
                      <span
                        className="text-foreground/80 block truncate text-xs"
                        title={post.content ?? undefined}
                      >
                        {truncateContent(post.content)}
                      </span>
                    </td>
                    <td className="text-foreground px-4 py-3 text-right tabular-nums">
                      {post.views.toLocaleString()}
                    </td>
                    <td className="text-foreground px-4 py-3 text-right tabular-nums">
                      {post.totalReactions.toLocaleString()}
                    </td>
                    <td className="text-foreground px-4 py-3 text-right tabular-nums">
                      {post.forwards.toLocaleString()}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right text-xs">
                      {formatDate(post.postedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
