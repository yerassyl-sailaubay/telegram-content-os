import type { TourConfig } from "../types";
import { baseDriverConfig } from "../config";

export const aiGenerationIntroTour: TourConfig = {
  ...baseDriverConfig,
  metadata: {
    id: "ai-generation-intro",
    name: "AI Generation Introduction",
    description: "Learn how to use AI to generate and optimize content",
    maxSteps: 5,
    allowSkip: true,
    showProgress: true,
    storageKey: "tour:ai-generation-intro:dismissed",
  },
  steps: [
    {
      element: "[data-tour='ai-prompt-input']",
      popover: {
        title: "AI Content Generator",
        description:
          "Describe what you want to create. The AI will generate Telegram-ready content based on your input.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='ai-templates']",
      popover: {
        title: "Content Templates",
        description:
          "Choose from pre-built templates for common content types: announcements, tips, stories, and more.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='ai-tone-selector']",
      popover: {
        title: "Tone & Style",
        description:
          "Select the writing style that matches your brand: professional, casual, humorous, or educational.",
        side: "left",
        align: "center",
      },
    },
    {
      element: "[data-tour='ai-generate-btn']",
      popover: {
        title: "Generate Content",
        description:
          "Click to generate your content. The AI will create multiple variations for you to choose from.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='ai-variations']",
      popover: {
        title: "Choose & Edit",
        description:
          "Review AI-generated variations, pick your favorite, and edit it to perfection before publishing.",
        side: "top",
        align: "start",
      },
    },
  ],
};
