"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { StepSelectPost } from "./step-select-post";
import { StepAdapt } from "./step-adapt";
import { StepEdit } from "./step-edit";
import { StepPreview } from "./step-preview";
import { StepAction } from "./step-action";
import { WizardStepNav } from "./wizard-step-nav";
import type {
  TelegramPostWithChannel,
  Platform,
  CrossPost,
  CrossPostUsage,
} from "@/server/actions/crosspost";

type WizardStep = 1 | 2 | 3 | 4 | 5;

type WizardState = {
  step: WizardStep;
  selectedPost: TelegramPostWithChannel | null;
  selectedPlatform: Platform | null;
  crossPost: CrossPost | null;
  adaptedContent: string;
};

type CrossPostWizardProps = {
  initialUsage?: CrossPostUsage | null;
};

export function CrossPostWizard({ initialUsage }: CrossPostWizardProps) {
  const [state, setState] = useState<WizardState>({
    step: 1,
    selectedPost: null,
    selectedPlatform: null,
    crossPost: null,
    adaptedContent: "",
  });

  function resetWizard() {
    setState({
      step: 1,
      selectedPost: null,
      selectedPlatform: null,
      crossPost: null,
      adaptedContent: "",
    });
  }

  // Step 1 → 2: post + platform selected
  function handleStep1Next(post: TelegramPostWithChannel, platform: Platform) {
    setState((prev) => ({
      ...prev,
      step: 2,
      selectedPost: post,
      selectedPlatform: platform,
    }));
  }

  // Step 2 → 3: AI adaptation done
  function handleStep2Next(crossPost: CrossPost) {
    setState((prev) => ({
      ...prev,
      step: 3,
      crossPost,
      adaptedContent: crossPost.adaptedContent ?? "",
    }));
  }

  // Step 3 → 4: editing done
  function handleStep3Next(adaptedContent: string) {
    setState((prev) => ({ ...prev, step: 4, adaptedContent }));
  }

  // Step 4 → 5: preview confirmed
  function handleStep4Next() {
    setState((prev) => ({ ...prev, step: 5 }));
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <WizardStepNav
        current={state.step as 1 | 2 | 3 | 4 | 5}
        platform={state.selectedPlatform ?? undefined}
      />

      {/* Step content */}
      {state.step === 1 && (
        <StepSelectPost onNext={handleStep1Next} />
      )}

      {state.step === 2 &&
        state.selectedPost &&
        state.selectedPlatform && (
          <StepAdapt
            post={state.selectedPost}
            platform={state.selectedPlatform}
            onNext={handleStep2Next}
            onBack={() => setState((prev) => ({ ...prev, step: 1 }))}
          />
        )}

      {state.step === 3 &&
        state.crossPost &&
        state.selectedPlatform && (
          <StepEdit
            crossPost={state.crossPost}
            originalContent={state.selectedPost?.contentRaw ?? ""}
            platform={state.selectedPlatform}
            onNext={handleStep3Next}
            onBack={() => setState((prev) => ({ ...prev, step: 2 }))}
          />
        )}

      {state.step === 4 && state.selectedPlatform && (
        <StepPreview
          adaptedContent={state.adaptedContent}
          platform={state.selectedPlatform}
          onNext={handleStep4Next}
          onBack={() => setState((prev) => ({ ...prev, step: 3 }))}
        />
      )}

      {state.step === 5 &&
        state.crossPost &&
        state.selectedPlatform && (
          <StepAction
            crossPost={state.crossPost}
            platform={state.selectedPlatform}
            usage={initialUsage ?? null}
            onStartOver={resetWizard}
          />
        )}
    </div>
  );
}
