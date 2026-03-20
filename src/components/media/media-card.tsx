"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Trash2, FileVideo, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { MediaFile } from "@/server/actions/media";

type MediaCardProps = {
  file: MediaFile;
  signedUrl?: string;
  onDelete?: (id: string) => void;
  onSelect?: (file: MediaFile) => void;
  isDeleting?: boolean;
  selectable?: boolean;
  className?: string;
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function isImageMimeType(mimeType: string | null): boolean {
  return !!mimeType?.startsWith("image/");
}

function isVideoMimeType(mimeType: string | null): boolean {
  return !!mimeType?.startsWith("video/");
}

export function MediaCard({
  file,
  signedUrl,
  onDelete,
  onSelect,
  isDeleting = false,
  selectable = false,
  className,
}: MediaCardProps) {
  const t = useTranslations("media");
  const tCommon = useTranslations("common");

  return (
    <div
      className={cn(
        "group bg-card relative overflow-hidden rounded-lg border transition-all hover:shadow-md",
        selectable && "hover:ring-primary cursor-pointer hover:ring-2",
        className,
      )}
      onClick={selectable && onSelect ? () => onSelect(file) : undefined}
    >
      {/* Thumbnail preview */}
      <div className="bg-muted relative aspect-square overflow-hidden">
        {signedUrl && isImageMimeType(file.mimeType) ? (
          <Image
            src={signedUrl}
            alt={file.filename}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : signedUrl && isVideoMimeType(file.mimeType) ? (
          <div className="flex h-full items-center justify-center">
            <FileVideo className="text-muted-foreground size-12" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="text-muted-foreground size-12" />
          </div>
        )}
      </div>

      {/* File info */}
      <div className="p-3">
        <p className="truncate text-sm font-medium">{file.filename}</p>
        <p className="text-muted-foreground text-xs">{formatFileSize(file.sizeBytes)}</p>
      </div>

      {/* Actions overlay */}
      {onDelete && (
        <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="icon-xs"
                onClick={(e) => e.stopPropagation()}
                disabled={isDeleting}
              >
                <Trash2 className="size-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("deleteConfirmDescription")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(file.id);
                  }}
                >
                  {tCommon("delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Select button for picker mode */}
      {selectable && onSelect && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(file);
            }}
          >
            {t("selectFile")}
          </Button>
        </div>
      )}
    </div>
  );
}

export { formatFileSize, isImageMimeType, isVideoMimeType };
