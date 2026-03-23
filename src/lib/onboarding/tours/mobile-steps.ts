import type { TourId } from "@/lib/onboarding/tours";

interface MobileTourStep {
  title: string;
  description: string;
}

export const mobileTourSteps: Record<TourId, MobileTourStep[]> = {
  "dashboard-intro": [
    {
      title: "Welcome to Your Dashboard",
      description:
        "This is your content command center. Access all your posts, analytics, and AI tools from here.",
    },
    {
      title: "Create from URL",
      description:
        "Quickly import and adapt content from any URL. Our AI will analyze and optimize it for your Telegram channel.",
    },
    {
      title: "Quick Stats",
      description:
        "Track your content performance at a glance. View scheduled posts, published content, and engagement metrics.",
    },
    {
      title: "Recent Activity",
      description:
        "Access your recently created and edited posts. Click any item to continue working on it.",
    },
    {
      title: "Navigation",
      description:
        "Use the sidebar to explore all features: Content Library, Schedule, Analytics, and AI Generation tools.",
    },
  ],

  "content-library-intro": [
    {
      title: "Content Filters",
      description:
        "Filter your content by status, type, or date. Find exactly what you need in seconds.",
    },
    {
      title: "Your Content",
      description:
        "All your posts are displayed here. Each card shows the status, scheduled time, and quick actions.",
    },
    {
      title: "Search",
      description: "Search through all your content by keywords, tags, or content type.",
    },
    {
      title: "Bulk Actions",
      description:
        "Select multiple items to perform bulk operations like schedule, publish, or delete.",
    },
  ],

  "schedule-intro": [
    {
      title: "Content Calendar",
      description:
        "View your publishing schedule in a calendar or list format. See what's coming up at a glance.",
    },
    {
      title: "Add Schedule",
      description:
        "Click the 'New Schedule' button to schedule posts for optimal engagement times.",
    },
    {
      title: "Drag & Drop",
      description:
        "Easily reschedule posts by dragging them to a new time slot. Changes are saved automatically.",
    },
    {
      title: "Timezone Support",
      description:
        "Set your timezone to ensure posts are published at the right time for your audience.",
    },
  ],

  "analytics-intro": [
    {
      title: "Performance Overview",
      description:
        "Track your key metrics: total views, engagement rate, subscriber growth, and content reach.",
    },
    {
      title: "Trend Charts",
      description:
        "Visualize your performance over time. Spot trends and understand what content resonates with your audience.",
    },
    {
      title: "Best Posting Times",
      description:
        "See heatmaps of when your audience is most active. Optimize your posting schedule.",
    },
    {
      title: "Top Performing Content",
      description:
        "See your best-performing posts. Learn from what works and replicate that success.",
    },
    {
      title: "Channel Insights",
      description:
        "Understand who your audience is: demographics, active hours, and engagement patterns.",
    },
  ],

  "ai-generation-intro": [
    {
      title: "AI Content Generator",
      description:
        "Describe what you want to create. The AI will generate Telegram-ready content based on your input.",
    },
    {
      title: "URL Import",
      description:
        "Paste any URL to extract and adapt content. Works with articles, YouTube videos, and more.",
    },
    {
      title: "Channel Selection",
      description:
        "Select which channel to create content for. The AI will adapt the tone and style accordingly.",
    },
    {
      title: "Generate Content",
      description:
        "Click to generate your content. The AI will create optimized content for your channel.",
    },
    {
      title: "Edit & Publish",
      description:
        "Review AI-generated content, make edits, and publish directly to your Telegram channel.",
    },
  ],
};

export const tourNames: Record<TourId, string> = {
  "dashboard-intro": "Dashboard",
  "content-library-intro": "Content Library",
  "schedule-intro": "Schedule",
  "analytics-intro": "Analytics",
  "ai-generation-intro": "AI Generation",
};
