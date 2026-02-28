"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  saveWelcomeTemplate,
  testWelcomeMessage,
} from "@/server/actions/welcome";
import type { WelcomeTemplate } from "@/server/actions/welcome";
import { renderTemplate } from "@/lib/telegram/welcome";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TemplateEditorProps = {
  channelId: string;
  initialTemplate: WelcomeTemplate | null;
};

// Sample data for live preview
const SAMPLE_VARS: Record<string, string> = {
  name: "John Doe",
  channel_name: "My Channel",
  member_count: "1,234",
};

const TEMPLATE_VARIABLES = [
  { key: "{name}", label: "Name" },
  { key: "{channel_name}", label: "Channel" },
  { key: "{member_count}", label: "Members" },
] as const;

const DEFAULT_TEMPLATE =
  "Welcome {name} to {channel_name}! You are member #{member_count}. Glad to have you here!";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TemplateEditor({
  channelId,
  initialTemplate,
}: TemplateEditorProps) {
  const t = useTranslations("welcome");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [templateText, setTemplateText] = useState(
    initialTemplate?.templateText ?? DEFAULT_TEMPLATE,
  );
  const [isEnabled, setIsEnabled] = useState(
    initialTemplate?.isEnabled ?? false,
  );
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [testMessage, setTestMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isSaving, startSaveTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();

  // Rendered preview
  const preview = renderTemplate(templateText, SAMPLE_VARS);

  // Insert variable at cursor position
  function insertVariable(variable: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTemplateText((prev) => prev + variable);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = templateText.slice(0, start);
    const after = templateText.slice(end);
    const newText = before + variable + after;
    setTemplateText(newText);

    // Restore cursor position after the inserted variable
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + variable.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }

  function handleSave() {
    setSaveMessage(null);
    startSaveTransition(async () => {
      const result = await saveWelcomeTemplate(
        channelId,
        templateText,
        isEnabled,
      );
      if (result.success) {
        setSaveMessage({ type: "success", text: t("saveSuccess") });
      } else {
        setSaveMessage({ type: "error", text: result.error });
      }
    });
  }

  function handleTest() {
    setTestMessage(null);
    startTestTransition(async () => {
      const result = await testWelcomeMessage(channelId);
      if (result.success) {
        setTestMessage({ type: "success", text: t("testSuccess") });
      } else {
        setTestMessage({ type: "error", text: result.error });
      }
    });
  }

  function handleToggleEnabled() {
    setIsEnabled((prev) => !prev);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Editor Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("editorTitle")}</CardTitle>
          <CardDescription>{t("editorDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">{t("enableLabel")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("enableDescription")}
              </p>
            </div>
            <Button
              variant={isEnabled ? "default" : "outline"}
              size="sm"
              onClick={handleToggleEnabled}
              className="shrink-0"
            >
              {isEnabled ? t("enabled") : t("disabled")}
            </Button>
          </div>

          {/* Template textarea */}
          <div className="space-y-2">
            <Label htmlFor="template-text">{t("templateLabel")}</Label>
            <Textarea
              ref={textareaRef}
              id="template-text"
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              placeholder={t("templatePlaceholder")}
              rows={6}
              className="resize-y font-mono text-sm"
            />
          </div>

          {/* Variable insertion buttons */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {t("variablesLabel")}
            </Label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_VARIABLES.map((v) => (
                <Button
                  key={v.key}
                  variant="outline"
                  size="sm"
                  className="font-mono text-xs"
                  onClick={() => insertVariable(v.key)}
                >
                  {v.key}
                </Button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving ? t("saving") : t("save")}
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={isTesting}
              size="sm"
            >
              {isTesting ? t("testing") : t("testButton")}
            </Button>
          </div>

          {/* Save feedback */}
          {saveMessage && (
            <p
              className={`text-sm ${saveMessage.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
            >
              {saveMessage.text}
            </p>
          )}

          {/* Test feedback */}
          {testMessage && (
            <p
              className={`text-sm ${testMessage.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
            >
              {testMessage.text}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Live Preview Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("previewTitle")}</CardTitle>
          <CardDescription>{t("previewDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30" />
              <div>
                <p className="text-sm font-medium">John Doe</p>
                <p className="text-xs text-muted-foreground">
                  {t("previewJoinedLabel")}
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-lg border bg-background p-3">
              <p className="whitespace-pre-wrap text-sm">
                {preview || (
                  <span className="italic text-muted-foreground">
                    {t("previewEmpty")}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Variable reference */}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t("variableReference")}
            </p>
            <div className="space-y-1 text-xs text-muted-foreground">
              {TEMPLATE_VARIABLES.map((v) => (
                <div key={v.key} className="flex items-center gap-2">
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">
                    {v.key}
                  </code>
                  <span>&mdash; {t(`var_${v.key.replace(/[{}]/g, "")}`)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
