"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ChannelCard } from "./channel-card";
import { disconnectChannel } from "@/server/actions/channels";
import type { ChannelWithPostCount } from "@/server/actions/channels";

type ChannelListProps = {
  channels: ChannelWithPostCount[];
};

export function ChannelList({ channels: initialChannels }: ChannelListProps) {
  const t = useTranslations("channels");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [channels, setChannels] = useState<ChannelWithPostCount[]>(initialChannels);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDisconnect(id: string) {
    setDisconnectingId(id);
    setError(null);
    startTransition(async () => {
      try {
        const result = await disconnectChannel(id);
        if (result.success) {
          setChannels((prev) => prev.filter((c) => c.id !== id));
          router.refresh();
        } else {
          setError(result.error);
        }
      } catch {
        setError(tCommon("error"));
      }
      setDisconnectingId(null);
    });
  }

  if (channels.length === 0) {
    return (
      <div className="bg-muted/20 flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
        <div className="bg-muted mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="m22 8-6 4 6 4V8Z" />
            <rect x="2" y="6" width="14" height="12" rx="2" />
          </svg>
        </div>
        <h3 className="mb-1 font-semibold">{t("noChannels")}</h3>
        <p className="text-muted-foreground text-sm">{t("noChannelsDescription")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="channel-list">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            onDisconnect={handleDisconnect}
            isDisconnecting={disconnectingId === channel.id}
          />
        ))}
      </div>
    </div>
  );
}
