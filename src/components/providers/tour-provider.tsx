"use client";

import { createContext, useContext, useCallback, useState, useRef, useEffect } from "react";
import { driver } from "driver.js";
import type { Driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

import type { TourId, TourContextValue, TourState } from "@/lib/onboarding/tours";
import { getTour } from "@/lib/onboarding/tours";
import {
  getTourState as getStoredTourState,
  saveTourState,
  markTourCompleted,
  resetTourState,
  isTourDismissed as checkTourDismissed,
} from "@/lib/onboarding/storage";
import { driverStyles } from "@/lib/onboarding/tours";

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within TourProvider");
  }
  return context;
}

interface TourProviderProps {
  children: React.ReactNode;
}

type TourEndReason = "completed" | "dismissed";

function resolveStepTarget(step: DriveStep): Element | null {
  if (!step.element) {
    return document.body;
  }

  if (typeof step.element === "string") {
    return document.querySelector(step.element);
  }

  if (typeof step.element === "function") {
    return step.element() ?? null;
  }

  return step.element;
}

export function TourProvider({ children }: TourProviderProps) {
  const [activeTour, setActiveTour] = useState<TourId | null>(null);
  const driverRef = useRef<Driver | null>(null);
  const tourEndReasonRef = useRef<TourEndReason>("dismissed");

  useEffect(() => {
    const styleId = "driver-custom-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = driverStyles;
      document.head.appendChild(style);
    }
  }, []);

  const cleanupDriver = useCallback(() => {
    if (driverRef.current) {
      tourEndReasonRef.current = "dismissed";
      driverRef.current.destroy();
      driverRef.current = null;
    }
  }, []);

  const startTour = useCallback(
    (tourId: TourId) => {
      cleanupDriver();

      const tourConfig = getTour(tourId);
      const storedState = getStoredTourState(tourId);
      const resolvedSteps = tourConfig.steps.filter((step) => Boolean(resolveStepTarget(step)));

      if (storedState.dismissed || resolvedSteps.length === 0) {
        return;
      }

      tourEndReasonRef.current = "dismissed";

      const driverObj = driver({
        ...tourConfig,
        steps: resolvedSteps,
        onNextClick: (_element, _step, { driver }) => {
          if (driver.hasNextStep()) {
            driver.moveNext();
            return;
          }

          tourEndReasonRef.current = "completed";
          driver.destroy();
        },
        onDestroyed: () => {
          const currentState = getStoredTourState(tourId);

          if (tourEndReasonRef.current === "completed") {
            markTourCompleted(tourId);
          } else {
            saveTourState(tourId, {
              ...currentState,
              dismissed: true,
              dismissedAt: new Date().toISOString(),
            });
          }

          driverRef.current = null;
          setActiveTour(null);
          tourEndReasonRef.current = "dismissed";
        },
      });

      driverRef.current = driverObj;
      setActiveTour(tourId);

      const newState: TourState = {
        ...storedState,
        startedCount: storedState.startedCount + 1,
      };
      saveTourState(tourId, newState);

      driverObj.drive();
    },
    [cleanupDriver],
  );

  const endTour = useCallback(() => {
    if (driverRef.current) {
      tourEndReasonRef.current = "dismissed";
      driverRef.current.destroy();
    }
    setActiveTour(null);
  }, []);

  const isTourDismissed = useCallback((tourId: TourId): boolean => {
    return checkTourDismissed(tourId);
  }, []);

  const resetTour = useCallback((tourId: TourId) => {
    resetTourState(tourId);
  }, []);

  const getTourState = useCallback((tourId: TourId): TourState => {
    return getStoredTourState(tourId);
  }, []);

  useEffect(() => {
    return () => {
      cleanupDriver();
    };
  }, [cleanupDriver]);

  const value: TourContextValue = {
    activeTour,
    startTour,
    endTour,
    isTourDismissed,
    resetTour,
    getTourState,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
