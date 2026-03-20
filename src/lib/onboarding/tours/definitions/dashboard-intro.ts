import type { TourConfig } from "../types";
import { baseDriverConfig } from "../config";

export const dashboardIntroTour: TourConfig = {
  ...baseDriverConfig,
  metadata: {
    id: "dashboard-intro",
    name: "Dashboard Introduction",
    description: "Learn the basics of your content dashboard",
    maxSteps: 5,
    allowSkip: true,
    showProgress: true,
    storageKey: "tour:dashboard-intro:dismissed",
  },
  steps: [
    {
      element: "[data-tour='dashboard-header']",
      popover: {
        title: "Welcome to Your Dashboard",
        description:
          "This is your content command center. Access all your posts, analytics, and AI tools from here.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='create-from-url']",
      popover: {
        title: "Create from URL",
        description:
          "Quickly import and adapt content from any URL. Our AI will analyze and optimize it for your Telegram channel.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='quick-stats']",
      popover: {
        title: "Quick Stats",
        description:
          "Track your content performance at a glance. View scheduled posts, published content, and engagement metrics.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='recent-content']",
      popover: {
        title: "Recent Content",
        description:
          "Access your recently created and edited posts. Click any item to continue working on it.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='sidebar-nav']",
      popover: {
        title: "Navigation",
        description:
          "Use the sidebar to explore all features: Content Library, Schedule, Analytics, and AI Generation tools.",
        side: "right",
        align: "start",
      },
    },
  ],
};
