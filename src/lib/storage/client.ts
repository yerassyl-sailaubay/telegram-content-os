import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET_NAME = "media";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
] as const;

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export type FileCategory = "images" | "videos" | "all";

const MIME_TYPE_CATEGORIES: Record<FileCategory, readonly string[]> = {
  images: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  videos: ["video/mp4", "video/webm"],
  all: [...ALLOWED_MIME_TYPES],
};

export function isAllowedMimeType(
  mimeType: string,
): mimeType is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function getMimeTypeCategory(mimeType: string): FileCategory {
  if (MIME_TYPE_CATEGORIES.images.includes(mimeType)) return "images";
  if (MIME_TYPE_CATEGORIES.videos.includes(mimeType)) return "videos";
  return "all";
}

export function isFileSizeValid(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_FILE_SIZE;
}

export function buildStoragePath(userId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${timestamp}-${sanitized}`;
}

export async function uploadFile(
  supabase: SupabaseClient,
  storagePath: string,
  file: File | Buffer,
  contentType: string,
): Promise<{ path: string }> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return { path: data.path };
}

export async function deleteFile(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}

export async function getSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresIn = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

export {
  BUCKET_NAME,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  MIME_TYPE_CATEGORIES,
};
