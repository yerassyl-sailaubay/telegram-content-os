import type { TourConfig } from "../types";
import { baseDriverConfig } from "../config";

export const analyticsIntroTour: TourConfig = {
  ...baseDriverConfig,
  metadata: {
    id: "analytics-intro",
    name: "Analytics Introduction",
    description: "Learn how to understand your content performance",
    maxSteps: 5,
    allowSkip: true,
    showProgress: true,
    storageKey: "tour:analytics-intro:dismissed",
  },
  steps: [
    {
      element: "[data-tour='analytics-overview']",
      popover: {
        title: "Performance Overview",
        description:
          "Track your key metrics: total views, engagement rate, subscriber growth, and content reach.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='analytics-charts']",
      popover: {
        title: "Trend Charts",
        description:
          "Visualize your performance over time. Spot trends and understand what content resonates with your audience.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='analytics-top-posts']",
      popover: {
        title: "Top Performing Content",
        description:
          "See your best-performing posts. Learn from what works and replicate that success.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='analytics-audience']",
      popover: {
        title: "Audience Insights",
        description:
          "Understand who your audience is: demographics, active hours, and engagement patterns.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='analytics-export']",
      popover: {
        title: "Export Reports",
        description: "Download detailed reports to share with your team or for further analysis.",
        side: "bottom",
        align: "end",
      },
    },
  ],
};
