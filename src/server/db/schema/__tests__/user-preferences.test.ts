import { describe, expect, it } from "vitest";
import {
  userPreferences,
  userPreferencesRelations,
  aiModelEnum,
  adaptationToneEnum,
  type OnboardingProgress,
} from "../user-preferences";

describe("userPreferences table", () => {
  it("has userId column", () => {
    expect(userPreferences.userId).toBeDefined();
  });

  it("has timezone column", () => {
    expect(userPreferences.timezone).toBeDefined();
  });

  it("has language column", () => {
    expect(userPreferences.language).toBeDefined();
  });

  it("has aiModel column", () => {
    expect(userPreferences.aiModel).toBeDefined();
  });

  it("has adaptationTone column", () => {
    expect(userPreferences.adaptationTone).toBeDefined();
  });

  it("has onboardingProgress column", () => {
    expect(userPreferences.onboardingProgress).toBeDefined();
  });

  it("has createdAt and updatedAt columns", () => {
    expect(userPreferences.createdAt).toBeDefined();
    expect(userPreferences.updatedAt).toBeDefined();
  });
});

describe("userPreferencesRelations", () => {
  it("is defined", () => {
    expect(userPreferencesRelations).toBeDefined();
  });
});

describe("aiModelEnum", () => {
  it("has expected values", () => {
    expect(aiModelEnum).toBeDefined();
    expect(aiModelEnum.enumName).toBe("ai_model");
  });
});

describe("adaptationToneEnum", () => {
  it("has expected values", () => {
    expect(adaptationToneEnum).toBeDefined();
    expect(adaptationToneEnum.enumName).toBe("adaptation_tone");
  });
});

describe("OnboardingProgress type", () => {
  it("accepts valid onboarding progress data", () => {
    const progress: OnboardingProgress = {
      wizardCompleted: false,
      wizardStepReached: 2,
      checklistItems: {
        profileSetup: true,
        connectTelegram: false,
        createFirstPost: false,
      },
      toursCompleted: ["dashboard-tour"],
      dismissedAt: "2024-01-15T10:30:00Z",
    };

    expect(progress.wizardCompleted).toBe(false);
    expect(progress.wizardStepReached).toBe(2);
    expect(progress.checklistItems.profileSetup).toBe(true);
    expect(progress.toursCompleted).toContain("dashboard-tour");
    expect(progress.dismissedAt).toBe("2024-01-15T10:30:00Z");
  });

  it("works without dismissedAt (optional field)", () => {
    const progress: OnboardingProgress = {
      wizardCompleted: true,
      wizardStepReached: 5,
      checklistItems: {},
      toursCompleted: [],
    };

    expect(progress.wizardCompleted).toBe(true);
    expect(progress.dismissedAt).toBeUndefined();
  });
});
