"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDistanceToNow } from "@/lib/date-utils";
import { type ContentItem, updateContentStatus } from "@/server/actions/content";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Send, Archive, Search, Settings2 } from "lucide-react";

import { StatusBadge, SourceIndicator } from "@/components/content/content-card";

type ContentTableProps = {
  data: ContentItem[];
  onArchived?: (id: string) => void;
  onEdit?: (item: ContentItem) => void;
};

type ColumnKey = "content" | "status" | "source" | "date";

export function ContentTable({ data, onArchived, onEdit }: ContentTableProps) {
  const t = useTranslations("content");

  // State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [visibleColumns, setVisibleColumns] = React.useState<Record<ColumnKey, boolean>>({
    content: true, // Default visible per user request
    status: true,
    source: true,
    date: true,
  });
  const [archivingIds, setArchivingIds] = React.useState<Set<string>>(new Set());

  // Derived filtered data
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((item) => {
      const titleMatch = item.title?.toLowerCase().includes(query) ?? false;
      const contentMatch = item.content?.toLowerCase().includes(query) ?? false;
      return titleMatch || contentMatch;
    });
  }, [data, searchQuery]);

  async function handleArchive(id: string) {
    if (archivingIds.has(id)) return;

    setArchivingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    try {
      const result = await updateContentStatus(id, "archived");
      if (result.success) {
        toast.success(t("archiveSuccess"));
        onArchived?.(id);
      } else {
        toast.error(t("archiveError"));
      }
    } finally {
      setArchivingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  const toggleColumn = (col: ColumnKey) => {
    setVisibleColumns((prev) => ({ ...prev, [col]: !prev[col] }));
  };

  return (
    <div className="space-y-4" data-testid="content-table-wrapper" data-tour="content-table">
      <div className="flex items-center justify-between" data-tour="content-search">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <DropdownMenu data-tour="bulk-actions">
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto hidden h-9 md:flex">
              <Settings2 className="mr-2 h-4 w-4" />
              {t("tableToggleColumns")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[150px]">
            <DropdownMenuCheckboxItem
              checked={visibleColumns.content}
              onCheckedChange={() => toggleColumn("content")}
            >
              {t("tableColumns.content")}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.status}
              onCheckedChange={() => toggleColumn("status")}
            >
              {t("tableColumns.status")}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.source}
              onCheckedChange={() => toggleColumn("source")}
            >
              {t("tableColumns.source")}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.date}
              onCheckedChange={() => toggleColumn("date")}
            >
              {t("tableColumns.date")}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="border-border/50 bg-card overflow-hidden rounded-xl border shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[15%] md:w-[25%]">{t("tableColumns.title")}</TableHead>
              {visibleColumns.content && (
                <TableHead className="hidden md:table-cell">{t("tableColumns.content")}</TableHead>
              )}
              {visibleColumns.status && (
                <TableHead className="w-[100px]">{t("tableColumns.status")}</TableHead>
              )}
              {visibleColumns.source && (
                <TableHead className="hidden sm:table-cell">{t("tableColumns.source")}</TableHead>
              )}
              {visibleColumns.date && (
                <TableHead className="hidden text-right lg:table-cell">
                  {t("tableColumns.date")}
                </TableHead>
              )}
              <TableHead className="w-[50px] text-right">{t("tableActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  {t("noSearchResults")}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => {
                const title =
                  item.title?.trim() ||
                  (item.content
                    ? item.content.slice(0, 60).replace(/\n/g, " ") + "…"
                    : t("noTitle"));
                const preview = item.content
                  ? item.content.slice(0, 250).replace(/\n+/g, " ") +
                    (item.content.length > 250 ? "…" : "")
                  : "—";

                return (
                  <TableRow key={item.id} className="group">
                    <TableCell className="align-top font-medium">
                      <div className="line-clamp-2 max-w-[180px] pr-2 sm:max-w-[200px] md:max-w-[15rem] lg:max-w-[18rem] xl:max-w-[22rem]">
                        {title}
                      </div>
                      {/* On mobile, if source/status are hidden by CSS classes, show them below the title */}
                      <div className="mt-2 flex items-center gap-2 sm:hidden">
                        <StatusBadge status={item.status} />
                        <SourceIndicator sourceType={item.sourceType} />
                      </div>
                    </TableCell>

                    {visibleColumns.content && (
                      <TableCell className="text-muted-foreground hidden align-top text-xs md:table-cell">
                        <div className="line-clamp-2 max-w-[15rem] pr-4 lg:max-w-[22rem] xl:max-w-[30rem]">
                          {preview}
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.status && (
                      <TableCell className="align-top">
                        <StatusBadge status={item.status} />
                      </TableCell>
                    )}

                    {visibleColumns.source && (
                      <TableCell className="hidden align-top sm:table-cell">
                        <SourceIndicator sourceType={item.sourceType} />
                      </TableCell>
                    )}

                    {visibleColumns.date && (
                      <TableCell className="text-muted-foreground hidden text-right align-top text-xs whitespace-nowrap lg:table-cell">
                        {item.createdAt ? formatDistanceToNow(new Date(item.createdAt)) : "—"}
                      </TableCell>
                    )}

                    <TableCell className="text-right align-top">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEdit ? (
                            <DropdownMenuItem onClick={() => onEdit(item)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("actionEdit")}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/posts/${item.id}/edit`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t("actionEdit")}
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/telegram-post?contentId=${item.id}`}>
                              <Send className="mr-2 h-4 w-4" />
                              {t("actionPublishTelegram")}
                            </Link>
                          </DropdownMenuItem>
                          {item.status !== "archived" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleArchive(item.id)}
                                disabled={archivingIds.has(item.id)}
                              >
                                <Archive className="mr-2 h-4 w-4" />
                                {t("actionArchive")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
