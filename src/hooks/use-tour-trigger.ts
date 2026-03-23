"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useTour } from "@/components/providers/tour-provider";
import type { TourId } from "@/lib/onboarding/tours";

const MOBILE_QUERY = "(pointer: coarse)";
const TRIGGER_DELAY_MS = 1500;

interface UseTourTriggerOptions {
  tourId: TourId;
  delay?: number;
  autoTrigger?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
}

interface UseTourTriggerReturn {
  isActive: boolean;
  isDismissed: boolean;
  isMobile: boolean;
  trigger: () => void;
  dismiss: () => void;
  reset: () => void;
}

export function useTourTrigger(options: UseTourTriggerOptions): UseTourTriggerReturn {
  const { tourId, delay = TRIGGER_DELAY_MS, autoTrigger = true, onStart, onEnd } = options;
  const { activeTour, startTour, endTour, isTourDismissed, resetTour } = useTour();

  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const trigger = useCallback(() => {
    if (isTourDismissed(tourId)) return;
    if (activeTour && activeTour !== tourId) return;

    setHasTriggered(true);
    onStart?.();
    startTour(tourId);
  }, [tourId, activeTour, isTourDismissed, startTour, onStart]);

  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = window.matchMedia(MOBILE_QUERY).matches;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isTouchDevice || isSmallScreen);
    };

    checkMobile();

    const handleResize = () => checkMobile();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    setDismissed(isTourDismissed(tourId));
  }, [tourId, isTourDismissed]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    onEnd?.();
    endTour();
  }, [endTour, onEnd]);

  const reset = useCallback(() => {
    resetTour(tourId);
    setDismissed(false);
    setHasTriggered(false);
  }, [tourId, resetTour]);

  useEffect(() => {
    if (!autoTrigger) return;
    if (dismissed) return;
    if (hasTriggered) return;
    if (isMobile) return;
    if (activeTour && activeTour !== tourId) return;

    timeoutRef.current = setTimeout(() => {
      if (!isTourDismissed(tourId) && !hasTriggered) {
        setHasTriggered(true);
        onStart?.();
        startTour(tourId);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    autoTrigger,
    dismissed,
    hasTriggered,
    isMobile,
    activeTour,
    tourId,
    delay,
    isTourDismissed,
    startTour,
    onStart,
  ]);

  const isActive = activeTour === tourId;

  return {
    isActive,
    isDismissed: dismissed,
    isMobile,
    trigger,
    dismiss,
    reset,
  };
}
