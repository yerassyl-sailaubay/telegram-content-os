"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RecentPostRow } from "@/server/actions/analytics";

type SortKey = "postedAt" | "impressions" | "totalEngagement";
type SortDir = "asc" | "desc";

type PostsTableProps = {
  data: RecentPostRow[];
};

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  twitter: "Twitter / X",
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(text: string | null, len = 80): string {
  if (!text) return "—";
  return text.length > len ? `${text.slice(0, len)}…` : text;
}

type SortIconProps = {
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
};

function SortIcon({ sortKey, currentKey, dir }: SortIconProps) {
  if (sortKey !== currentKey) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
  if (dir === "asc") return <ArrowUp className="ml-1 h-3 w-3" />;
  return <ArrowDown className="ml-1 h-3 w-3" />;
}

export function PostsTable({ data }: PostsTableProps) {
  const t = useTranslations("analytics");

  const [platformFilter, setPlatformFilter] = React.useState("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("postedAt");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = data.filter(
    (row) => platformFilter === "all" || row.platform === platformFilter,
  );

  const sorted = [...filtered].sort((a, b) => {
    let aVal: number;
    let bVal: number;

    if (sortKey === "postedAt") {
      aVal = a.postedAt ? new Date(a.postedAt).getTime() : 0;
      bVal = b.postedAt ? new Date(b.postedAt).getTime() : 0;
    } else if (sortKey === "impressions") {
      aVal = a.impressions ?? 0;
      bVal = b.impressions ?? 0;
    } else {
      aVal = a.totalEngagement;
      bVal = b.totalEngagement;
    }

    return sortDir === "asc" ? aVal - bVal : bVal - aVal;
  });

  const isEmpty = sorted.length === 0;

  return (
    <Card data-testid="posts-table" className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">{t("recentPosts")}</CardTitle>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allPlatforms")}</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="twitter">Twitter / X</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0">
        {isEmpty ? (
          <div className="flex h-[200px] items-center justify-center p-8 text-center">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">{t("noDataYet")}</p>
              <p className="text-muted-foreground text-xs">{t("noDataDescription")}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[280px]">{t("content")}</TableHead>
                  <TableHead>{t("platform")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-8 text-xs font-medium"
                      onClick={() => handleSort("postedAt")}
                    >
                      {t("postedAt")}
                      <SortIcon sortKey="postedAt" currentKey={sortKey} dir={sortDir} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-mr-2 h-8 text-xs font-medium"
                      onClick={() => handleSort("impressions")}
                    >
                      {t("impressions")}
                      <SortIcon sortKey="impressions" currentKey={sortKey} dir={sortDir} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-mr-2 h-8 text-xs font-medium"
                      onClick={() => handleSort("totalEngagement")}
                    >
                      {t("engagement")}
                      <SortIcon sortKey="totalEngagement" currentKey={sortKey} dir={sortDir} />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[280px] py-3">
                      <p className="text-muted-foreground truncate text-xs">
                        {truncate(row.adaptedContent)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          row.platform === "linkedin" &&
                            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                          row.platform === "twitter" &&
                            "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
                        )}
                      >
                        {PLATFORM_LABELS[row.platform] ?? row.platform}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.status === "published" ? "default" : "outline"}
                        className="text-xs capitalize"
                      >
                        {row.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(row.postedAt)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {(row.impressions ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {row.totalEngagement.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
