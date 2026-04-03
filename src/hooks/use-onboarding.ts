"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ChecklistItem, OnboardingData } from "@/server/actions/onboarding";

const STORAGE_KEY = "onboarding-wizard-state";

interface WizardState {
  isOpen: boolean;
  currentStep: number;
  dismissed: boolean;
}

interface UseOnboardingReturn {
  isWizardOpen: boolean;
  currentStep: number;
  isWizardDismissed: boolean;
  checklist: ChecklistItem[];
  completedChecklistCount: number;
  totalChecklistCount: number;
  toursCompleted: string[];
  isTourCompleted: (tourId: string) => boolean;
  isLoading: boolean;
  error: string | null;
  startWizard: () => void;
  advanceWizard: (step: number) => void;
  completeWizard: () => Promise<void>;
  dismissWizard: () => Promise<void>;
  getChecklistStatus: () => ChecklistItem[];
  markTourCompleted: (tourId: string) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_WIZARD_STATE: WizardState = {
  isOpen: false,
  currentStep: 0,
  dismissed: false,
};

function loadWizardStateFromStorage(): WizardState {
  if (typeof window === "undefined") return DEFAULT_WIZARD_STATE;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_WIZARD_STATE, ...JSON.parse(stored) };
    }
  } catch {
    return DEFAULT_WIZARD_STATE;
  }
  return DEFAULT_WIZARD_STATE;
}

function saveWizardStateToStorage(state: WizardState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
}

function clearWizardStateFromStorage(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export function useOnboarding(): UseOnboardingReturn {
  const [wizardState, setWizardState] = useState<WizardState>(DEFAULT_WIZARD_STATE);
  const [isWizardStateLoaded, setIsWizardStateLoaded] = useState(false);
  const [dbData, setDbData] = useState<OnboardingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const stored = loadWizardStateFromStorage();
    setWizardState(stored);
    setIsWizardStateLoaded(true);

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isWizardStateLoaded) {
      saveWizardStateToStorage(wizardState);
    }
  }, [wizardState, isWizardStateLoaded]);

  const fetchDbData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding/progress");

      if (!response.ok) {
        throw new Error(`Failed to fetch onboarding progress: ${response.status}`);
      }

      const result = await response.json();

      if (!isMountedRef.current) return;

      if (result.success) {
        setDbData(result.data);
      } else {
        setError(result.error || "Failed to load onboarding data");
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchDbData();
  }, [fetchDbData]);

  const startWizard = useCallback(() => {
    setWizardState((prev) => ({
      ...prev,
      isOpen: true,
      currentStep: 1,
    }));
  }, []);

  useEffect(() => {
    if (!isLoading && isWizardStateLoaded && dbData) {
      const hasNeverStarted = wizardState.currentStep === 0;
      const isNotCompleted = !dbData.wizardCompleted;
      const isNotDismissed = !wizardState.dismissed && !dbData.dismissedAt;
      const isNotOpen = !wizardState.isOpen;

      if (hasNeverStarted && isNotCompleted && isNotDismissed && isNotOpen) {
        startWizard();
      }
    }
  }, [isLoading, isWizardStateLoaded, dbData, wizardState, startWizard]);

  const advanceWizard = useCallback((step: number) => {
    setWizardState((prev) => ({
      ...prev,
      currentStep: step,
    }));
  }, []);

  const completeWizard = useCallback(async () => {
    setWizardState((prev) => ({
      ...prev,
      isOpen: false,
      currentStep: 999,
    }));

    try {
      const response = await fetch("/api/onboarding/complete", { method: "POST" });

      if (!response.ok) {
        throw new Error(`Failed to complete wizard: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        await fetchDbData();
      } else {
        setError(result.error || "Failed to complete wizard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [fetchDbData]);

  const dismissWizard = useCallback(async () => {
    setWizardState((prev) => ({
      ...prev,
      isOpen: false,
      dismissed: true,
    }));

    try {
      const response = await fetch("/api/onboarding/dismiss", { method: "POST" });

      if (!response.ok) {
        throw new Error(`Failed to dismiss wizard: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        await fetchDbData();
      } else {
        setError(result.error || "Failed to dismiss wizard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [fetchDbData]);

  const getChecklistStatus = useCallback((): ChecklistItem[] => {
    return dbData?.checklist ?? [];
  }, [dbData?.checklist]);

  const markTourCompleted = useCallback(
    async (tourId: string) => {
      try {
        const response = await fetch("/api/onboarding/tour", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tourId }),
        });

        if (!response.ok) {
          throw new Error(`Failed to mark tour completed: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          await fetchDbData();
        } else {
          setError(result.error || "Failed to mark tour completed");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [fetchDbData],
  );

  const resetOnboarding = useCallback(async () => {
    clearWizardStateFromStorage();
    setWizardState(DEFAULT_WIZARD_STATE);

    try {
      const response = await fetch("/api/onboarding/reset", { method: "POST" });

      if (!response.ok) {
        throw new Error(`Failed to reset onboarding: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        await fetchDbData();
      } else {
        setError(result.error || "Failed to reset onboarding");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [fetchDbData]);

  const isTourCompleted = useCallback(
    (tourId: string): boolean => {
      return dbData?.toursCompleted.includes(tourId) ?? false;
    },
    [dbData?.toursCompleted],
  );

  const checklist = dbData?.checklist ?? [];
  const completedChecklistCount = checklist.filter((item) => item.completed).length;
  const totalChecklistCount = checklist.length;

  return {
    isWizardOpen: wizardState.isOpen,
    currentStep: wizardState.currentStep,
    isWizardDismissed: wizardState.dismissed || !!dbData?.dismissedAt,
    checklist,
    completedChecklistCount,
    totalChecklistCount,
    toursCompleted: dbData?.toursCompleted ?? [],
    isTourCompleted,
    isLoading,
    error,
    startWizard,
    advanceWizard,
    completeWizard,
    dismissWizard,
    getChecklistStatus,
    markTourCompleted,
    resetOnboarding,
    refresh: fetchDbData,
  };
}
