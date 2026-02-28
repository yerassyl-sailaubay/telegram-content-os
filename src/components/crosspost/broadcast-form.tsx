"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Radio, Calendar, CheckCircle2, Loader2, Send, Clock } from "lucide-react";
import { listTelegramPostsForCrosspost, createBroadcastAction } from "@/server/actions/crosspost";
import type { TelegramPostWithChannel, Platform } from "@/server/actions/crosspost";
import { formatDistanceToNow } from "@/lib/date-utils";

type BroadcastFormProps = {
  connectedPlatforms: Platform[];
};

type BroadcastStep = "select" | "confirm" | "success";

export function BroadcastForm({ connectedPlatforms }: BroadcastFormProps) {
  const t = useTranslations("broadcast");
  const ct = useTranslations("crosspost");

  const [step, setStep] = useState<BroadcastStep>("select");
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState<TelegramPostWithChannel[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedPost, setSelectedPost] = useState<TelegramPostWithChannel | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [useSchedule, setUseSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [error, setError] = useState<string | null>(null);
  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoadingPosts, startLoadingPosts] = useTransition();

  function loadPosts(searchTerm = "") {
    startLoadingPosts(async () => {
      const result = await listTelegramPostsForCrosspost({
        search: searchTerm,
        perPage: 30,
      });
      if (result.success) {
        setPosts(result.data.posts);
      }
      setHasLoaded(true);
    });
  }

  useEffect(() => {
    loadPosts();
     
  }, []);

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  }

  function handleContinue() {
    if (!selectedPost || selectedPlatforms.length === 0) return;
    setStep("confirm");
  }

  function handleBroadcast() {
    if (!selectedPost || selectedPlatforms.length === 0) return;
    setError(null);

    startTransition(async () => {
      const result = await createBroadcastAction({
        postId: selectedPost.id,
        platforms: selectedPlatforms,
        channelId: selectedPost.channelId ?? undefined,
        scheduledAt: useSchedule && scheduledAt ? scheduledAt : undefined,
        timezone: useSchedule ? timezone : undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setBroadcastId(result.data.broadcastId);
      setStep("success");
    });
  }

  function handleReset() {
    setStep("select");
    setSelectedPost(null);
    setSelectedPlatforms([]);
    setScheduledAt("");
    setUseSchedule(false);
    setError(null);
    setBroadcastId(null);
  }

  const canContinue = selectedPost !== null && selectedPlatforms.length > 0;

  // Success state
  if (step === "success") {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center space-y-6 py-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-green-500 bg-green-500/10">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">{t("broadcastStarted")}</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("broadcastStartedDescription", {
              count: selectedPlatforms.length,
            })}
          </p>
          {broadcastId && (
            <p className="text-muted-foreground mt-2 font-mono text-xs">{broadcastId}</p>
          )}
        </div>
        <div className="flex gap-2">
          {selectedPlatforms.map((p) => (
            <Badge key={p} variant="secondary" className="capitalize">
              {p === "linkedin" ? ct("linkedin") : ct("twitter")}
            </Badge>
          ))}
        </div>
        <Button onClick={handleReset}>{t("newBroadcast")}</Button>
      </div>
    );
  }

  // Confirm state
  if (step === "confirm") {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">{t("confirmTitle")}</h3>
          <p className="text-muted-foreground mt-1 text-sm">{t("confirmDescription")}</p>
        </div>

        {/* Selected post preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t("sourcePost")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="line-clamp-4 text-sm">{selectedPost?.contentRaw ?? "—"}</p>
            {selectedPost?.channelId && (
              <p className="text-muted-foreground mt-2 text-xs">
                {ct("channel")}: {selectedPost.channelTitle}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Target platforms */}
        <div>
          <Label className="mb-2 block">{t("targetPlatforms")}</Label>
          <div className="flex gap-2">
            {selectedPlatforms.map((p) => (
              <Badge key={p} variant="secondary" className="capitalize">
                {p === "linkedin" ? ct("linkedin") : ct("twitter")}
              </Badge>
            ))}
          </div>
        </div>

        {/* Schedule option */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUseSchedule(!useSchedule)}
              className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-sm transition-all ${
                useSchedule
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <Clock className="h-4 w-4" />
              {t("scheduleForLater")}
            </button>
          </div>

          {useSchedule && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="broadcast-scheduled-at">{ct("selectDatetime")}</Label>
                <Input
                  id="broadcast-scheduled-at"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="broadcast-timezone">{ct("timezone")}</Label>
                <Input
                  id="broadcast-timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Asia/Almaty"
                />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" onClick={() => setStep("select")}>
            {ct("back")}
          </Button>
          <Button onClick={handleBroadcast} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("broadcasting")}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {t("broadcastNow")}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Select state (default)
  return (
    <div className="space-y-6">
      {/* Platform multi-select */}
      <div>
        <p className="mb-3 text-sm font-medium">{t("selectPlatforms")}</p>
        <div className="flex gap-3">
          {(["linkedin", "twitter"] as Platform[]).map((platform) => {
            const isConnected = connectedPlatforms.includes(platform);
            const isSelected = selectedPlatforms.includes(platform);

            return (
              <button
                key={platform}
                disabled={!isConnected}
                onClick={() => togglePlatform(platform)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  !isConnected
                    ? "border-border cursor-not-allowed opacity-50"
                    : isSelected
                      ? platform === "linkedin"
                        ? "border-[#0a66c2] bg-[#0a66c2]/10 text-[#0a66c2]"
                        : "border-[#1d9bf0] bg-[#1d9bf0]/10 text-[#1d9bf0]"
                      : "border-border hover:border-muted-foreground/50"
                }`}
              >
                {platform === "linkedin" ? (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                )}
                <span>{platform === "linkedin" ? ct("linkedin") : ct("twitter")}</span>
                {isSelected && <CheckCircle2 className="h-4 w-4" />}
                {!isConnected && <span className="text-xs">({t("notConnected")})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          loadPosts(search);
        }}
        className="relative"
      >
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ct("searchPlaceholder")}
          className="pl-9"
        />
      </form>

      {/* Posts list */}
      <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
        {isLoadingPosts ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-muted h-24 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed">
            <Radio className="text-muted-foreground mb-2 h-8 w-8" />
            <p className="text-sm font-medium">{ct("noPostsFound")}</p>
            <p className="text-muted-foreground mt-1 text-xs">{ct("noPostsDescription")}</p>
          </div>
        ) : (
          posts.map((post) => (
            <Card
              key={post.id}
              className={`hover:border-primary/50 cursor-pointer transition-all ${
                selectedPost?.id === post.id
                  ? "border-primary bg-primary/5 ring-primary ring-1"
                  : ""
              }`}
              onClick={() => setSelectedPost(post)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {post.channelTitle && (
                      <div className="mb-1.5 flex items-center gap-1">
                        <Radio className="text-muted-foreground h-3 w-3 shrink-0" />
                        <span className="text-muted-foreground truncate text-xs">
                          {post.channelTitle}
                        </span>
                      </div>
                    )}
                    <p className="line-clamp-3 text-sm">{post.contentRaw ?? "\u2014"}</p>
                  </div>
                  {selectedPost?.id === post.id && (
                    <div className="bg-primary shrink-0 rounded-full p-1">
                      <CheckCircle2 className="text-primary-foreground h-3 w-3" />
                    </div>
                  )}
                </div>
                {post.postedAt && (
                  <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {ct("postedAt")}: {formatDistanceToNow(new Date(post.postedAt))}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t pt-4">
        {selectedPost && (
          <p className="text-muted-foreground text-sm">
            {ct("selectedPost")}:{" "}
            <span className="text-foreground font-medium">
              {selectedPost.contentRaw?.slice(0, 40)}
              {(selectedPost.contentRaw?.length ?? 0) > 40 ? "\u2026" : ""}
            </span>
          </p>
        )}
        <div className="ml-auto flex items-center gap-2">
          {selectedPlatforms.length > 0 && (
            <Badge variant="outline">
              {t("platformCount", { count: selectedPlatforms.length })}
            </Badge>
          )}
          <Button disabled={!canContinue || isLoadingPosts} onClick={handleContinue}>
            {t("continue")}
          </Button>
        </div>
      </div>
    </div>
  );
}
