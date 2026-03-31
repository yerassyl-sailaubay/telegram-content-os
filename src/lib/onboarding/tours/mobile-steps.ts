import type { TourId } from "@/lib/onboarding/tours";

interface MobileTourStep {
  title: string;
  description: string;
}

export const mobileTourSteps: Record<TourId, MobileTourStep[]> = {
  "dashboard-intro": [
    {
      title: "Dashboard Snapshot",
      description:
        "This hero section gives you a quick read on ideas, drafts, scheduled posts, and publishing gaps.",
    },
    {
      title: "Quick Actions",
      description:
        "Jump straight into the most common workflows: writing a post, importing from a URL, or opening your schedule.",
    },
    {
      title: "Capture Ideas Fast",
      description:
        "Use this card to save raw ideas quickly and keep an eye on your current AI-assisted creation usage.",
    },
    {
      title: "Upcoming Queue",
      description:
        "This panel shows what is scheduled next so you can spot empty days before your calendar goes quiet.",
    },
    {
      title: "Navigation",
      description:
        "Use the sidebar to move between posts, scheduling, analytics, channels, and settings from any dashboard page.",
    },
  ],

  "content-library-intro": [
    {
      title: "Content Filters",
      description:
        "Switch between ideas, drafts, scheduled posts, published items, and channel-specific views from here.",
    },
    {
      title: "Search",
      description:
        "Search through saved titles and body text to find the exact draft or published post you want to reopen.",
    },
    {
      title: "Content Table",
      description:
        "When content is available, this table becomes the fastest way to review status, source, and row-level actions.",
    },
    {
      title: "Visible Columns",
      description:
        "Customize which columns stay visible in the table so the library matches the way you like to review content.",
    },
  ],

  "schedule-intro": [
    {
      title: "Calendar Navigation",
      description:
        "Move between dates, jump back to today, and switch between month, week, and day views as you plan.",
    },
    {
      title: "Timezone",
      description:
        "Set the timezone you want the calendar to use so scheduled posts line up with your audience timing.",
    },
    {
      title: "Create a Schedule",
      description:
        "Start a new scheduled post from here and continue into the composer with the chosen date and time.",
    },
    {
      title: "Publishing Calendar",
      description:
        "See your scheduled posts on the calendar, open busy days, and adjust plans directly from the timeline.",
    },
  ],

  "analytics-intro": [
    {
      title: "Channel and Date Range",
      description:
        "Pick the Telegram channel you want to inspect and switch the time window before reading the rest of the page.",
    },
    {
      title: "Headline Insights",
      description:
        "These cards surface the fastest read on growth, your strongest posting window, and your current top post.",
    },
    {
      title: "Best Posting Time",
      description:
        "Use this insight to spot the weekday and hour that currently earn the strongest average view count.",
    },
    {
      title: "Growth and Heatmap",
      description:
        "The chart and heatmap help you compare growth over time and see which publishing slots perform best.",
    },
    {
      title: "Top Posts Table",
      description:
        "Sort your strongest posts by views, reactions, forwards, or date to learn which content patterns are working.",
    },
  ],

  "ai-generation-intro": [
    {
      title: "Create from URL",
      description:
        "This workflow imports a source article or video and turns it into content you can adapt for a Telegram channel.",
    },
    {
      title: "Paste a Source URL",
      description:
        "Drop in an article or YouTube link here. The importer will extract the source material before creating a draft.",
    },
    {
      title: "Choose the Destination Channel",
      description:
        "Pick which Telegram channel the draft is for so the imported content is created in the right workspace.",
    },
    {
      title: "Start the Import",
      description:
        "Launch the import once the URL and channel are set. The job will move through extraction and generation in the background.",
    },
    {
      title: "Recent Import Jobs",
      description:
        "Check recent imports here to see whether a job is pending, generating, completed, or needs another try.",
    },
  ],
};

export const tourNames: Record<TourId, string> = {
  "dashboard-intro": "Dashboard",
  "content-library-intro": "Content Library",
  "schedule-intro": "Schedule",
  "analytics-intro": "Analytics",
  "ai-generation-intro": "Create from URL",
};
