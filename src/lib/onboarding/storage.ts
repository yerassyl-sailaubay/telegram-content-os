import type { TourId, TourState } from "./tours/types";

const STORAGE_PREFIX = "tour:";

function getStorageKey(tourId: TourId): string {
  return `${STORAGE_PREFIX}${tourId}:state`;
}

export function getTourState(tourId: TourId): TourState {
  if (typeof window === "undefined") {
    return { dismissed: false, startedCount: 0, completedCount: 0 };
  }

  try {
    const stored = localStorage.getItem(getStorageKey(tourId));
    if (stored) {
      return JSON.parse(stored) as TourState;
    }
  } catch {
    return { dismissed: false, startedCount: 0, completedCount: 0 };
  }

  return { dismissed: false, startedCount: 0, completedCount: 0 };
}

export function saveTourState(tourId: TourId, state: TourState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(getStorageKey(tourId), JSON.stringify(state));
  } catch {}
}

export function markTourDismissed(tourId: TourId): void {
  const state = getTourState(tourId);
  saveTourState(tourId, {
    ...state,
    dismissed: true,
    dismissedAt: new Date().toISOString(),
  });
}

export function markTourStarted(tourId: TourId): void {
  const state = getTourState(tourId);
  saveTourState(tourId, {
    ...state,
    startedCount: state.startedCount + 1,
  });
}

export function markTourCompleted(tourId: TourId): void {
  const state = getTourState(tourId);
  saveTourState(tourId, {
    ...state,
    completedCount: state.completedCount + 1,
    dismissed: true,
    dismissedAt: new Date().toISOString(),
  });
}

export function resetTourState(tourId: TourId): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(getStorageKey(tourId));
  } catch {}
}

export function isTourDismissed(tourId: TourId): boolean {
  return getTourState(tourId).dismissed;
}
