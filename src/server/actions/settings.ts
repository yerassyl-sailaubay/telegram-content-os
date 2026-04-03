"use server";

import { db } from "@/server/db";
import { users, userPreferences, platformConnections, subscriptions } from "@/server/db/schema";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  elapsedMs,
  logHotRoutePerf,
  measurePerfStep,
  type PerfTimings,
} from "@/lib/perf/hot-routes";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

export type ProfileData = {
  name: string | null;
  email: string;
  timezone: string;
  language: string;
};

export type PreferencesData = {
  aiModel: "gemini-flash" | "gemini-pro" | "auto";
  adaptationTone: "professional" | "casual" | "match-original";
};

export type ConnectionStatus = {
  platform: "linkedin" | "twitter";
  connected: boolean;
  username: string | null;
  expiresAt: string | null;
  isExpiringSoon: boolean;
};

export type TelegramBotStatus = {
  linked: boolean;
  telegramUserId: string | null;
  linkedAt: string | null;
};

export type SettingsData = {
  profile: ProfileData;
  preferences: PreferencesData;
  connections: ConnectionStatus[];
  telegramBot: TelegramBotStatus;
  billing: {
    plan: string;
    status: string;
    stripeCustomerId: string | null;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ─── Server Actions ──────────────────────────────────────────────────────────

export async function getSettings(): Promise<ActionResult<SettingsData>> {
  const startedAt = performance.now();
  const timings: PerfTimings = {};

  try {
    const authUser = await measurePerfStep(timings, "authMs", () => getCurrentUser());
    const userId = authUser.id;

    const [userRows, prefRows, connections, subRows] = await Promise.all([
      measurePerfStep(timings, "userRecordMs", () =>
        db
          .select({
            name: users.name,
            telegramUserId: users.telegramUserId,
            telegramLinkedAt: users.telegramLinkedAt,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1),
      ),
      measurePerfStep(timings, "preferencesMs", () =>
        db
          .select({
            timezone: userPreferences.timezone,
            language: userPreferences.language,
            aiModel: userPreferences.aiModel,
            adaptationTone: userPreferences.adaptationTone,
          })
          .from(userPreferences)
          .where(eq(userPreferences.userId, userId))
          .limit(1),
      ),
      measurePerfStep(timings, "connectionsMs", () =>
        db.select().from(platformConnections).where(eq(platformConnections.userId, userId)),
      ),
      measurePerfStep(timings, "subscriptionMs", () =>
        db
          .select({
            plan: subscriptions.plan,
            status: subscriptions.status,
            stripeCustomerId: subscriptions.stripeCustomerId,
            cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
            currentPeriodEnd: subscriptions.currentPeriodEnd,
          })
          .from(subscriptions)
          .where(eq(subscriptions.userId, userId))
          .limit(1),
      ),
    ]);

    const userRecord = userRows[0];
    const prefs = prefRows[0];
    const sub = subRows[0];

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const platforms: Array<"linkedin" | "twitter"> = ["linkedin", "twitter"];
    const connectionStatuses: ConnectionStatus[] = platforms.map((platform) => {
      const conn = connections.find((c) => c.platform === platform);
      const expiresAt = conn?.tokenExpiresAt ?? null;
      const isExpiringSoon = expiresAt
        ? new Date(expiresAt) <= sevenDaysFromNow && new Date(expiresAt) > now
        : false;

      return {
        platform,
        connected: !!conn,
        username: conn?.platformUsername ?? null,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        isExpiringSoon,
      };
    });

    const result: ActionResult<SettingsData> = {
      success: true,
      data: {
        profile: {
          name: userRecord?.name ?? null,
          email: authUser.email ?? "",
          timezone: prefs?.timezone ?? "UTC",
          language: prefs?.language ?? "en",
        },
        preferences: {
          aiModel: (prefs?.aiModel ?? "auto") as PreferencesData["aiModel"],
          adaptationTone: (prefs?.adaptationTone ??
            "professional") as PreferencesData["adaptationTone"],
        },
        connections: connectionStatuses,
        telegramBot: {
          linked: Boolean(userRecord?.telegramUserId),
          telegramUserId: userRecord?.telegramUserId ?? null,
          linkedAt: userRecord?.telegramLinkedAt?.toISOString() ?? null,
        },
        billing: {
          plan: sub?.plan ?? "free",
          status: sub?.status ?? "active",
          stripeCustomerId: sub?.stripeCustomerId ?? null,
          cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
          currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
        },
      },
    };

    logHotRoutePerf("settings-data", {
      totalMs: elapsedMs(startedAt),
      timings,
      connections: connections.length,
      linkedTelegram: Boolean(userRecord?.telegramUserId),
    });

    return result;
  } catch (error) {
    logHotRoutePerf("settings-data", {
      totalMs: elapsedMs(startedAt),
      timings,
      error: error instanceof Error ? error.message : "unknown",
    });

    const message = error instanceof Error ? error.message : "Failed to load settings";
    return { success: false, error: message };
  }
}

export async function updateProfile(input: {
  name: string;
  timezone: string;
  language: string;
}): Promise<ActionResult<ProfileData>> {
  try {
    const authUser = await getCurrentUser();
    const userId = authUser.id;

    if (!input.name?.trim()) {
      return { success: false, error: "Name is required" };
    }

    // Update user name
    await db
      .update(users)
      .set({ name: input.name.trim(), updatedAt: new Date() })
      .where(eq(users.id, userId));

    await db
      .insert(userPreferences)
      .values({
        userId,
        timezone: input.timezone,
        language: input.language,
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          timezone: input.timezone,
          language: input.language,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/dashboard/settings");

    return {
      success: true,
      data: {
        name: input.name.trim(),
        email: authUser.email ?? "",
        timezone: input.timezone,
        language: input.language,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update profile";
    return { success: false, error: message };
  }
}

export async function updatePreferences(
  input: PreferencesData,
): Promise<ActionResult<PreferencesData>> {
  try {
    const authUser = await getCurrentUser();
    const userId = authUser.id;

    await db
      .insert(userPreferences)
      .values({
        userId,
        aiModel: input.aiModel,
        adaptationTone: input.adaptationTone,
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          aiModel: input.aiModel,
          adaptationTone: input.adaptationTone,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/dashboard/settings");

    return { success: true, data: input };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update preferences";
    return { success: false, error: message };
  }
}

export async function disconnectPlatform(
  platform: "linkedin" | "twitter",
): Promise<ActionResult<{ platform: string }>> {
  try {
    const authUser = await getCurrentUser();
    const userId = authUser.id;

    const [conn] = await db
      .select({ id: platformConnections.id })
      .from(platformConnections)
      .where(
        and(eq(platformConnections.userId, userId), eq(platformConnections.platform, platform)),
      )
      .limit(1);

    if (!conn) {
      return { success: false, error: "Platform not connected" };
    }

    await db
      .delete(platformConnections)
      .where(
        and(eq(platformConnections.userId, userId), eq(platformConnections.platform, platform)),
      );

    revalidatePath("/dashboard/settings");

    return { success: true, data: { platform } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disconnect platform";
    return { success: false, error: message };
  }
}
