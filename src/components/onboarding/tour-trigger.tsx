"use client";

import { useEffect, useState } from "react";
import { useTourTrigger } from "@/hooks/use-tour-trigger";
import { MobileTourModal } from "@/components/onboarding/mobile-tour-modal";
import type { TourId } from "@/lib/onboarding/tours";
import { mobileTourSteps, tourNames } from "@/lib/onboarding/tours/mobile-steps";
import { LayoutDashboard, Library, Calendar, BarChart3, Wand2 } from "lucide-react";

const tourIcons: Record<TourId, React.ReactNode> = {
  "dashboard-intro": <LayoutDashboard className="text-primary h-5 w-5" />,
  "content-library-intro": <Library className="text-primary h-5 w-5" />,
  "schedule-intro": <Calendar className="text-primary h-5 w-5" />,
  "analytics-intro": <BarChart3 className="text-primary h-5 w-5" />,
  "ai-generation-intro": <Wand2 className="text-primary h-5 w-5" />,
};

interface TourTriggerProps {
  tourId: TourId;
  children: React.ReactNode;
  delay?: number;
}

export function TourTrigger({ tourId, children, delay = 1500 }: TourTriggerProps) {
  const { isMobile, isDismissed, trigger } = useTourTrigger({
    tourId,
    delay,
    autoTrigger: false,
  });

  const [showMobileModal, setShowMobileModal] = useState(false);

  useEffect(() => {
    if (isDismissed) return;

    const timeout = setTimeout(() => {
      if (isMobile) {
        setShowMobileModal(true);
      } else {
        trigger();
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [isMobile, isDismissed, delay, trigger]);

  const steps = mobileTourSteps[tourId].map((step) => ({
    ...step,
    icon: tourIcons[tourId],
  }));

  return (
    <>
      {children}
      <MobileTourModal
        isOpen={showMobileModal}
        onClose={() => setShowMobileModal(false)}
        onComplete={() => setShowMobileModal(false)}
        steps={steps}
        tourName={tourNames[tourId]}
      />
    </>
  );
}
