"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface MobileTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  steps: TourStep[];
  tourName: string;
}

export function MobileTourModal({
  isOpen,
  onClose,
  onComplete,
  steps,
  tourName,
}: MobileTourModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete?.();
      onClose();
      setCurrentStep(0);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    onClose();
    setCurrentStep(0);
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[340px]">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 h-8 w-8"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="bg-muted h-1 w-full">
            <div
              className="bg-primary h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <DialogHeader className="px-6 pt-6 pb-2">
            <div className="mb-3 flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                {currentStepData.icon ?? <Lightbulb className="text-primary h-5 w-5" />}
              </div>
              <span className="text-muted-foreground text-xs font-medium">
                {tourName} · {currentStep + 1} of {steps.length}
              </span>
            </div>
            <DialogTitle className="text-lg">{currentStepData.title}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {currentStepData.description}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className={cn(currentStep === 0 && "invisible")}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>

              <Button size="sm" onClick={handleNext}>
                {currentStep === steps.length - 1 ? (
                  "Got it"
                ) : (
                  <>
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
