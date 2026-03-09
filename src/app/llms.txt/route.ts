import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/seo/site";

export function GET() {
  const siteUrl = getSiteUrl();

  return new NextResponse(
    [
      "# Teleflow",
      "",
      "> Telegram-first content operating system for creators, teams, and agencies.",
      "",
      "## Primary audience",
      "- Telegram channel owners who are tired of manual content operations",
      "- Media teams managing Telegram publishing workflows",
      "- Agencies running content production and scheduling for clients",
      "",
      "## Important pages",
      `- ${siteUrl}/ru`,
      `- ${siteUrl}/en`,
      `- ${siteUrl}/ru/solutions/telegram-post-scheduler`,
      `- ${siteUrl}/ru/solutions/telegram-content-calendar`,
      `- ${siteUrl}/ru/solutions/telegram-channel-management`,
      "",
      "## Product summary",
      "- Telegram-native capture of ideas, voice notes, links, and source material",
      "- AI-assisted drafting and adaptation tied to the creator's workflow",
      "- Scheduling, recurring slots, and analytics in one operating system",
      "",
      "## Language availability",
      "- Russian",
      "- English",
    ].join("\n"),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
}
