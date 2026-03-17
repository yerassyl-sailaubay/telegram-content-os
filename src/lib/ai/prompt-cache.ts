import { createHash } from "crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { aiPromptCache } from "@/server/db/schema";

export type PromptCacheFeature = "calendar_fill" | "channel_profile_incremental";

interface ReadPromptCacheInput {
  userId: string;
  feature: PromptCacheFeature;
  cacheKey: string;
}

interface WritePromptCacheInput<T> {
  userId: string;
  feature: PromptCacheFeature;
  cacheKey: string;
  modelId?: string;
  response: T;
  ttlSeconds: number;
}

export function createPromptCacheKey(payload: unknown): string {
  const normalized = JSON.stringify(payload);
  return createHash("sha256").update(normalized).digest("hex");
}

export async function readPromptCache<T>(input: ReadPromptCacheInput): Promise<T | null> {
  try {
    const now = new Date();
    const rows = await db
      .select({
        id: aiPromptCache.id,
        response: aiPromptCache.response,
      })
      .from(aiPromptCache)
      .where(
        and(
          eq(aiPromptCache.userId, input.userId),
          eq(aiPromptCache.feature, input.feature),
          eq(aiPromptCache.cacheKey, input.cacheKey),
          gt(aiPromptCache.expiresAt, now),
        ),
      )
      .limit(1);

    const cached = rows[0];
    if (!cached) return null;

    await db
      .update(aiPromptCache)
      .set({
        hitCount: sql`${aiPromptCache.hitCount} + 1`,
        lastHitAt: now,
        updatedAt: now,
      })
      .where(eq(aiPromptCache.id, cached.id));

    return cached.response as T;
  } catch (error) {
    console.warn("Failed to read AI prompt cache", error);
    return null;
  }
}

export async function writePromptCache<T>(input: WritePromptCacheInput<T>): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.ttlSeconds * 1000);

    await db
      .insert(aiPromptCache)
      .values({
        userId: input.userId,
        feature: input.feature,
        cacheKey: input.cacheKey,
        modelId: input.modelId ?? null,
        response: input.response as object,
        expiresAt,
        hitCount: 0,
        lastHitAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [aiPromptCache.userId, aiPromptCache.feature, aiPromptCache.cacheKey],
        set: {
          modelId: input.modelId ?? null,
          response: input.response as object,
          expiresAt,
          updatedAt: now,
        },
      });
  } catch (error) {
    console.warn("Failed to write AI prompt cache", error);
  }
}
