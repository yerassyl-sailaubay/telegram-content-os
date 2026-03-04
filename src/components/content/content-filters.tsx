"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ContentStatusTab = "all" | "draft" | "published" | "archived" | "scheduled" | "idea";

type Channel = {
  id: string;
  name: string;
};

type ContentFiltersProps = {
  activeTab: ContentStatusTab;
  onTabChange: (tab: ContentStatusTab) => void;
  channels?: Channel[];
  selectedChannelId?: string;
  onChannelChange?: (channelId: string) => void;
};

const STATUS_TABS: { value: ContentStatusTab; labelKey: string }[] = [
  { value: "all", labelKey: "tabAll" },
  { value: "idea", labelKey: "tabIdeas" },
  { value: "draft", labelKey: "tabDrafts" },
  { value: "published", labelKey: "tabPublished" },
  { value: "scheduled", labelKey: "tabScheduled" },
  { value: "archived", labelKey: "tabArchived" },
];

export function ContentFilters({
  activeTab,
  onTabChange,
  channels,
  selectedChannelId,
  onChannelChange,
}: ContentFiltersProps) {
  const t = useTranslations("content");

  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid="content-filters"
    >
      <Tabs value={activeTab} onValueChange={(val) => onTabChange(val as ContentStatusTab)}>
        <TabsList className="h-9" data-testid="content-status-tabs">
          {STATUS_TABS.map(({ value, labelKey }) => (
            <TabsTrigger key={value} value={value} data-testid={`tab-${value}`}>
              {t(labelKey as Parameters<typeof t>[0])}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {channels && channels.length > 0 && onChannelChange && (
        <Select
          value={selectedChannelId ?? "__all__"}
          onValueChange={(val) => onChannelChange(val === "__all__" ? "" : val)}
        >
          <SelectTrigger className="w-[180px]" data-testid="content-channel-filter">
            <SelectValue placeholder={t("filterChannel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("filterChannel")}</SelectItem>
            {channels.map((ch) => (
              <SelectItem key={ch.id} value={ch.id}>
                {ch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
