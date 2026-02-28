"use server";

import { db } from "@/server/db";
import { users, userPreferences, platformConnections, subscriptions } from "@/server/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

export type ProfileData = {
  name: string | null;
  email: string;
  timezone: string;
  language: string;
};

export type PreferencesData = {
  aiModel: "gpt-4o-mini" | "claude-haiku" | "auto";
  adaptationTone: "professional" | "casual" | "match-original";
};

export type ConnectionStatus = {
  platform: "linkedin" | "twitter";
  connected: boolean;
  username: string | null;
  expiresAt: string | null;
  isExpiringSoon: boolean;
};

export type SettingsData = {
  profile: ProfileData;
  preferences: PreferencesData;
  connections: ConnectionStatus[];
  billing: {
    plan: string;
    status: string;
    stripeCustomerId: string | null;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

// ─── Server Actions ──────────────────────────────────────────────────────────

export async function getSettings(): Promise<ActionResult<SettingsData>> {
  try {
    const authUser = await getCurrentUser();
    const userId = authUser.id;

    // Fetch user record
    const [userRecord] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    // Fetch user preferences (may not exist yet)
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    // Fetch platform connections
    const connections = await db
      .select()
      .from(platformConnections)
      .where(eq(platformConnections.userId, userId));

    // Fetch subscription
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

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

    return {
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
        billing: {
          plan: sub?.plan ?? "free",
          status: sub?.status ?? "active",
          stripeCustomerId: sub?.stripeCustomerId ?? null,
          cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
          currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
        },
      },
    };
  } catch (error) {
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

    // Upsert preferences for timezone and language
    const existing = await db
      .select({ id: userPreferences.id })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userPreferences)
        .set({
          timezone: input.timezone,
          language: input.language,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId));
    } else {
      await db.insert(userPreferences).values({
        userId,
        timezone: input.timezone,
        language: input.language,
      });
    }

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

    const existing = await db
      .select({ id: userPreferences.id })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userPreferences)
        .set({
          aiModel: input.aiModel,
          adaptationTone: input.adaptationTone,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId));
    } else {
      await db.insert(userPreferences).values({
        userId,
        aiModel: input.aiModel,
        adaptationTone: input.adaptationTone,
      });
    }

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
