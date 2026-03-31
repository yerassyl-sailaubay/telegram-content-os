import type { TourConfig } from "../types";
import { baseDriverConfig } from "../config";

export const scheduleIntroTour: TourConfig = {
  ...baseDriverConfig,
  metadata: {
    id: "schedule-intro",
    name: "Schedule Introduction",
    description: "Learn how to manage your publishing calendar",
    maxSteps: 4,
    allowSkip: true,
    showProgress: true,
    storageKey: "tour:schedule-intro:dismissed",
  },
  steps: [
    {
      element: "[data-tour='schedule-view-controls']",
      popover: {
        title: "Calendar Navigation",
        description:
          "Move between dates, jump back to today, and switch between month, week, and day views as you plan.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='schedule-timezone']",
      popover: {
        title: "Timezone",
        description:
          "Set the timezone you want the calendar to use so scheduled posts line up with your audience timing.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='add-schedule-btn']",
      popover: {
        title: "Create a Schedule",
        description:
          "Start a new scheduled post from here and continue into the composer with the chosen date and time.",
        side: "left",
        align: "center",
      },
    },
    {
      element: "[data-tour='schedule-calendar']",
      popover: {
        title: "Publishing Calendar",
        description:
          "See your scheduled posts on the calendar, open busy days, and adjust plans directly from the timeline.",
        side: "top",
        align: "center",
      },
    },
  ],
};
