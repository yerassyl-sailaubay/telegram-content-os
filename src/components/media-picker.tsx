"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MediaGrid } from "@/components/media/media-grid";
import { MediaUpload } from "@/components/media/media-upload";
import { uploadMedia, listMedia, getMediaUrl } from "@/server/actions/media";
import type { MediaFile } from "@/server/actions/media";
import type { FileCategory } from "@/lib/storage/client";

type MediaPickerProps = {
  onSelect: (file: MediaFile, signedUrl: string) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function MediaPicker({
  onSelect,
  trigger,
  open,
  onOpenChange,
}: MediaPickerProps) {
  const t = useTranslations("media");
  const [files, setFiles] = React.useState<MediaFile[]>([]);
  const [signedUrls, setSignedUrls] = React.useState<Record<string, string>>(
    {},
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [filter, setFilter] = React.useState<FileCategory>("all");

  const loadFiles = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listMedia(filter);
      if (result.success) {
        setFiles(result.data);
        // Fetch signed URLs for all files
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

  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        loadFiles();
      }
      onOpenChange?.(isOpen);
    },
    [loadFiles, onOpenChange],
  );

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

  const handleSelect = async (file: MediaFile) => {
    const url = signedUrls[file.id];
    if (url) {
      onSelect(file, url);
      onOpenChange?.(false);
    } else {
      const urlResult = await getMediaUrl(file.id);
      if (urlResult.success) {
        onSelect(file, urlResult.data);
        onOpenChange?.(false);
      }
    }
  };

  const filterButtons: { label: string; value: FileCategory }[] = [
    { label: t("filterAll"), value: "all" },
    { label: t("filterImages"), value: "images" },
    { label: t("filterVideos"), value: "videos" },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("pickerTitle")}</DialogTitle>
          <DialogDescription>{t("pickerDescription")}</DialogDescription>
        </DialogHeader>

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
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("uploading")}</p>
          </div>
        ) : (
          <MediaGrid
            files={files}
            signedUrls={signedUrls}
            onSelect={handleSelect}
            selectable
            activeFilter={filter}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
