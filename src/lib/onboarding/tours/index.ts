export { dashboardIntroTour } from "./definitions/dashboard-intro";
export { contentLibraryIntroTour } from "./definitions/content-library-intro";
export { scheduleIntroTour } from "./definitions/schedule-intro";
export { analyticsIntroTour } from "./definitions/analytics-intro";
export { aiGenerationIntroTour } from "./definitions/ai-generation-intro";

export { baseDriverConfig, driverStyles } from "./config";
export type { TourId, TourMetadata, TourConfig, TourState, TourContextValue } from "./types";
export { defaultTourState } from "./types";
export { mobileTourSteps, tourNames } from "./mobile-steps";

import type { TourConfig, TourId } from "./types";
import { dashboardIntroTour } from "./definitions/dashboard-intro";
import { contentLibraryIntroTour } from "./definitions/content-library-intro";
import { scheduleIntroTour } from "./definitions/schedule-intro";
import { analyticsIntroTour } from "./definitions/analytics-intro";
import { aiGenerationIntroTour } from "./definitions/ai-generation-intro";

export const tours: Record<TourId, TourConfig> = {
  "dashboard-intro": dashboardIntroTour,
  "content-library-intro": contentLibraryIntroTour,
  "schedule-intro": scheduleIntroTour,
  "analytics-intro": analyticsIntroTour,
  "ai-generation-intro": aiGenerationIntroTour,
};

export function getTour(id: TourId): TourConfig {
  const tour = tours[id];
  if (!tour) {
    throw new Error(`Tour with id "${id}" not found`);
  }
  return tour;
}
