"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaCard } from "./media-card";
import type { MediaFile } from "@/server/actions/media";
import type { FileCategory } from "@/lib/storage/client";

type MediaGridProps = {
  files: MediaFile[];
  signedUrls: Record<string, string>;
  onDelete?: (id: string) => void;
  onSelect?: (file: MediaFile) => void;
  deletingIds?: Set<string>;
  selectable?: boolean;
  activeFilter?: FileCategory;
  className?: string;
};

export function MediaGrid({
  files,
  signedUrls,
  onDelete,
  onSelect,
  deletingIds = new Set(),
  selectable = false,
  activeFilter = "all",
  className,
}: MediaGridProps) {
  const t = useTranslations("media");

  if (files.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8">
        <ImageIcon className="text-muted-foreground size-12" />
        <div className="text-center">
          <p className="text-sm font-medium">
            {activeFilter === "all" ? t("noMedia") : t("noFilterResults")}
          </p>
          <p className="text-muted-foreground text-xs">
            {activeFilter === "all" ? t("noMediaDescription") : t("noFilterResultsDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
        className,
      )}
    >
      {files.map((file) => (
        <MediaCard
          key={file.id}
          file={file}
          signedUrl={signedUrls[file.id]}
          onDelete={onDelete}
          onSelect={onSelect}
          isDeleting={deletingIds.has(file.id)}
          selectable={selectable}
        />
      ))}
    </div>
  );
}
