"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { ContentCard } from "@/components/content/content-card";
import { ContentFilters, type ContentStatusTab } from "@/components/content/content-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Lightbulb,
  FileEdit,
  Send,
  Archive,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import { getContentByStatus, listContent, type ContentItem } from "@/server/actions/content";

type Channel = {
  id: string;
  name: string;
};

type ContentLibraryClientProps = {
  initialItems: ContentItem[];
  channels: Channel[];
};

const EMPTY_STATE_CONFIG: Record<
  ContentStatusTab,
  {
    titleKey: string;
    descKey: string;
    icon: LucideIcon;
  }
> = {
  all: { titleKey: "emptyAll", descKey: "emptyAllDescription", icon: FileText },
  idea: { titleKey: "emptyIdeas", descKey: "emptyIdeasDescription", icon: Lightbulb },
  draft: { titleKey: "emptyDrafts", descKey: "emptyDraftsDescription", icon: FileEdit },
  published: { titleKey: "emptyPublished", descKey: "emptyPublishedDescription", icon: Send },
  scheduled: {
    titleKey: "emptyScheduled",
    descKey: "emptyScheduledDescription",
    icon: CalendarClock,
  },
  archived: { titleKey: "emptyArchived", descKey: "emptyArchivedDescription", icon: Archive },
};

export function ContentLibraryClient({ initialItems, channels }: ContentLibraryClientProps) {
  const t = useTranslations("content");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = React.useState<ContentStatusTab>("all");
  const [selectedChannelId, setSelectedChannelId] = React.useState<string>("");
  const [items, setItems] = React.useState<ContentItem[]>(initialItems);
  const [error, setError] = React.useState<string | null>(null);

  async function fetchItems(tab: ContentStatusTab, channelId: string) {
    setError(null);
    try {
      if (tab === "all") {
        const result = await listContent({ perPage: 50 });
        if (result.success) {
          let filtered = result.data.items;
          if (channelId) {
            filtered = filtered.filter((item) => item.channelId === channelId);
          }
          setItems(filtered);
          return;
        }
        setError(result.error);
      } else if (tab === "idea") {
        const result = await listContent({ perPage: 50 });
        if (result.success) {
          let filtered = result.data.items.filter((item) => item.sourceType === "idea");
          if (channelId) {
            filtered = filtered.filter((item) => item.channelId === channelId);
          }
          setItems(filtered);
          return;
        }
        setError(result.error);
      } else {
        const result = await getContentByStatus(
          tab as "draft" | "published" | "archived" | "scheduled",
        );
        if (result.success) {
          let filtered = result.data;
          if (channelId) {
            filtered = filtered.filter((item) => item.channelId === channelId);
          }
          setItems(filtered);
          return;
        }
        setError(result.error);
      }
    } catch {
      setError(tCommon("error"));
    }
  }

  function handleTabChange(tab: ContentStatusTab) {
    setActiveTab(tab);
    startTransition(() => {
      fetchItems(tab, selectedChannelId);
    });
  }

  function handleChannelChange(channelId: string) {
    setSelectedChannelId(channelId);
    startTransition(() => {
      fetchItems(activeTab, channelId);
    });
  }

  function handleItemArchived(id: string) {
    setItems((prev) => {
      if (activeTab === "archived") {
        return prev;
      }
      return prev.filter((item) => item.id !== id);
    });
  }

  const emptyConfig = EMPTY_STATE_CONFIG[activeTab];

  return (
    <div className="space-y-6" data-testid="content-library">
      <ContentFilters
        activeTab={activeTab}
        onTabChange={handleTabChange}
        channels={channels}
        selectedChannelId={selectedChannelId}
        onChannelChange={handleChannelChange}
      />

      {error && <p className="text-destructive text-sm">{error}</p>}

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[160px] rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={emptyConfig.icon as LucideIcon}
          title={t(emptyConfig.titleKey as Parameters<typeof t>[0])}
          description={t(emptyConfig.descKey as Parameters<typeof t>[0])}
          data-testid={`empty-state-${activeTab}`}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="content-grid">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} onArchived={handleItemArchived} />
          ))}
        </div>
      )}
    </div>
  );
}
