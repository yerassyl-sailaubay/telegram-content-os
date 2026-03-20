import type { TourConfig } from "../types";
import { baseDriverConfig } from "../config";

export const contentLibraryIntroTour: TourConfig = {
  ...baseDriverConfig,
  metadata: {
    id: "content-library-intro",
    name: "Content Library Introduction",
    description: "Learn how to manage your content library",
    maxSteps: 4,
    allowSkip: true,
    showProgress: true,
    storageKey: "tour:content-library-intro:dismissed",
  },
  steps: [
    {
      element: "[data-tour='content-filters']",
      popover: {
        title: "Content Filters",
        description:
          "Filter your content by status, type, or date. Find exactly what you need in seconds.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='content-grid']",
      popover: {
        title: "Your Content",
        description:
          "All your posts are displayed here. Each card shows the status, scheduled time, and quick actions.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='content-search']",
      popover: {
        title: "Search",
        description: "Search through all your content by keywords, tags, or content type.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='bulk-actions']",
      popover: {
        title: "Bulk Actions",
        description:
          "Select multiple items to perform bulk operations like schedule, publish, or delete.",
        side: "bottom",
        align: "start",
      },
    },
  ],
};
