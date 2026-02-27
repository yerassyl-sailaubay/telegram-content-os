"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Radio, Calendar, ChevronRight } from "lucide-react";
import { listTelegramPostsForCrosspost } from "@/server/actions/crosspost";
import type {
  TelegramPostWithChannel,
  Platform,
} from "@/server/actions/crosspost";
import { formatDistanceToNow } from "@/lib/date-utils";

type StepSelectPostProps = {
  onNext: (post: TelegramPostWithChannel, platform: Platform) => void;
};

export function StepSelectPost({ onNext }: StepSelectPostProps) {
  const t = useTranslations("crosspost");
  const [search, setSearch] = useState("");
  const [selectedPost, setSelectedPost] =
    useState<TelegramPostWithChannel | null>(null);
  const [selectedPlatform, setSelectedPlatform] =
    useState<Platform | null>(null);
  const [posts, setPosts] = useState<TelegramPostWithChannel[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  function loadPosts(searchTerm = "") {
    startTransition(async () => {
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

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadPosts(search);
  }

  // Load on mount
  // Load on mount via useEffect to avoid calling startTransition during render
  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canContinue = selectedPost !== null && selectedPlatform !== null;

  return (
    <div className="space-y-6">
      {/* Platform selector */}
      <div>
        <p className="mb-3 text-sm font-medium">{t("selectPlatform")}</p>
        <div className="flex gap-3">
          {(["linkedin", "twitter"] as Platform[]).map((platform) => (
            <button
              key={platform}
              onClick={() => setSelectedPlatform(platform)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                selectedPlatform === platform
                  ? platform === "linkedin"
                    ? "border-[#0a66c2] bg-[#0a66c2]/10 text-[#0a66c2]"
                    : "border-[#1d9bf0] bg-[#1d9bf0]/10 text-[#1d9bf0]"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              {platform === "linkedin" ? (
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              )}
              {platform === "linkedin" ? t("linkedin") : t("twitter")}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
        />
      </form>

      {/* Posts list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed">
            <Radio className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">{t("noPostsFound")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("noPostsDescription")}
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <Card
              key={post.id}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                selectedPost?.id === post.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : ""
              }`}
              onClick={() => setSelectedPost(post)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* Channel badge */}
                    {post.channelTitle && (
                      <div className="mb-1.5 flex items-center gap-1">
                        <Radio className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate text-xs text-muted-foreground">
                          {post.channelTitle}
                        </span>
                      </div>
                    )}
                    {/* Post preview */}
                    <p className="line-clamp-3 text-sm">
                      {post.contentRaw ?? "—"}
                    </p>
                  </div>
                  {selectedPost?.id === post.id && (
                    <div className="shrink-0 rounded-full bg-primary p-1">
                      <ChevronRight className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
                {post.postedAt && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {t("postedAt")}:{" "}
                      {formatDistanceToNow(new Date(post.postedAt))}
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
          <p className="text-sm text-muted-foreground">
            {t("selectedPost")}:{" "}
            <span className="font-medium text-foreground">
              {selectedPost.contentRaw?.slice(0, 40)}
              {(selectedPost.contentRaw?.length ?? 0) > 40 ? "…" : ""}
            </span>
          </p>
        )}
        <div className="ml-auto">
          <Button
            disabled={!canContinue || isPending}
            onClick={() => {
              if (selectedPost && selectedPlatform) {
                onNext(selectedPost, selectedPlatform);
              }
            }}
          >
            {t("continueToAdapt")}
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
