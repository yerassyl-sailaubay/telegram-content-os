import type { Config, DriveStep } from "driver.js";

export type TourId =
  | "dashboard-intro"
  | "content-library-intro"
  | "schedule-intro"
  | "analytics-intro"
  | "ai-generation-intro";

export interface TourMetadata {
  id: TourId;
  name: string;
  description: string;
  maxSteps: number;
  allowSkip: boolean;
  showProgress: boolean;
  storageKey: string;
}

export interface TourConfig extends Omit<Config, "steps"> {
  metadata: TourMetadata;
  steps: DriveStep[];
}

export interface TourState {
  dismissed: boolean;
  dismissedAt?: string;
  startedCount: number;
  completedCount: number;
  lastStep?: number;
}

export const defaultTourState: TourState = {
  dismissed: false,
  startedCount: 0,
  completedCount: 0,
};

export interface TourContextValue {
  activeTour: TourId | null;
  startTour: (tourId: TourId) => void;
  endTour: () => void;
  isTourDismissed: (tourId: TourId) => boolean;
  resetTour: (tourId: TourId) => void;
  getTourState: (tourId: TourId) => TourState;
}
