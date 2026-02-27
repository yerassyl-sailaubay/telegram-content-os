"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { mediaFiles } from "@/server/db/schema";
import {
  uploadFile,
  deleteFile,
  getSignedUrl,
  buildStoragePath,
  isAllowedMimeType,
  isFileSizeValid,
  type FileCategory,
  MIME_TYPE_CATEGORIES,
} from "@/lib/storage/client";
import { eq, and, desc, inArray } from "drizzle-orm";

export type MediaFile = typeof mediaFiles.$inferSelect;

export type MediaActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return { supabase, user };
}

export async function uploadMedia(
  formData: FormData,
): Promise<MediaActionResult<MediaFile>> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    if (!isAllowedMimeType(file.type)) {
      return {
        success: false,
        error: `File type "${file.type}" is not allowed. Allowed types: images (jpg, png, gif, webp) and videos (mp4, webm).`,
      };
    }

    if (!isFileSizeValid(file.size)) {
      return {
        success: false,
        error: "File size must be between 0 and 50MB.",
      };
    }

    const storagePath = buildStoragePath(user.id, file.name);

    await uploadFile(supabase, storagePath, file, file.type);

    const [record] = await db
      .insert(mediaFiles)
      .values({
        userId: user.id,
        storagePath,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      })
      .returning();

    return { success: true, data: record };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload failed";
    return { success: false, error: message };
  }
}

export async function deleteMedia(
  mediaId: string,
): Promise<MediaActionResult> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    const [record] = await db
      .select()
      .from(mediaFiles)
      .where(and(eq(mediaFiles.id, mediaId), eq(mediaFiles.userId, user.id)))
      .limit(1);

    if (!record) {
      return { success: false, error: "Media file not found" };
    }

    await deleteFile(supabase, record.storagePath);

    await db
      .delete(mediaFiles)
      .where(and(eq(mediaFiles.id, mediaId), eq(mediaFiles.userId, user.id)));

    return { success: true, data: undefined };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Delete failed";
    return { success: false, error: message };
  }
}

export async function listMedia(
  category: FileCategory = "all",
): Promise<MediaActionResult<MediaFile[]>> {
  try {
    const { user } = await getAuthenticatedUser();

    let query = db
      .select()
      .from(mediaFiles)
      .where(eq(mediaFiles.userId, user.id))
      .orderBy(desc(mediaFiles.createdAt));

    if (category !== "all") {
      const allowedTypes = MIME_TYPE_CATEGORIES[category] as string[];
      query = db
        .select()
        .from(mediaFiles)
        .where(
          and(
            eq(mediaFiles.userId, user.id),
            inArray(mediaFiles.mimeType, allowedTypes),
          ),
        )
        .orderBy(desc(mediaFiles.createdAt));
    }

    const records = await query;

    return { success: true, data: records };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list media";
    return { success: false, error: message };
  }
}

export async function getMediaUrl(
  mediaId: string,
): Promise<MediaActionResult<string>> {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    const [record] = await db
      .select()
      .from(mediaFiles)
      .where(and(eq(mediaFiles.id, mediaId), eq(mediaFiles.userId, user.id)))
      .limit(1);

    if (!record) {
      return { success: false, error: "Media file not found" };
    }

    const url = await getSignedUrl(supabase, record.storagePath);

    return { success: true, data: url };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get URL";
    return { success: false, error: message };
  }
}
