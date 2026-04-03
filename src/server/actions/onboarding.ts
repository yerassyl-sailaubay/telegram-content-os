"use server";

import { db } from "@/server/db";
import {
  userPreferences,
  telegramChannels,
  platformConnections,
  contentLibrary,
} from "@/server/db/schema";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { eq, and } from "drizzle-orm";
import type { OnboardingProgress } from "@/server/db/schema/user-preferences";
import type { ActionResult } from "./settings";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
};

export type OnboardingData = {
  wizardCompleted: boolean;
  wizardStepReached: number;
  dismissedAt: string | null;
  toursCompleted: string[];
  checklist: ChecklistItem[];
};

// ─── Server Actions ──────────────────────────────────────────────────────────

export async function getOnboardingProgress(): Promise<ActionResult<OnboardingData>> {
  try {
    const authUser = await getCurrentUser();
    const userId = authUser.id;

    const [prefRow] = await db
      .select({
        onboardingProgress: userPreferences.onboardingProgress,
      })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    const progress = prefRow?.onboardingProgress;
    const checklist = await detectChecklistStatus(userId);

    return {
      success: true,
      data: {
        wizardCompleted: progress?.wizardCompleted ?? false,
        wizardStepReached: progress?.wizardStepReached ?? 0,
        dismissedAt: progress?.dismissedAt ?? null,
        toursCompleted: progress?.toursCompleted ?? [],
        checklist,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load onboarding progress";
    return { success: false, error: message };
  }
}

export async function updateOnboardingProgress(
  progress: Partial<OnboardingProgress>,
): Promise<ActionResult<void>> {
  try {
    const authUser = await getCurrentUser();
    const userId = authUser.id;

    const [existingRow] = await db
      .select({
        onboardingProgress: userPreferences.onboardingProgress,
      })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    const existing = existingRow?.onboardingProgress ?? {
      wizardCompleted: false,
      wizardStepReached: 0,
      checklistItems: {},
      toursCompleted: [],
    };

    // Merge with updates
    const updated: OnboardingProgress = {
      ...existing,
      ...progress,
      checklistItems: {
        ...existing.checklistItems,
        ...progress.checklistItems,
      },
      toursCompleted: [
        ...new Set([...(existing.toursCompleted ?? []), ...(progress.toursCompleted ?? [])]),
      ],
    };

    await db
      .insert(userPreferences)
      .values({
        userId,
        onboardingProgress: updated,
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          onboardingProgress: updated,
          updatedAt: new Date(),
        },
      });

    return { success: true, data: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update onboarding progress";
    return { success: false, error: message };
  }
}

export async function completeWizard(): Promise<ActionResult<void>> {
  return updateOnboardingProgress({
    wizardCompleted: true,
    wizardStepReached: 999,
  });
}

export async function dismissWizard(): Promise<ActionResult<void>> {
  return updateOnboardingProgress({
    dismissedAt: new Date().toISOString(),
  });
}

export async function markTourCompleted(tourId: string): Promise<ActionResult<void>> {
  return updateOnboardingProgress({
    toursCompleted: [tourId],
  });
}

export async function resetOnboarding(): Promise<ActionResult<void>> {
  try {
    const authUser = await getCurrentUser();
    const userId = authUser.id;

    await db
      .insert(userPreferences)
      .values({
        userId,
        onboardingProgress: {
          wizardCompleted: false,
          wizardStepReached: 0,
          checklistItems: {},
          toursCompleted: [],
        },
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          onboardingProgress: {
            wizardCompleted: false,
            wizardStepReached: 0,
            checklistItems: {},
            toursCompleted: [],
          },
          updatedAt: new Date(),
        },
      });

    return { success: true, data: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset onboarding";
    return { success: false, error: message };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function detectChecklistStatus(userId: string): Promise<ChecklistItem[]> {
  const [channelRows, platformRows, contentRows, publishedRows] = await Promise.all([
    db
      .select({ id: telegramChannels.id })
      .from(telegramChannels)
      .where(eq(telegramChannels.userId, userId))
      .limit(1),
    db
      .select({ id: platformConnections.id })
      .from(platformConnections)
      .where(eq(platformConnections.userId, userId))
      .limit(1),
    db
      .select({ id: contentLibrary.id })
      .from(contentLibrary)
      .where(eq(contentLibrary.userId, userId))
      .limit(1),
    db
      .select({ id: contentLibrary.id })
      .from(contentLibrary)
      .where(and(eq(contentLibrary.userId, userId), eq(contentLibrary.status, "published")))
      .limit(1),
  ]);

  return [
    {
      id: "connect-telegram",
      label: "Connect Telegram channel",
      completed: channelRows.length > 0,
    },
    {
      id: "connect-platform",
      label: "Connect social platform",
      completed: platformRows.length > 0,
    },
    { id: "create-content", label: "Create your first content", completed: contentRows.length > 0 },
    { id: "publish-post", label: "Publish your first post", completed: publishedRows.length > 0 },
  ];
}
