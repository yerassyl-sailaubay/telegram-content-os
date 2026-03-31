import type { TourConfig } from "../types";
import { baseDriverConfig } from "../config";

export const dashboardIntroTour: TourConfig = {
  ...baseDriverConfig,
  metadata: {
    id: "dashboard-intro",
    name: "Dashboard Introduction",
    description: "Learn how to scan your dashboard and jump into the next task fast",
    maxSteps: 5,
    allowSkip: true,
    showProgress: true,
    storageKey: "tour:dashboard-intro:dismissed",
  },
  steps: [
    {
      element: "[data-tour='quick-stats']",
      popover: {
        title: "Dashboard Snapshot",
        description:
          "This hero section gives you a quick read on ideas, drafts, scheduled posts, and publishing gaps.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='quick-actions']",
      popover: {
        title: "Quick Actions",
        description:
          "Jump straight into the most common workflows: writing a post, importing from a URL, or opening your schedule.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='create-from-url']",
      popover: {
        title: "Capture Ideas Fast",
        description:
          "Use this card to save raw ideas quickly and keep an eye on your current AI-assisted creation usage.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='upcoming-posts']",
      popover: {
        title: "Upcoming Queue",
        description:
          "This panel shows what is scheduled next so you can spot empty days before your calendar goes quiet.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='sidebar-nav']",
      popover: {
        title: "Navigation",
        description:
          "Use the sidebar to move between posts, scheduling, analytics, channels, and settings from any dashboard page.",
        side: "right",
        align: "start",
      },
    },
  ],
};
