"use client";

import { useTranslations } from "next-intl";
import { Sparkles, ArrowRight, X, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useOnboarding } from "@/hooks/use-onboarding";
import { ConnectChannelWizard } from "@/components/channels/connect-channel-wizard";

type OnboardingWizardProps = {
  botUsername: string;
};

type StepProps = {
  onAdvance: (step: number) => void;
  onDismiss: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  tCommon: (key: string) => string;
};

type ChannelStepProps = StepProps & {
  botUsername: string;
};

function ProgressIndicator({
  currentStep,
  onStepClick,
  t,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {[1, 2, 3].map((step) => (
        <button
          key={step}
          onClick={() => onStepClick(step)}
          disabled={step > currentStep}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            step === currentStep
              ? "bg-primary w-8"
              : step < currentStep
                ? "bg-primary/60 hover:bg-primary/80 w-2 cursor-pointer"
                : "bg-muted-foreground/20 w-2",
          )}
          aria-label={t("stepIndicator", { step, total: 3 })}
        />
      ))}
      <span className="text-muted-foreground ml-2 text-xs">
        {t("stepOf", { step: currentStep, total: 3 })}
      </span>
    </div>
  );
}

function WelcomeStep({ onAdvance, onDismiss, t }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
      </div>

      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-semibold tracking-tight">{t("welcomeTitle")}</h3>
        <p className="text-muted-foreground mx-auto max-w-sm">{t("welcomeDescription")}</p>
      </div>

      <div className="bg-muted/50 space-y-3 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium">
            1
          </div>
          <p className="text-muted-foreground text-sm">{t("step1Preview")}</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium">
            2
          </div>
          <p className="text-muted-foreground text-sm">{t("step2Preview")}</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-medium">
            3
          </div>
          <p className="text-muted-foreground text-sm">{t("step3Preview")}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button size="lg" className="w-full" onClick={() => onAdvance(2)}>
          {t("getStarted")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss} className="text-muted-foreground">
          {t("exploreFirst")}
        </Button>
      </div>
    </div>
  );
}

function ChannelConnectionStep({
  onAdvance,
  onDismiss,
  botUsername,
  t,
  tCommon,
}: ChannelStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-xl font-semibold">{t("connectChannelTitle")}</h3>
        <p className="text-muted-foreground text-sm">{t("connectChannelDescription")}</p>
      </div>

      <div className="flex justify-center py-2">
        <ConnectChannelWizard botUsername={botUsername} />
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-muted-foreground text-center text-sm">{t("connectChannelHelp")}</p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={() => onAdvance(1)}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          {tCommon("back")}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss} className="text-muted-foreground">
          {t("skipForNow")}
        </Button>
      </div>
    </div>
  );
}

function AiPreviewStep({ onAdvance, onDismiss, t, tCommon }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
      </div>

      <div className="space-y-2 text-center">
        <h3 className="text-xl font-semibold">{t("aiPreviewTitle")}</h3>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          {t("aiPreviewDescription")}
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border bg-gradient-to-r from-blue-50/50 to-purple-50/50 p-4 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {t("aiDraftLabel")}
            </span>
          </div>
          <p className="text-muted-foreground line-clamp-3 text-sm">{t("aiDraftExample1")}</p>
        </div>

        <div className="rounded-lg border bg-gradient-to-r from-emerald-50/50 to-teal-50/50 p-4 dark:from-emerald-950/20 dark:to-teal-950/20">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {t("aiDraftLabel")}
            </span>
          </div>
          <p className="text-muted-foreground line-clamp-3 text-sm">{t("aiDraftExample2")}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button size="lg" className="w-full" onClick={onDismiss}>
          {t("startCreating")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <div className="flex justify-between">
          <Button variant="outline" size="sm" onClick={() => onAdvance(2)}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {tCommon("back")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDismiss} className="text-muted-foreground">
            {t("exploreFirst")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OnboardingWizard({ botUsername }: OnboardingWizardProps) {
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const {
    isWizardOpen,
    currentStep,
    isWizardDismissed,
    dismissWizard,
    advanceWizard,
    completeWizard,
  } = useOnboarding();

  const handleDismiss = async () => {
    await dismissWizard();
  };

  const handleComplete = async () => {
    await completeWizard();
  };

  const handleStepClick = (step: number) => {
    if (step <= currentStep) {
      advanceWizard(step);
    }
  };

  const handleAdvance = (step: number) => {
    advanceWizard(step);
  };

  if (isWizardDismissed && !isWizardOpen) {
    return null;
  }

  return (
    <Dialog
      open={isWizardOpen}
      onOpenChange={(open) => {
        if (!open) {
          void dismissWizard();
        }
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <button
          onClick={handleDismiss}
          className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none"
          aria-label={tCommon("cancel")}
        >
          <X className="h-4 w-4" />
        </button>

        <DialogHeader className="space-y-1">
          <DialogTitle className="text-center">{t("wizardTitle")}</DialogTitle>
          <DialogDescription className="text-center">{t("wizardSubtitle")}</DialogDescription>
        </DialogHeader>

        <ProgressIndicator currentStep={currentStep} onStepClick={handleStepClick} t={t} />

        <div className="py-2">
          {currentStep === 1 && (
            <WelcomeStep
              onAdvance={handleAdvance}
              onDismiss={handleDismiss}
              t={t}
              tCommon={tCommon}
            />
          )}
          {currentStep === 2 && (
            <ChannelConnectionStep
              onAdvance={handleAdvance}
              onDismiss={handleDismiss}
              botUsername={botUsername}
              t={t}
              tCommon={tCommon}
            />
          )}
          {currentStep === 3 && (
            <AiPreviewStep
              onAdvance={handleAdvance}
              onDismiss={handleComplete}
              t={t}
              tCommon={tCommon}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
