"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, gte, ne, or, sql } from "drizzle-orm";
import type { PlanTier, SubscriptionStatus } from "@/lib/billing/types";
import { getAdminAccessMode, getConfiguredAdminEmails, isAdminEmail } from "@/lib/admin/access";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import {
  analyticsSyncLog,
  crossPosts,
  externalSources,
  schedules,
  subscriptions,
  usageTracking,
  users,
} from "@/server/db/schema";

export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

export type AdminOverview = {
  totalUsers: number;
  paidUsers: number;
  pastDueUsers: number;
  crossPostsLast24h: number;
  failedCrossPostsLast24h: number;
  pendingSchedules: number;
  failedSchedulesLast24h: number;
  totalCrossPostsThisMonth: number;
  totalAiCallsThisMonth: number;
};

export type AdminEnvironmentCheck = {
  key: string;
  configured: boolean;
};

export type AdminBillingUser = {
  userId: string;
  email: string;
  name: string | null;
  plan: PlanTier;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  usageMonth: string;
  crossPostsUsed: number;
  aiCallsUsed: number;
  subscriptionUpdatedAt: string | null;
};

export type AdminCrossPostEvent = {
  id: string;
  userEmail: string;
  platform: string;
  status: string;
  contentSnippet: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminScheduleFailure = {
  id: string;
  userEmail: string;
  targetType: string | null;
  platform: string | null;
  scheduledAt: string;
  updatedAt: string | null;
};

export type AdminSourceFailure = {
  id: string;
  userEmail: string;
  sourceType: string;
  sourceUrl: string;
  errorMessage: string | null;
  updatedAt: string | null;
};

export type AdminAnalyticsSyncEvent = {
  id: string;
  userEmail: string;
  platform: string;
  lastSyncedAt: string;
  syncWindowStart: string;
  syncWindowEnd: string;
};

export type AdminConsoleData = {
  access: {
    mode: "restricted" | "open_dev";
    configuredAdmins: string[];
    currentUserEmail: string | null;
  };
  generatedAt: string;
  currentUsageMonth: string;
  overview: AdminOverview;
  envChecks: AdminEnvironmentCheck[];
  billingUsers: AdminBillingUser[];
  crossPostEvents: AdminCrossPostEvent[];
  scheduleFailures: AdminScheduleFailure[];
  sourceFailures: AdminSourceFailure[];
  analyticsSyncEvents: AdminAnalyticsSyncEvent[];
};

export type AdminBillingUpdateInput = {
  userId: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  usageMonth: string;
  crossPostsUsed: number;
  aiCallsUsed: number;
};

type AdminContext = {
  userId: string;
  email: string | null;
  accessMode: "restricted" | "open_dev";
  configuredAdmins: string[];
};

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "OPENROUTER_API_KEY",
  "GEMINI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PLUS_PRICE_ID",
  "STRIPE_PRO_PRICE_ID",
  "NEXT_PUBLIC_APP_URL",
] as const;

function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toIsoString(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

function toNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function isPlanTier(value: string): value is PlanTier {
  return value === "free" || value === "plus" || value === "pro";
}

function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return value === "active" || value === "canceled" || value === "past_due" || value === "trialing";
}

async function requireAdminContext(): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const email = user.email ?? null;
  const configuredAdmins = getConfiguredAdminEmails();
  const accessMode = getAdminAccessMode();

  if (!isAdminEmail(email)) {
    const needsConfig = configuredAdmins.length === 0;
    throw new Error(
      needsConfig
        ? "Admin access is not configured. Set ADMIN_EMAILS to enable this page."
        : "Forbidden: admin access required",
    );
  }

  return {
    userId: user.id,
    email,
    accessMode,
    configuredAdmins,
  };
}

function getEnvironmentChecks(): AdminEnvironmentCheck[] {
  return REQUIRED_ENV_VARS.map((key) => ({
    key,
    configured: Boolean(process.env[key]),
  }));
}

export async function getAdminConsoleData(): Promise<ActionResult<AdminConsoleData>> {
  try {
    const context = await requireAdminContext();
    const currentUsageMonth = getCurrentMonthKey();
    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsersRows,
      paidUsersRows,
      pastDueUsersRows,
      crossPosts24hRows,
      failedCrossPosts24hRows,
      pendingSchedulesRows,
      failedSchedulesRows,
      usageTotalsRows,
      billingRows,
      crossPostEventRows,
      scheduleFailureRows,
      sourceFailureRows,
      analyticsSyncRows,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(subscriptions)
        .where(
          and(
            ne(subscriptions.plan, "free"),
            or(eq(subscriptions.status, "active"), eq(subscriptions.status, "trialing")),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(subscriptions)
        .where(eq(subscriptions.status, "past_due")),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(crossPosts)
        .where(gte(crossPosts.createdAt, since24h)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(crossPosts)
        .where(and(eq(crossPosts.status, "failed"), gte(crossPosts.updatedAt, since24h))),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schedules)
        .where(eq(schedules.status, "pending")),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schedules)
        .where(and(eq(schedules.status, "failed"), gte(schedules.updatedAt, since24h))),
      db
        .select({
          totalCrossPosts: sql<number>`coalesce(sum(${usageTracking.crossPostsCount}), 0)::int`,
          totalAiCalls: sql<number>`coalesce(sum(${usageTracking.aiCallsCount}), 0)::int`,
        })
        .from(usageTracking)
        .where(eq(usageTracking.month, currentUsageMonth)),
      db
        .select({
          userId: users.id,
          email: users.email,
          name: users.name,
          plan: subscriptions.plan,
          status: subscriptions.status,
          cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
          stripeCustomerId: subscriptions.stripeCustomerId,
          stripeSubscriptionId: subscriptions.stripeSubscriptionId,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          subscriptionUpdatedAt: subscriptions.updatedAt,
          crossPostsUsed: usageTracking.crossPostsCount,
          aiCallsUsed: usageTracking.aiCallsCount,
        })
        .from(users)
        .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
        .leftJoin(
          usageTracking,
          and(eq(usageTracking.userId, users.id), eq(usageTracking.month, currentUsageMonth)),
        )
        .orderBy(desc(users.createdAt))
        .limit(50),
      db
        .select({
          id: crossPosts.id,
          userEmail: users.email,
          platform: crossPosts.platform,
          status: crossPosts.status,
          adaptedContent: crossPosts.adaptedContent,
          createdAt: crossPosts.createdAt,
          updatedAt: crossPosts.updatedAt,
        })
        .from(crossPosts)
        .innerJoin(users, eq(users.id, crossPosts.userId))
        .orderBy(desc(crossPosts.updatedAt))
        .limit(40),
      db
        .select({
          id: schedules.id,
          userEmail: users.email,
          targetType: schedules.targetType,
          platform: crossPosts.platform,
          scheduledAt: schedules.scheduledAt,
          updatedAt: schedules.updatedAt,
        })
        .from(schedules)
        .innerJoin(users, eq(users.id, schedules.userId))
        .leftJoin(crossPosts, eq(crossPosts.id, schedules.crossPostId))
        .where(eq(schedules.status, "failed"))
        .orderBy(desc(schedules.updatedAt))
        .limit(30),
      db
        .select({
          id: externalSources.id,
          userEmail: users.email,
          sourceType: externalSources.sourceType,
          sourceUrl: externalSources.sourceUrl,
          errorMessage: externalSources.errorMessage,
          updatedAt: externalSources.updatedAt,
        })
        .from(externalSources)
        .innerJoin(users, eq(users.id, externalSources.userId))
        .where(eq(externalSources.processingStatus, "failed"))
        .orderBy(desc(externalSources.updatedAt))
        .limit(30),
      db
        .select({
          id: analyticsSyncLog.id,
          userEmail: users.email,
          platform: analyticsSyncLog.platform,
          lastSyncedAt: analyticsSyncLog.lastSyncedAt,
          syncWindowStart: analyticsSyncLog.syncWindowStart,
          syncWindowEnd: analyticsSyncLog.syncWindowEnd,
        })
        .from(analyticsSyncLog)
        .innerJoin(users, eq(users.id, analyticsSyncLog.userId))
        .orderBy(desc(analyticsSyncLog.lastSyncedAt))
        .limit(30),
    ]);

    const overview: AdminOverview = {
      totalUsers: totalUsersRows[0]?.count ?? 0,
      paidUsers: paidUsersRows[0]?.count ?? 0,
      pastDueUsers: pastDueUsersRows[0]?.count ?? 0,
      crossPostsLast24h: crossPosts24hRows[0]?.count ?? 0,
      failedCrossPostsLast24h: failedCrossPosts24hRows[0]?.count ?? 0,
      pendingSchedules: pendingSchedulesRows[0]?.count ?? 0,
      failedSchedulesLast24h: failedSchedulesRows[0]?.count ?? 0,
      totalCrossPostsThisMonth: usageTotalsRows[0]?.totalCrossPosts ?? 0,
      totalAiCallsThisMonth: usageTotalsRows[0]?.totalAiCalls ?? 0,
    };

    const billingUsers: AdminBillingUser[] = billingRows.map((row) => ({
      userId: row.userId,
      email: row.email,
      name: row.name ?? null,
      plan: (row.plan ?? "free") as PlanTier,
      status: (row.status ?? "active") as SubscriptionStatus,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd ?? false,
      stripeCustomerId: row.stripeCustomerId ?? null,
      stripeSubscriptionId: row.stripeSubscriptionId ?? null,
      currentPeriodEnd: toIsoString(row.currentPeriodEnd),
      usageMonth: currentUsageMonth,
      crossPostsUsed: row.crossPostsUsed ?? 0,
      aiCallsUsed: row.aiCallsUsed ?? 0,
      subscriptionUpdatedAt: toIsoString(row.subscriptionUpdatedAt),
    }));

    const crossPostEvents: AdminCrossPostEvent[] = crossPostEventRows.map((row) => ({
      id: row.id,
      userEmail: row.userEmail,
      platform: row.platform,
      status: row.status ?? "draft",
      contentSnippet: row.adaptedContent
        ? row.adaptedContent.slice(0, 120) + (row.adaptedContent.length > 120 ? "…" : "")
        : null,
      createdAt: toIsoString(row.createdAt),
      updatedAt: toIsoString(row.updatedAt),
    }));

    const scheduleFailures: AdminScheduleFailure[] = scheduleFailureRows.map((row) => ({
      id: row.id,
      userEmail: row.userEmail,
      targetType: row.targetType ?? null,
      platform: row.platform ?? null,
      scheduledAt: row.scheduledAt.toISOString(),
      updatedAt: toIsoString(row.updatedAt),
    }));

    const sourceFailures: AdminSourceFailure[] = sourceFailureRows.map((row) => ({
      id: row.id,
      userEmail: row.userEmail,
      sourceType: row.sourceType,
      sourceUrl: row.sourceUrl,
      errorMessage: row.errorMessage,
      updatedAt: toIsoString(row.updatedAt),
    }));

    const analyticsSyncEvents: AdminAnalyticsSyncEvent[] = analyticsSyncRows.map((row) => ({
      id: row.id,
      userEmail: row.userEmail,
      platform: row.platform,
      lastSyncedAt: row.lastSyncedAt.toISOString(),
      syncWindowStart: row.syncWindowStart.toISOString(),
      syncWindowEnd: row.syncWindowEnd.toISOString(),
    }));

    return {
      success: true,
      data: {
        access: {
          mode: context.accessMode,
          configuredAdmins: context.configuredAdmins,
          currentUserEmail: context.email,
        },
        generatedAt: now.toISOString(),
        currentUsageMonth,
        overview,
        envChecks: getEnvironmentChecks(),
        billingUsers,
        crossPostEvents,
        scheduleFailures,
        sourceFailures,
        analyticsSyncEvents,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load admin console";
    return { success: false, error: message };
  }
}

export async function updateAdminBillingRecord(
  input: AdminBillingUpdateInput,
): Promise<ActionResult<{ userId: string }>> {
  try {
    await requireAdminContext();

    if (!input.userId) {
      return { success: false, error: "User ID is required" };
    }

    if (!isPlanTier(input.plan)) {
      return { success: false, error: "Invalid plan tier" };
    }

    if (!isSubscriptionStatus(input.status)) {
      return { success: false, error: "Invalid subscription status" };
    }

    if (!isMonthKey(input.usageMonth)) {
      return { success: false, error: "Usage month must be in YYYY-MM format" };
    }

    const [userRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);

    if (!userRecord) {
      return { success: false, error: "User not found" };
    }

    const currentPeriodEnd = input.currentPeriodEnd ? new Date(input.currentPeriodEnd) : null;
    if (currentPeriodEnd && Number.isNaN(currentPeriodEnd.getTime())) {
      return { success: false, error: "Invalid billing period end date" };
    }

    const crossPostsUsed = toNonNegativeInt(input.crossPostsUsed);
    const aiCallsUsed = toNonNegativeInt(input.aiCallsUsed);

    await db.transaction(async (tx) => {
      await tx
        .insert(subscriptions)
        .values({
          userId: input.userId,
          plan: input.plan,
          status: input.status,
          cancelAtPeriodEnd: input.cancelAtPeriodEnd,
          currentPeriodEnd,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: {
            plan: input.plan,
            status: input.status,
            cancelAtPeriodEnd: input.cancelAtPeriodEnd,
            currentPeriodEnd,
            updatedAt: new Date(),
          },
        });

      await tx
        .insert(usageTracking)
        .values({
          userId: input.userId,
          month: input.usageMonth,
          crossPostsCount: crossPostsUsed,
          aiCallsCount: aiCallsUsed,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [usageTracking.userId, usageTracking.month],
          set: {
            crossPostsCount: crossPostsUsed,
            aiCallsCount: aiCallsUsed,
            updatedAt: new Date(),
          },
        });
    });

    revalidatePath("/dashboard/admin");

    return {
      success: true,
      data: { userId: input.userId },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update billing record";
    return { success: false, error: message };
  }
}
