import type { TourConfig } from "../types";
import { baseDriverConfig } from "../config";

export const aiGenerationIntroTour: TourConfig = {
  ...baseDriverConfig,
  metadata: {
    id: "ai-generation-intro",
    name: "Create from URL Introduction",
    description: "Learn how URL import turns source material into channel-ready drafts",
    maxSteps: 5,
    allowSkip: true,
    showProgress: true,
    storageKey: "tour:ai-generation-intro:dismissed",
  },
  steps: [
    {
      element: "[data-tour='ai-header']",
      popover: {
        title: "Create from URL",
        description:
          "This workflow imports a source article or video and turns it into content you can adapt for a Telegram channel.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='ai-prompt-input']",
      popover: {
        title: "Paste a Source URL",
        description:
          "Drop in an article or YouTube link here. The importer will extract the source material before creating a draft.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='ai-tone-selector']",
      popover: {
        title: "Choose the Destination Channel",
        description:
          "Pick which Telegram channel the draft is for so the imported content is created in the right workspace.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "[data-tour='ai-generate-btn']",
      popover: {
        title: "Start the Import",
        description:
          "Launch the import once the URL and channel are set. The job will move through extraction and generation in the background.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "[data-tour='ai-recent-imports']",
      popover: {
        title: "Recent Import Jobs",
        description:
          "Check recent imports here to see whether a job is pending, generating, completed, or needs another try.",
        side: "bottom",
        align: "start",
      },
    },
  ],
};
