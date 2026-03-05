"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MediaGrid } from "@/components/media/media-grid";
import { MediaUpload } from "@/components/media/media-upload";
import {
  uploadMedia,
  deleteMedia,
  listMedia,
  getMediaUrl,
} from "@/server/actions/media";
import type { MediaFile } from "@/server/actions/media";
import type { FileCategory } from "@/lib/storage/client";
import { PageHeader } from "@/components/layout/page-header";

export function MediaLibraryClient() {
  const t = useTranslations("media");
  const [files, setFiles] = React.useState<MediaFile[]>([]);
  const [signedUrls, setSignedUrls] = React.useState<Record<string, string>>(
    {},
  );
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [deletingIds, setDeletingIds] = React.useState<Set<string>>(new Set());
  const [filter, setFilter] = React.useState<FileCategory>("all");

  const loadFiles = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listMedia(filter);
      if (result.success) {
        setFiles(result.data);
        const urls: Record<string, string> = {};
        await Promise.all(
          result.data.map(async (file) => {
            const urlResult = await getMediaUrl(file.id);
            if (urlResult.success) {
              urls[file.id] = urlResult.data;
            }
          }),
        );
        setSignedUrls(urls);
      }
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  React.useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (newFiles: File[]) => {
    setIsUploading(true);
    try {
      for (const file of newFiles) {
        const formData = new FormData();
        formData.set("file", file);
        await uploadMedia(formData);
      }
      await loadFiles();
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const result = await deleteMedia(id);
      if (result.success) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
        setSignedUrls((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const filterButtons: { label: string; value: FileCategory }[] = [
    { label: t("filterAll"), value: "all" },
    { label: t("filterImages"), value: "images" },
    { label: t("filterVideos"), value: "videos" },
  ];

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <span className="text-sm text-muted-foreground">
            {t("itemCount", { count: files.length })}
          </span>
        }
      />

      <MediaUpload onUpload={handleUpload} isUploading={isUploading} />

      <div className="flex gap-2">
        {filterButtons.map((btn) => (
          <Button
            key={btn.value}
            variant={filter === btn.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(btn.value)}
          >
            {btn.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square rounded-lg bg-muted" />
              <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
              <div className="mt-1 h-3 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <MediaGrid
          files={files}
          signedUrls={signedUrls}
          onDelete={handleDelete}
          deletingIds={deletingIds}
          activeFilter={filter}
        />
      )}
    </>
  );
}
