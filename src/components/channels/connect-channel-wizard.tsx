"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Copy, AlertCircle, Plus, Loader2 } from "lucide-react";
import { connectChannel } from "@/server/actions/channels";

type ConnectWizardProps = {
  botUsername: string;
};

type WizardStep = "instructions" | "enter-username" | "success";

export function ConnectChannelWizard({ botUsername }: ConnectWizardProps) {
  const t = useTranslations("channels");
  const tCommon = useTranslations("common");

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("instructions");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connectedTitle, setConnectedTitle] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (!value) {
      // Reset state on close
      setTimeout(() => {
        setStep("instructions");
        setUsername("");
        setError(null);
        setConnectedTitle(null);
      }, 200);
    }
  }

  function copyBotUsername() {
    navigator.clipboard.writeText(`@${botUsername}`).catch(() => {
      // Clipboard API not available — silently ignore
    });
  }

  function handleConnect() {
    setError(null);
    startTransition(async () => {
      const result = await connectChannel({ username });
      if (result.success) {
        setConnectedTitle(result.data.title ?? result.data.username ?? username);
        setStep("success");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("connectChannel")}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        {step === "instructions" && (
          <>
            <DialogHeader>
              <DialogTitle>{t("wizardStep1Title")}</DialogTitle>
              <DialogDescription>
                {t("wizardStep1Description")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {t("wizardStep1Instructions")}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
                <code className="flex-1 text-sm font-mono font-semibold">
                  @{botUsername}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={copyBotUsername}
                  title="Copy bot username"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={() => setStep("enter-username")}>
                {tCommon("next")}
              </Button>
            </div>
          </>
        )}

        {step === "enter-username" && (
          <>
            <DialogHeader>
              <DialogTitle>{t("wizardStep2Title")}</DialogTitle>
              <DialogDescription>
                {t("wizardStep2Description")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="channel-username">
                  {t("wizardUsernameLabel")}
                </Label>
                <Input
                  id="channel-username"
                  placeholder={t("wizardUsernamePlaceholder")}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && username.trim()) {
                      handleConnect();
                    }
                  }}
                  disabled={isPending}
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("instructions");
                  setError(null);
                }}
                disabled={isPending}
              >
                {tCommon("back")}
              </Button>
              <Button
                onClick={handleConnect}
                disabled={!username.trim() || isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("wizardVerifying")}
                  </>
                ) : (
                  t("wizardConnect")
                )}
              </Button>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                {t("wizardSuccessTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("wizardSuccessDescription")}
              </DialogDescription>
            </DialogHeader>

            {connectedTitle && (
              <div className="rounded-lg border bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                {connectedTitle}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
