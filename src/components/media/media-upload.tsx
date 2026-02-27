"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { MAX_FILE_SIZE } from "@/lib/storage/client";

type MediaUploadProps = {
  onUpload: (files: File[]) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  className?: string;
};

export function MediaUpload({
  onUpload,
  isUploading = false,
  uploadProgress = 0,
  className,
}: MediaUploadProps) {
  const t = useTranslations("media");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles);
      }
    },
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
      "video/mp4": [".mp4"],
      "video/webm": [".webm"],
    },
    maxSize: MAX_FILE_SIZE,
    disabled: isUploading,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
        isUploading && "pointer-events-none opacity-60",
        className,
      )}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-3">
        {isUploading ? (
          <>
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-medium">{t("uploading")}</p>
            {uploadProgress > 0 && (
              <Progress value={uploadProgress} className="mx-auto w-48" />
            )}
          </>
        ) : (
          <>
            <Upload className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {isDragActive ? t("dragActive") : t("dragDrop")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("supportedFormats")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
