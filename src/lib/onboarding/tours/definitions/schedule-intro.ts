import type { TourConfig } from "../types";
import { baseDriverConfig } from "../config";

export const scheduleIntroTour: TourConfig = {
  ...baseDriverConfig,
  metadata: {
    id: "schedule-intro",
    name: "Schedule Introduction",
    description: "Learn how to schedule and manage your content calendar",
    maxSteps: 4,
    allowSkip: true,
    showProgress: true,
    storageKey: "tour:schedule-intro:dismissed",
  },
  steps: [
    {
      element: "[data-tour='schedule-calendar']",
      popover: {
        title: "Content Calendar",
        description:
          "View your publishing schedule in a calendar or list format. See what's coming up at a glance.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='schedule-timeline']",
      popover: {
        title: "Timeline View",
        description:
          "Switch to timeline view to see your scheduled posts in chronological order with precise timing.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='schedule-drag-drop']",
      popover: {
        title: "Drag & Drop",
        description:
          "Easily reschedule posts by dragging them to a new time slot. Changes are saved automatically.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='schedule-optimize']",
      popover: {
        title: "Smart Scheduling",
        description:
          "Let AI suggest the best posting times based on your audience engagement patterns.",
        side: "left",
        align: "center",
      },
    },
  ],
};
