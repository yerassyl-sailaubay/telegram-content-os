"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Save } from "lucide-react";
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
import { updateProfile } from "@/server/actions/settings";
import type { ProfileData } from "@/server/actions/settings";

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Europe/Moscow", label: "Moscow (MSK)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

type ProfileTabProps = {
  initialData: ProfileData;
};

export function ProfileTab({ initialData }: ProfileTabProps) {
  const t = useTranslations("settings");
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialData.name ?? "");
  const [timezone, setTimezone] = useState(initialData.timezone);
  const [language, setLanguage] = useState(initialData.language);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateProfile({ name, timezone, language });
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card data-testid="profile-tab-content">
      <CardHeader>
        <CardTitle>{t("profile.title")}</CardTitle>
        <CardDescription>{t("profile.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="profile-name">{t("profile.nameLabel")}</Label>
            <Input
              id="profile-name"
              data-testid="profile-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("profile.namePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email">{t("profile.emailLabel")}</Label>
            <Input
              id="profile-email"
              data-testid="profile-email-input"
              value={initialData.email}
              readOnly
              disabled
              className="bg-muted text-muted-foreground"
            />
            <p className="text-muted-foreground text-xs">{t("profile.emailReadonly")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-timezone">{t("profile.timezoneLabel")}</Label>
            <Select
              value={timezone}
              onValueChange={setTimezone}
              data-testid="profile-timezone-select"
            >
              <SelectTrigger id="profile-timezone" data-testid="timezone-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("profile.languageLabel")}</Label>
            <div className="flex gap-2" data-testid="language-toggle">
              <Button
                type="button"
                variant={language === "en" ? "default" : "outline"}
                size="sm"
                data-testid="language-en"
                onClick={() => setLanguage("en")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 60 30"
                  width="16"
                  height="12"
                  className="mr-2 shrink-0 overflow-hidden rounded-[2px]"
                >
                  <clipPath id="s">
                    <path d="M0,0 v30 h60 v-30 z" />
                  </clipPath>
                  <clipPath id="t">
                    <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
                  </clipPath>
                  <g clipPath="url(#s)">
                    <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
                    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
                    <path
                      d="M0,0 L60,30 M60,0 L0,30"
                      clipPath="url(#t)"
                      stroke="#C8102E"
                      strokeWidth="4"
                    />
                    <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
                    <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
                  </g>
                </svg>
                English
              </Button>
              <Button
                type="button"
                variant={language === "ru" ? "default" : "outline"}
                size="sm"
                data-testid="language-ru"
                onClick={() => setLanguage("ru")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 9 6"
                  width="16"
                  height="12"
                  className="mr-2 shrink-0 overflow-hidden rounded-[2px]"
                >
                  <rect fill="#fff" width="9" height="3" />
                  <rect fill="#d52b1e" y="3" width="9" height="3" />
                  <rect fill="#0039a6" y="2" width="9" height="2" />
                </svg>
                Русский
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-destructive text-sm" data-testid="profile-error">
              {error}
            </p>
          )}

          {saved && (
            <p
              className="text-sm text-emerald-600 dark:text-emerald-400"
              data-testid="profile-saved"
            >
              {t("profile.savedSuccess")}
            </p>
          )}

          <Button type="submit" disabled={isPending} data-testid="profile-save-button">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("profile.saving")}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t("profile.save")}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
