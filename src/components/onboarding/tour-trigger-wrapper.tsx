"use client";

import { TourTrigger } from "./tour-trigger";
import type { TourId } from "@/lib/onboarding/tours";

interface TourTriggerWrapperProps {
  tourId: TourId;
  children: React.ReactNode;
}

export function TourTriggerWrapper({ tourId, children }: TourTriggerWrapperProps) {
  return <TourTrigger tourId={tourId}>{children}</TourTrigger>;
}
