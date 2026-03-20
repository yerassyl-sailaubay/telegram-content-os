/**
 * Quota enforcement layer — wraps usage checks with structured error types.
 *
 * `enforceQuota(userId)` returns a discriminated union result.
 * `withQuotaCheck(userId, action)` throws a `QuotaExceededError` if the
 * user is over their monthly cross-post limit, otherwise executes `action`.
 */

import { canCrossPost, getRemainingQuota } from "./usage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuotaCheckResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "quota_exceeded";
      used: number;
      limit: number;
      upgradeUrl: "/dashboard/billing";
    };

export class QuotaExceededError extends Error {
  readonly used: number;
  readonly limit: number;
  readonly upgradeUrl: string;

  constructor(used: number, limit: number) {
    super(`Monthly cross-post quota exceeded: ${used}/${limit}. Upgrade at /dashboard/billing`);
    this.name = "QuotaExceededError";
    this.used = used;
    this.limit = limit;
    this.upgradeUrl = "/dashboard/billing";
  }
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Check if a user is allowed to create another cross-post this month.
 * Returns a discriminated-union result — never throws.
 */
export async function enforceQuota(userId: string): Promise<QuotaCheckResult> {
  const allowed = await canCrossPost(userId);

  if (allowed) {
    return { allowed: true };
  }

  const quota = await getRemainingQuota(userId);

  return {
    allowed: false,
    reason: "quota_exceeded",
    used: quota.used,
    limit: quota.limit,
    upgradeUrl: "/dashboard/billing",
  };
}

/**
 * Execute `action` only when the user is within their monthly quota.
 * Throws `QuotaExceededError` if the quota is exceeded.
 */
export async function withQuotaCheck<T>(userId: string, action: () => Promise<T>): Promise<T> {
  const result = await enforceQuota(userId);

  if (!result.allowed) {
    throw new QuotaExceededError(result.used, result.limit);
  }

  return action();
}
