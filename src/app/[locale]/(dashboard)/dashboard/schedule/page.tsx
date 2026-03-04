import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { CalendarGaps } from "@/components/calendar/calendar-gaps";
import { listChannels } from "@/server/actions/channels";
import { getCalendarSuggestions } from "@/server/actions/calendar";

export default async function SchedulePage() {
  const t = await getTranslations("nav");

  const channelsResult = await listChannels();
  const rawChannels = channelsResult.success ? channelsResult.data : [];

  const channels = rawChannels.map((ch) => ({
    id: ch.id,
    name: ch.title ?? ch.username ?? ch.id,
  }));

  const firstChannelId = channels[0]?.id;

  const suggestionsResult = firstChannelId ? await getCalendarSuggestions(firstChannelId) : null;

  const initialSuggestions = suggestionsResult?.success ? suggestionsResult.data : [];

  return (
    <>
      <PageHeader title={t("schedule")} />
      <div className="px-6 pb-10">
        <CalendarGaps
          channels={channels}
          initialChannelId={firstChannelId}
          initialSuggestions={initialSuggestions}
        />
      </div>
    </>
  );
}
