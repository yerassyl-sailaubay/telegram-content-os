/**
 * Usage tracking service — enforces cross-post quotas per subscription tier.
 *
 * Free:  5 cross-posts / month
 * Plus: 50 cross-posts / month
 * Pro:  Unlimited
 *
 * Uses the `usage_tracking` table (YYYY-MM keyed per user) and the
 * `subscriptions` table for tier lookup.
 */

import { db } from "@/server/db";
import { usageTracking, subscriptions } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { PLANS } from "./plans";
import type { PlanTier } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns current UTC month as "YYYY-MM". */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Look up the user's current plan tier from the subscriptions table. */
export async function getUserTier(userId: string): Promise<PlanTier> {
  const rows = await db
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (rows.length === 0 || !rows[0]!.plan) {
    return "free";
  }

  return rows[0]!.plan as PlanTier;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Get the number of cross-posts the user has made this calendar month.
 * Returns 0 if no usage record exists yet.
 */
export async function getCurrentUsage(userId: string): Promise<number> {
  const month = getCurrentMonth();

  const rows = await db
    .select({ crossPostsCount: usageTracking.crossPostsCount })
    .from(usageTracking)
    .where(
      and(eq(usageTracking.userId, userId), eq(usageTracking.month, month)),
    )
    .limit(1);

  if (rows.length === 0) {
    return 0;
  }

  return rows[0]!.crossPostsCount ?? 0;
}

/**
 * Check whether the user is allowed to create another cross-post this month.
 * Pro tier always returns true. Free/Plus are checked against PLAN_LIMITS.
 */
export async function canCrossPost(userId: string): Promise<boolean> {
  const tier = await getUserTier(userId);
  const limit = PLANS[tier].limits.crossPostsPerMonth;

  // Infinity check — Pro tier is unlimited
  if (!isFinite(limit)) {
    return true;
  }

  const used = await getCurrentUsage(userId);
  return used < limit;
}

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  tier: string;
}

/**
 * Get a breakdown of the user's current quota status.
 * For Pro tier, `limit` is `Infinity` and `remaining` is `Infinity`.
 */
export async function getRemainingQuota(userId: string): Promise<QuotaInfo> {
  const tier = await getUserTier(userId);
  const limit = PLANS[tier].limits.crossPostsPerMonth;
  const used = await getCurrentUsage(userId);

  const remaining = isFinite(limit) ? Math.max(0, limit - used) : Infinity;

  return { used, limit, remaining, tier };
}

/**
 * Increment the user's cross-post count for the current month.
 * Creates the usage record if it doesn't exist (upsert via insert-on-conflict).
 */
export async function incrementUsage(userId: string): Promise<void> {
  const month = getCurrentMonth();

  await db
    .insert(usageTracking)
    .values({
      userId,
      month,
      crossPostsCount: 1,
      aiCallsCount: 0,
    })
    .onConflictDoUpdate({
      target: [usageTracking.userId, usageTracking.month],
      set: {
        crossPostsCount: sql`${usageTracking.crossPostsCount} + 1`,
        updatedAt: new Date(),
      },
    });
}
