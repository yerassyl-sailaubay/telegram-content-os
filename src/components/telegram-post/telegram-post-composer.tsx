"use client";

import { useState, useTransition, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ImagePlus,
  Sparkles,
  X,
  RefreshCw,
  CalendarClock,
  FileCheck,
} from "lucide-react";
import {
  postToTelegram,
  uploadImageForPost,
  saveTelegramDraft,
  scheduleTelegramPost,
} from "@/server/actions/telegram-post";
import {
  generatePostWithAI,
  analyzeChannelVoice,
  getChannelProfile,
} from "@/server/actions/ai-writer";
import { cn } from "@/lib/utils";

interface Channel {
  id: string;
  title: string | null;
  username: string | null;
  memberCount: number | null;
}

interface ChannelProfile {
  niche: string;
  tone: string;
  topTopics: string[];
  generatedAt: Date;
}

interface TelegramDraftItem {
  id: string;
  content: string | null;
  channelId: string | null;
  sourceMetadata: unknown;
}

interface TelegramComposerMetadata {
  parseMode?: "HTML" | "MarkdownV2";
  imageUrl: string | null;
}

interface TelegramPostComposerProps {
  initialChannels: Channel[];
  initialDraft?: TelegramDraftItem | null;
  initialSchedule?: { scheduledAt: string; timezone: string } | null;
}

function readTelegramComposerMetadata(sourceMetadata: unknown): TelegramComposerMetadata {
  if (!sourceMetadata || typeof sourceMetadata !== "object" || Array.isArray(sourceMetadata)) {
    return { parseMode: undefined, imageUrl: null };
  }

  const metadata = sourceMetadata as Record<string, unknown>;
  const composer = metadata.telegramComposer;

  if (!composer || typeof composer !== "object" || Array.isArray(composer)) {
    return { parseMode: undefined, imageUrl: null };
  }

  const parsedComposer = composer as Record<string, unknown>;
  const parseModeRaw = parsedComposer.parseMode;
  const imageUrlRaw = parsedComposer.imageUrl;

  const parseMode =
    parseModeRaw === "HTML" || parseModeRaw === "MarkdownV2" ? parseModeRaw : undefined;

  return {
    parseMode,
    imageUrl: typeof imageUrlRaw === "string" && imageUrlRaw.length > 0 ? imageUrlRaw : null,
  };
}

export function TelegramPostComposer({
  initialChannels,
  initialDraft = null,
  initialSchedule = null,
}: TelegramPostComposerProps) {
  const t = useTranslations("telegramPost");
  const tAi = useTranslations("aiWriter");
  const tCommon = useTranslations("common");

  const initialMetadata = readTelegramComposerMetadata(initialDraft?.sourceMetadata);

  const prefillSchedule = initialSchedule?.scheduledAt
    ? (() => {
        try {
          const date = new Date(initialSchedule.scheduledAt);
          return {
            date: date.toISOString().split("T")[0],
            time: date.toTimeString().slice(0, 5),
          };
        } catch {
          return null;
        }
      })()
    : null;

  const [channels] = useState<Channel[]>(initialChannels);
  const [draftId, setDraftId] = useState<string | null>(initialDraft?.id ?? null);
  const [selectedChannel, setSelectedChannel] = useState<string>(initialDraft?.channelId ?? "");
  const [content, setContent] = useState(initialDraft?.content ?? "");
  const [parseMode, setParseMode] = useState<"HTML" | "MarkdownV2" | undefined>(
    initialMetadata.parseMode,
  );
  const [imageUrl, setImageUrl] = useState<string | null>(initialMetadata.imageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [composeMode, setComposeMode] = useState<"post" | "schedule">(
    prefillSchedule ? "schedule" : "post",
  );
  const [scheduleDate, setScheduleDate] = useState(prefillSchedule?.date ?? "");
  const [scheduleTime, setScheduleTime] = useState(prefillSchedule?.time ?? "");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // AI Writer state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiTone, setAiTone] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [channelProfile, setChannelProfile] = useState<ChannelProfile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = content.length;
  const maxChars = 4096; // Telegram message limit
  const minScheduleDate = new Date().toISOString().split("T")[0];

  function resolveErrorMessage(error: unknown): string {
    return error instanceof Error && error.message ? error.message : tCommon("error");
  }

  function canSubmitComposer() {
    return Boolean(selectedChannel && (content.trim() || imageUrl) && charCount <= maxChars);
  }

  function buildScheduleIso(): { iso: string | null; error: string | null } {
    if (!scheduleDate || !scheduleTime) {
      return { iso: null, error: t("scheduleDateTimeRequired") };
    }

    const scheduledDate = new Date(`${scheduleDate}T${scheduleTime}:00`);

    if (Number.isNaN(scheduledDate.getTime())) {
      return { iso: null, error: t("scheduleInvalidDate") };
    }

    if (scheduledDate.getTime() <= Date.now()) {
      return { iso: null, error: t("schedulePastError") };
    }

    return {
      iso: scheduledDate.toISOString(),
      error: null,
    };
  }

  const handleChannelChange = async (channelId: string) => {
    setSelectedChannel(channelId);
    setResult(null);

    if (!channelId) {
      setChannelProfile(null);
      return;
    }

    try {
      const profileResult = await getChannelProfile(channelId);
      if (!profileResult.success) {
        setChannelProfile(null);
        setResult({
          success: false,
          message: profileResult.error,
        });
        return;
      }

      setChannelProfile(profileResult.data);
    } catch (error) {
      setChannelProfile(null);
      setResult({
        success: false,
        message: resolveErrorMessage(error),
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setResult(null);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const result = await uploadImageForPost(formData);
      if (result.success) {
        setImageUrl(result.data.url);
      } else {
        setResult({ success: false, message: result.error });
      }
    } catch (error) {
      setResult({ success: false, message: resolveErrorMessage(error) });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (!canSubmitComposer()) return;

    setResult(null);
    startTransition(async () => {
      try {
        const response = await postToTelegram({
          channelId: selectedChannel,
          content: content.trim(),
          parseMode,
          imageUrl: imageUrl || undefined,
        });

        if (response.success) {
          setResult({
            success: true,
            message: t("postSuccess"),
          });
          setContent("");
          setImageUrl(null);
          setSelectedChannel("");
          setDraftId(null);
          setScheduleDate("");
          setScheduleTime("");
          setComposeMode("post");
        } else {
          setResult({
            success: false,
            message: response.error,
          });
        }
      } catch (error) {
        setResult({
          success: false,
          message: resolveErrorMessage(error),
        });
      }
    });
  };

  const handleSaveDraft = async () => {
    if (!content.trim() && !imageUrl) return;

    setIsSavingDraft(true);
    setResult(null);

    try {
      const response = await saveTelegramDraft({
        contentId: draftId ?? undefined,
        channelId: selectedChannel || undefined,
        content: content.trim(),
        parseMode,
        imageUrl: imageUrl || undefined,
      });

      if (response.success) {
        setDraftId(response.data.id);
        setResult({ success: true, message: t("draftSaved") });
      } else {
        setResult({ success: false, message: response.error });
      }
    } catch (error) {
      setResult({ success: false, message: resolveErrorMessage(error) });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedChannel) {
      setResult({ success: false, message: t("selectChannelFirst") });
      return;
    }

    if (!content.trim() && !imageUrl) {
      setResult({ success: false, message: t("contentRequired") });
      return;
    }

    const { iso, error } = buildScheduleIso();
    if (error || !iso) {
      setResult({ success: false, message: error ?? tCommon("error") });
      return;
    }

    setIsScheduling(true);
    setResult(null);

    try {
      const response = await scheduleTelegramPost({
        contentId: draftId ?? undefined,
        channelId: selectedChannel,
        content: content.trim(),
        parseMode,
        imageUrl: imageUrl || undefined,
        scheduledAt: iso,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (response.success) {
        setDraftId(response.data.id);
        setResult({ success: true, message: t("scheduleSuccess") });
      } else {
        setResult({ success: false, message: response.error });
      }
    } catch (error) {
      setResult({ success: false, message: resolveErrorMessage(error) });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleAnalyzeChannel = async () => {
    if (!selectedChannel) return;
    setIsAnalyzing(true);
    setResult(null);
    try {
      const analysisResult = await analyzeChannelVoice(selectedChannel);
      if (!analysisResult.success) {
        setResult({
          success: false,
          message: analysisResult.error,
        });
        return;
      }

      setChannelProfile({ ...analysisResult.data, generatedAt: new Date() });
    } catch (error) {
      setResult({
        success: false,
        message: resolveErrorMessage(error),
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!selectedChannel || !aiTopic.trim()) return;

    setIsGenerating(true);
    setResult(null);
    try {
      const result = await generatePostWithAI({
        channelId: selectedChannel,
        topic: aiTopic.trim(),
        tone: aiTone || undefined,
      });

      if (result.success) {
        const hashtags = result.data.suggestedHashtags.join(" ");
        setContent(result.data.content + (hashtags ? "\n\n" + hashtags : ""));
        setAiDialogOpen(false);
        setAiTopic("");
        setResult({
          success: true,
          message: tAi("generatedSuccess"),
        });
      } else {
        setResult({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: resolveErrorMessage(error),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (channels.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <AlertCircle className="text-muted-foreground h-12 w-12" />
            <div>
              <p className="text-lg font-medium">{t("noChannels")}</p>
              <p className="text-muted-foreground text-sm">{t("connectChannelFirst")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Composer */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiDialogOpen(true)}
                disabled={!selectedChannel}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {tAi("generateWithAI")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Channel Selection */}
            <div className="space-y-2">
              <Label htmlFor="channel">{t("selectChannel")}</Label>
              <Select value={selectedChannel} onValueChange={handleChannelChange}>
                <SelectTrigger id="channel">
                  <SelectValue placeholder={t("selectChannelPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      <div className="flex items-center gap-2">
                        <span>{channel.title || channel.username || t("untitledChannel")}</span>
                        {channel.username && (
                          <span className="text-muted-foreground">@{channel.username}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Channel Profile Badge */}
              {selectedChannel && channelProfile && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="secondary">{channelProfile.niche}</Badge>
                  <Badge variant="outline">Tone: {channelProfile.tone}</Badge>
                </div>
              )}

              {/* Analyze Button */}
              {selectedChannel && !channelProfile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAnalyzeChannel}
                  disabled={isAnalyzing}
                  className="mt-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {tAi("analyzing")}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {tAi("analyzeChannel")}
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>{t("image")}</Label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {imageUrl ? (
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt="Upload preview"
                    className="h-40 w-full rounded-lg object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("uploading")}
                    </>
                  ) : (
                    <>
                      <ImagePlus className="mr-2 h-4 w-4" />
                      {t("addImage")}
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">{t("content")}</Label>
                <span
                  className={cn(
                    "text-xs",
                    charCount > maxChars ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {charCount}/{maxChars}
                </span>
              </div>
              <Textarea
                id="content"
                placeholder={t("contentPlaceholder")}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px] resize-none"
                maxLength={maxChars}
              />
            </div>

            {/* Format Options */}
            <div className="space-y-2">
              <Label>{t("formatting")}</Label>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={parseMode === undefined ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => setParseMode(undefined)}
                >
                  {t("plainText")}
                </Badge>
                <Badge
                  variant={parseMode === "HTML" ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => setParseMode("HTML")}
                >
                  HTML
                </Badge>
                <Badge
                  variant={parseMode === "MarkdownV2" ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => setParseMode("MarkdownV2")}
                >
                  Markdown
                </Badge>
              </div>
            </div>

            {/* Draft + Schedule Controls */}
            <div className="space-y-3 rounded-lg border p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="w-full"
                  data-testid="save-draft-button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft || (!content.trim() && !imageUrl) || charCount > maxChars}
                >
                  {isSavingDraft ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("savingDraft")}
                    </>
                  ) : (
                    <>
                      <FileCheck className="mr-2 h-4 w-4" />
                      {t("saveDraft")}
                    </>
                  )}
                </Button>

                <Button
                  variant={composeMode === "schedule" ? "default" : "outline"}
                  className="w-full"
                  data-testid="schedule-mode-button"
                  onClick={() =>
                    setComposeMode((prev) => (prev === "schedule" ? "post" : "schedule"))
                  }
                >
                  <CalendarClock className="mr-2 h-4 w-4" />
                  {t("scheduleMode")}
                </Button>
              </div>

              {composeMode === "schedule" && (
                <div className="space-y-3" data-testid="schedule-options">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="schedule-date">{t("scheduleDate")}</Label>
                      <Input
                        id="schedule-date"
                        data-testid="schedule-date-input"
                        type="date"
                        value={scheduleDate}
                        min={minScheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schedule-time">{t("scheduleTime")}</Label>
                      <Input
                        id="schedule-time"
                        data-testid="schedule-time-input"
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    data-testid="schedule-submit-button"
                    onClick={handleSchedule}
                    disabled={
                      isScheduling || !canSubmitComposer() || !scheduleDate || !scheduleTime
                    }
                  >
                    {isScheduling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("schedulingPost")}
                      </>
                    ) : (
                      <>
                        <CalendarClock className="mr-2 h-4 w-4" />
                        {t("schedulePost")}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Result Message */}
            {result && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg p-3 text-sm",
                  result.success
                    ? "border border-green-500/50 bg-green-500/10 text-green-600"
                    : "border-destructive/50 bg-destructive/10 text-destructive border",
                )}
              >
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {result.message}
              </div>
            )}

            {/* Submit Button */}
            {composeMode === "post" && (
              <Button
                onClick={handleSubmit}
                disabled={!canSubmitComposer() || isPending}
                className="w-full"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("posting")}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {t("postToTelegram")}
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>{t("preview")}</CardTitle>
            <CardDescription>{t("previewDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <TelegramPreview
              content={content}
              imageUrl={imageUrl}
              channel={channels.find((c) => c.id === selectedChannel)}
              parseMode={parseMode}
            />
          </CardContent>
        </Card>
      </div>

      {/* AI Writer Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              {tAi("dialogTitle")}
            </DialogTitle>
            <DialogDescription>{tAi("dialogDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {channelProfile ? (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm font-medium">{tAi("channelProfile")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{channelProfile.niche}</Badge>
                  <Badge variant="outline">{channelProfile.tone}</Badge>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-3">
                <p className="text-muted-foreground text-sm">{tAi("noProfileYet")}</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleAnalyzeChannel}
                  disabled={isAnalyzing}
                  className="mt-1 h-auto p-0"
                >
                  {isAnalyzing ? tAi("analyzing") : tAi("analyzeFirst")}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ai-topic">{tAi("topicLabel")}</Label>
              <Input
                id="ai-topic"
                placeholder={tAi("topicPlaceholder")}
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-tone">
                {tAi("toneLabel")} ({tAi("optional")})
              </Label>
              <Input
                id="ai-tone"
                placeholder={tAi("tonePlaceholder")}
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleGenerateWithAI} disabled={!aiTopic.trim() || isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tAi("generating")}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {tAi("generate")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface TelegramPreviewProps {
  content: string;
  imageUrl?: string | null;
  channel?: Channel;
  parseMode?: "HTML" | "MarkdownV2";
}

function TelegramPreview({ content, imageUrl, channel, parseMode }: TelegramPreviewProps) {
  const t = useTranslations("telegramPost");

  return (
    <div className="rounded-lg border bg-[#17212b] p-4 text-white">
      {/* Channel Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-lg font-bold">
          {(channel?.title?.[0] || channel?.username?.[0] || "C").toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-[#fff]">
            {channel?.title || channel?.username || t("previewChannelName")}
          </p>
          {channel?.memberCount ? (
            <p className="text-xs text-[#6c7883]">
              {channel.memberCount.toLocaleString()} {t("subscribers")}
            </p>
          ) : (
            <p className="text-xs text-[#6c7883]">{t("previewSubscribers")}</p>
          )}
        </div>
      </div>

      {/* Image */}
      {imageUrl && (
        <div className="mb-3">
          <img
            src={imageUrl}
            alt="Post image"
            className="max-h-64 w-full rounded-lg object-cover"
          />
        </div>
      )}

      {/* Message */}
      <div className="space-y-2">
        {content ? (
          <div className="text-[14px] leading-relaxed whitespace-pre-wrap">
            {parseMode === "HTML" ? (
              <div dangerouslySetInnerHTML={{ __html: content }} />
            ) : parseMode === "MarkdownV2" ? (
              <MarkdownPreview content={content} />
            ) : (
              content
            )}
          </div>
        ) : (
          <p className="text-[#6c7883] italic">{t("previewPlaceholder")}</p>
        )}
      </div>

      {/* Timestamp */}
      <div className="mt-3 text-right">
        <span className="text-xs text-[#6c7883]">
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// Simple Markdown preview
function MarkdownPreview({ content }: { content: string }) {
  const processed = content
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/`(.+?)`/g, '<code class="bg-[#242f3d] px-1 rounded">$1</code>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>");

  return <span dangerouslySetInnerHTML={{ __html: processed }} />;
}
