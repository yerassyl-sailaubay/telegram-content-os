import type { TourConfig } from "../types";
import { baseDriverConfig } from "../config";

export const analyticsIntroTour: TourConfig = {
  ...baseDriverConfig,
  metadata: {
    id: "analytics-intro",
    name: "Analytics Introduction",
    description: "Learn where to check growth, timing, and top-performing posts",
    maxSteps: 5,
    allowSkip: true,
    showProgress: true,
    storageKey: "tour:analytics-intro:dismissed",
  },
  steps: [
    {
      element: "[data-tour='analytics-filters']",
      popover: {
        title: "Channel and Date Range",
        description:
          "Pick the Telegram channel you want to inspect and switch the time window before reading the rest of the page.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='analytics-kpi-cards']",
      popover: {
        title: "Headline Insights",
        description:
          "These cards surface the fastest read on growth, your strongest posting window, and your current top post.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='kpi-best-time']",
      popover: {
        title: "Best Posting Time",
        description:
          "Use this insight to spot the weekday and hour that currently earn the strongest average view count.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='analytics-charts']",
      popover: {
        title: "Growth and Heatmap",
        description:
          "The chart and heatmap help you compare growth over time and see which publishing slots perform best.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='analytics-top-posts']",
      popover: {
        title: "Top Posts Table",
        description:
          "Sort your strongest posts by views, reactions, forwards, or date to learn which content patterns are working.",
        side: "bottom",
        align: "start",
      },
    },
  ],
};
