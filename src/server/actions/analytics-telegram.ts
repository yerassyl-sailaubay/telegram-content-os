"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getChannelGrowthRate,
  getBestPostingTimes,
  getContentPerformance,
} from "@/lib/analytics/telegram-enhanced";
import type {
  DateRange,
  ChannelGrowthResult,
  BestPostingTimesResult,
  ContentPerformanceResult,
} from "@/lib/analytics/telegram-enhanced";

export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user.id;
}

export async function fetchChannelGrowthRate(
  channelId: string,
  dateRange: DateRange,
): Promise<ActionResult<ChannelGrowthResult>> {
  try {
    await getCurrentUserId();
    const data = await getChannelGrowthRate(channelId, dateRange);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch growth rate";
    return { success: false, error: message };
  }
}

export async function fetchBestPostingTimes(
  channelId: string,
): Promise<ActionResult<BestPostingTimesResult>> {
  try {
    await getCurrentUserId();
    const data = await getBestPostingTimes(channelId);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch best posting times";
    return { success: false, error: message };
  }
}

export async function fetchContentPerformance(
  channelId: string,
  dateRange: DateRange,
): Promise<ActionResult<ContentPerformanceResult>> {
  try {
    await getCurrentUserId();
    const data = await getContentPerformance(channelId, dateRange);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch content performance";
    return { success: false, error: message };
  }
}
