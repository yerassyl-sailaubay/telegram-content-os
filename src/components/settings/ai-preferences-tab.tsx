"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Save, Bot, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePreferences } from "@/server/actions/settings";
import type { PreferencesData } from "@/server/actions/settings";

const AI_MODELS: Array<{
  value: PreferencesData["aiModel"];
  label: string;
  description: string;
}> = [
  {
    value: "gpt-4o-mini",
    label: "GPT-4.1 mini",
    description: "Fast and cost-efficient",
  },
  {
    value: "claude-haiku",
    label: "Claude Haiku",
    description: "Precise and nuanced",
  },
  {
    value: "auto",
    label: "Auto",
    description: "Best model for each task",
  },
];

const ADAPTATION_TONES: Array<{
  value: PreferencesData["adaptationTone"];
  label: string;
  description: string;
}> = [
  {
    value: "professional",
    label: "Professional",
    description: "Formal, business-appropriate tone",
  },
  {
    value: "casual",
    label: "Casual",
    description: "Friendly, conversational tone",
  },
  {
    value: "match-original",
    label: "Match original",
    description: "Preserve the original style",
  },
];

type AiPreferencesTabProps = {
  initialData: PreferencesData;
};

export function AiPreferencesTab({ initialData }: AiPreferencesTabProps) {
  const t = useTranslations("settings");
  const [isPending, startTransition] = useTransition();
  const [aiModel, setAiModel] = useState<PreferencesData["aiModel"]>(initialData.aiModel);
  const [adaptationTone, setAdaptationTone] = useState<PreferencesData["adaptationTone"]>(
    initialData.adaptationTone,
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updatePreferences({ aiModel, adaptationTone });
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card data-testid="ai-preferences-tab-content">
      <CardHeader>
        <CardTitle>{t("aiPreferences.title")}</CardTitle>
        <CardDescription>{t("aiPreferences.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Bot className="text-primary h-4 w-4" />
              <Label htmlFor="ai-model">{t("aiPreferences.modelLabel")}</Label>
            </div>
            <Select
              value={aiModel}
              onValueChange={(v) => setAiModel(v as PreferencesData["aiModel"])}
            >
              <SelectTrigger id="ai-model" data-testid="ai-model-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div>
                      <span className="font-medium">{model.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        — {model.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">{t("aiPreferences.modelDescription")}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="text-primary h-4 w-4" />
              <Label htmlFor="adaptation-tone">{t("aiPreferences.toneLabel")}</Label>
            </div>
            <Select
              value={adaptationTone}
              onValueChange={(v) => setAdaptationTone(v as PreferencesData["adaptationTone"])}
            >
              <SelectTrigger id="adaptation-tone" data-testid="adaptation-tone-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADAPTATION_TONES.map((tone) => (
                  <SelectItem key={tone.value} value={tone.value}>
                    <div>
                      <span className="font-medium">{tone.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        — {tone.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">{t("aiPreferences.toneDescription")}</p>
          </div>

          {error && (
            <p className="text-destructive text-sm" data-testid="ai-preferences-error">
              {error}
            </p>
          )}

          {saved && (
            <p
              className="text-sm text-emerald-600 dark:text-emerald-400"
              data-testid="ai-preferences-saved"
            >
              {t("aiPreferences.savedSuccess")}
            </p>
          )}

          <Button type="submit" disabled={isPending} data-testid="ai-preferences-save-button">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("aiPreferences.saving")}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t("aiPreferences.save")}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
