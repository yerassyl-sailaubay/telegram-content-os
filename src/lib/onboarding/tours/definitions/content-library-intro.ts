import type { TourConfig } from "../types";
import { baseDriverConfig } from "../config";

export const contentLibraryIntroTour: TourConfig = {
  ...baseDriverConfig,
  metadata: {
    id: "content-library-intro",
    name: "Content Library Introduction",
    description: "Learn how to filter, search, and manage saved content",
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
          "Switch between ideas, drafts, scheduled posts, published items, and channel-specific views from here.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='content-search']",
      popover: {
        title: "Search",
        description:
          "Search through saved titles and body text to find the exact draft or published post you want to reopen.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: "[data-tour='content-table']",
      popover: {
        title: "Content Table",
        description:
          "When content is available, this table becomes the fastest way to review status, source, and row-level actions.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='bulk-actions']",
      popover: {
        title: "Visible Columns",
        description:
          "Customize which columns stay visible in the table so the library matches the way you like to review content.",
        side: "bottom",
        align: "start",
      },
    },
  ],
};
