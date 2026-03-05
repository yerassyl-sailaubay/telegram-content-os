import { db } from "@/server/db";
import { usageTracking } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { PLANS } from "./plans";
import { getCurrentMonth, getUserTier } from "./usage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AiQuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  tier: string;
}

export type AiQuotaCheckResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "ai_quota_exceeded";
      used: number;
      limit: number;
      upgradeUrl: "/dashboard/billing";
    };

export class AiQuotaExceededError extends Error {
  readonly used: number;
  readonly limit: number;
  readonly upgradeUrl: string;

  constructor(used: number, limit: number) {
    super(`Monthly AI quota exceeded: ${used}/${limit}. Upgrade at /dashboard/billing`);
    this.name = "AiQuotaExceededError";
    this.used = used;
    this.limit = limit;
    this.upgradeUrl = "/dashboard/billing";
  }
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

export async function getCurrentAiUsage(userId: string): Promise<number> {
  const month = getCurrentMonth();

  const rows = await db
    .select({ aiCallsCount: usageTracking.aiCallsCount })
    .from(usageTracking)
    .where(and(eq(usageTracking.userId, userId), eq(usageTracking.month, month)))
    .limit(1);

  if (rows.length === 0) {
    return 0;
  }

  return rows[0]!.aiCallsCount ?? 0;
}

export async function canGenerateAi(userId: string): Promise<boolean> {
  const tier = await getUserTier(userId);
  const limit = PLANS[tier].limits.aiCallsPerMonth;

  if (!isFinite(limit)) {
    return true;
  }

  const used = await getCurrentAiUsage(userId);
  return used < limit;
}

export async function getRemainingAiQuota(userId: string): Promise<AiQuotaInfo> {
  const tier = await getUserTier(userId);
  const limit = PLANS[tier].limits.aiCallsPerMonth;
  const used = await getCurrentAiUsage(userId);

  const remaining = isFinite(limit) ? Math.max(0, limit - used) : Infinity;

  return { used, limit, remaining, tier };
}

export async function enforceAiQuota(userId: string): Promise<AiQuotaCheckResult> {
  const allowed = await canGenerateAi(userId);

  if (allowed) {
    return { allowed: true };
  }

  const quota = await getRemainingAiQuota(userId);

  return {
    allowed: false,
    reason: "ai_quota_exceeded",
    used: quota.used,
    limit: quota.limit,
    upgradeUrl: "/dashboard/billing",
  };
}

export async function incrementAiUsage(userId: string): Promise<void> {
  const month = getCurrentMonth();

  const existing = await db
    .select({ id: usageTracking.id, aiCallsCount: usageTracking.aiCallsCount })
    .from(usageTracking)
    .where(and(eq(usageTracking.userId, userId), eq(usageTracking.month, month)))
    .limit(1);

  if (existing.length > 0) {
    const current = existing[0]!.aiCallsCount ?? 0;
    await db
      .update(usageTracking)
      .set({
        aiCallsCount: current + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(usageTracking.userId, userId), eq(usageTracking.month, month)));
  } else {
    await db.insert(usageTracking).values({
      userId,
      month,
      crossPostsCount: 0,
      aiCallsCount: 1,
    });
  }
}

export async function withAiQuotaCheck<T>(userId: string, action: () => Promise<T>): Promise<T> {
  const result = await enforceAiQuota(userId);

  if (!result.allowed) {
    throw new AiQuotaExceededError(result.used, result.limit);
  }

  return action();
}
