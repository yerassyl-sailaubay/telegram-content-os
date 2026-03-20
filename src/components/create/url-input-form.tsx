"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Link2, Youtube, Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  createFromUrl,
  listExternalSourceJobs,
  type ExternalSourceJob,
} from "@/server/actions/sources";
import { listChannels } from "@/server/actions/channels";
import type { ChannelWithPostCount } from "@/server/actions/channels";
import { isYouTubeUrl } from "@/lib/sources/url-parser";

export function UrlInputForm() {
  const t = useTranslations("createFromUrl");

  const [url, setUrl] = useState("");
  const [channelId, setChannelId] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [channels, setChannels] = useState<ChannelWithPostCount[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isLoadingChannels, startLoadingChannels] = useTransition();
  const [jobs, setJobs] = useState<ExternalSourceJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);

  const refreshJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    setJobsError(null);
    try {
      const result = await listExternalSourceJobs();
      if (result.success) {
        setJobs(result.data);
      } else {
        setJobsError(result.error);
      }
    } catch {
      setJobsError(t("errorTitle"));
    } finally {
      setIsLoadingJobs(false);
    }
  }, [t]);

  useEffect(() => {
    startLoadingChannels(async () => {
      const result = await listChannels();
      if (result.success) {
        setChannels(result.data);
        if (result.data.length === 1) {
          setChannelId(result.data[0].id);
        }
      }
    });
    void refreshJobs();
  }, [refreshJobs]);

  useEffect(() => {
    const hasActiveJobs = jobs.some((job) =>
      ["pending", "extracting", "extracted", "generating"].includes(job.processingStatus),
    );

    if (!hasActiveJobs) return;

    const interval = setInterval(() => {
      void refreshJobs();
    }, 5000);

    return () => clearInterval(interval);
  }, [jobs, refreshJobs]);

  function validate(): boolean {
    let valid = true;

    if (!url.trim()) {
      setUrlError(t("urlRequired"));
      valid = false;
    } else {
      setUrlError(null);
    }

    if (!channelId) {
      setChannelError(t("channelRequired"));
      valid = false;
    } else {
      setChannelError(null);
    }

    return valid;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validate()) return;

    startTransition(async () => {
      const result = await createFromUrl(url.trim(), channelId);

      if (result.success) {
        toast.success(t("successTitle"), {
          description: t("successDescription"),
        });
        setUrl("");
        setChannelId(channels.length === 1 ? channels[0].id : "");
        setUrlError(null);
        setChannelError(null);
        void refreshJobs();
      } else {
        toast.error(t("errorTitle"), {
          description: result.error,
        });
      }
    });
  }

  const urlType = url.trim()
    ? isYouTubeUrl(url.trim())
      ? "youtube"
      : url.trim().startsWith("http")
        ? "article"
        : null
    : null;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="text-primary size-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="url-input">{t("urlLabel")}</Label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                {urlType === "youtube" ? (
                  <Youtube className="size-4 text-red-500" />
                ) : urlType === "article" ? (
                  <Globe className="text-muted-foreground size-4" />
                ) : (
                  <Link2 className="text-muted-foreground size-4" />
                )}
              </div>
              <Input
                id="url-input"
                data-testid="url-input"
                type="url"
                placeholder={t("urlPlaceholder")}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                disabled={isPending}
                className={cn(
                  "pl-9",
                  urlError && "border-destructive focus-visible:ring-destructive/30",
                )}
                aria-describedby={urlError ? "url-error" : "url-hint"}
                aria-invalid={!!urlError}
              />
            </div>
            {urlError ? (
              <p id="url-error" className="text-destructive text-sm">
                {urlError}
              </p>
            ) : (
              <p id="url-hint" className="text-muted-foreground text-xs">
                {t("urlHint")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-select">{t("channelLabel")}</Label>
            {isLoadingChannels ? (
              <div className="border-input bg-background flex h-9 w-full items-center gap-2 rounded-md border px-3 py-2 text-sm opacity-70">
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
                <span className="text-muted-foreground">{t("channelPlaceholder")}</span>
              </div>
            ) : channels.length === 0 ? (
              <div className="border-border bg-muted/30 rounded-md border border-dashed p-4 text-center">
                <p className="text-sm font-medium">{t("noChannels")}</p>
                <p className="text-muted-foreground mt-1 text-xs">{t("noChannelsDescription")}</p>
              </div>
            ) : (
              <Select
                value={channelId}
                onValueChange={(val) => {
                  setChannelId(val);
                  if (channelError) setChannelError(null);
                }}
                disabled={isPending}
              >
                <SelectTrigger
                  id="channel-select"
                  data-testid="channel-select"
                  className={cn(
                    "w-full",
                    channelError && "border-destructive focus-visible:ring-destructive/30",
                  )}
                  aria-invalid={!!channelError}
                >
                  <SelectValue placeholder={t("channelPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      @{channel.username ?? channel.title ?? channel.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {channelError && (
              <p className="text-destructive text-sm" role="alert">
                {channelError}
              </p>
            )}
          </div>

          <Button
            type="submit"
            data-testid="submit-url"
            disabled={isPending || channels.length === 0}
            className="w-full sm:w-auto"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>

          <div className="border-t pt-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">{t("recentImports")}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void refreshJobs()}
                disabled={isLoadingJobs}
              >
                <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isLoadingJobs && "animate-spin")} />
                {t("refreshJobs")}
              </Button>
            </div>

            {jobsError && <p className="text-destructive mb-2 text-sm">{jobsError}</p>}

            {jobs.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("noRecentImports")}</p>
            ) : (
              <div className="space-y-2">
                {jobs.map((job) => (
                  <div key={job.id} className="rounded-md border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{job.title || job.sourceUrl}</p>
                      <span className="text-muted-foreground text-xs">
                        {job.createdAt ? new Date(job.createdAt).toLocaleString() : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-muted-foreground truncate text-xs">{job.sourceUrl}</p>
                      <span className="bg-muted rounded-full px-2 py-0.5 text-xs">
                        {t(
                          `status${job.processingStatus[0]!.toUpperCase()}${job.processingStatus.slice(1)}` as Parameters<
                            typeof t
                          >[0],
                        )}
                      </span>
                    </div>
                    {job.processingStatus === "failed" && (
                      <p className="text-destructive mt-2 text-xs">{t("failedImportMessage")}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
