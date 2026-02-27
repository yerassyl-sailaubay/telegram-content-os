"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import type { Platform } from "@/server/actions/crosspost";

type Step = 1 | 2 | 3 | 4 | 5;

type StepPreviewProps = {
  current: Step;
  platform?: Platform;
};

function StepIndicator({
  step,
  current,
  label,
}: {
  step: Step;
  current: Step;
  label: string;
}) {
  const isCompleted = step < current;
  const isActive = step === current;

  return (
    <div className="flex items-center gap-2">
      {isCompleted ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
      ) : (
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
            isActive
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30 text-muted-foreground"
          }`}
        >
          {step}
        </div>
      )}
      <span
        className={`text-sm ${
          isActive
            ? "font-semibold text-foreground"
            : isCompleted
              ? "text-muted-foreground line-through"
              : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export function WizardStepNav({ current, platform }: StepPreviewProps) {
  const t = useTranslations("crosspost");

  const steps: { step: Step; label: string }[] = [
    { step: 1, label: t("step1Title") },
    { step: 2, label: t("step2Title") },
    { step: 3, label: t("step3Title") },
    { step: 4, label: t("step4Title") },
    { step: 5, label: t("step5Title") },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
      {steps.map(({ step, label }, i) => (
        <div key={step} className="flex items-center gap-2">
          <StepIndicator step={step} current={current} label={label} />
          {i < steps.length - 1 && (
            <span className="text-muted-foreground/30 text-xs">›</span>
          )}
        </div>
      ))}
      {platform && (
        <Badge variant="secondary" className="ml-auto capitalize">
          {platform === "linkedin" ? "LinkedIn" : "Twitter / X"}
        </Badge>
      )}
    </div>
  );
}
