"use client";

import { createContext, useContext, useCallback, useState, useRef, useEffect } from "react";
import { driver } from "driver.js";
import type { Driver } from "driver.js";
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

export function TourProvider({ children }: TourProviderProps) {
  const [activeTour, setActiveTour] = useState<TourId | null>(null);
  const driverRef = useRef<Driver | null>(null);

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
      driverRef.current.destroy();
      driverRef.current = null;
    }
  }, []);

  const startTour = useCallback(
    (tourId: TourId) => {
      cleanupDriver();

      const tourConfig = getTour(tourId);
      const storedState = getStoredTourState(tourId);

      if (storedState.dismissed) {
        return;
      }

      const driverObj = driver({
        ...tourConfig,
        steps: tourConfig.steps,
        onDestroyStarted: () => {
          const currentState = getStoredTourState(tourId);
          const wasCompleted =
            driverRef.current?.getState()?.activeIndex === tourConfig.steps.length - 1;

          if (wasCompleted) {
            markTourCompleted(tourId);
          } else {
            saveTourState(tourId, {
              ...currentState,
              dismissed: true,
              dismissedAt: new Date().toISOString(),
            });
          }

          setActiveTour(null);
        },
        onDestroyed: () => {
          driverRef.current = null;
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
      driverRef.current.destroy();
    }
    cleanupDriver();
    setActiveTour(null);
  }, [cleanupDriver]);

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
