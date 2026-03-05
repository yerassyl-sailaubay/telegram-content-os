import { db } from "@/server/db";
import { channelMetrics, telegramPosts } from "@/server/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export type DateRange = {
  start: Date;
  end: Date;
};

export type GrowthTrend = "up" | "down" | "stable";

export type GrowthDataPoint = {
  date: string;
  subscribers: number;
};

export type ChannelGrowthResult = {
  rate: number;
  trend: GrowthTrend;
  dataPoints: GrowthDataPoint[];
};

export type HeatmapEntry = {
  hour: number;
  day: string;
  avgViews: number;
};

export type BestPostingTimesResult = {
  bestHours: number[];
  bestDays: string[];
  heatmap: HeatmapEntry[];
};

export type PostPerformance = {
  id: string;
  content: string | null;
  postedAt: Date | null;
  views: number;
  forwards: number;
  totalReactions: number;
};

export type ContentPerformanceResult = {
  posts: PostPerformance[];
  topPost: PostPerformance | null;
  avgViews: number;
  avgReactions: number;
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function countReactions(reactions: unknown): number {
  if (!reactions || typeof reactions !== "object") return 0;
  const obj = reactions as Record<string, unknown>;
  let total = 0;
  for (const value of Object.values(obj)) {
    if (typeof value === "number") total += value;
  }
  return total;
}

export async function getChannelGrowthRate(
  channelId: string,
  dateRange: DateRange,
): Promise<ChannelGrowthResult> {
  const rows = await db
    .select({
      date: channelMetrics.date,
      followerCountSnapshot: channelMetrics.followerCountSnapshot,
    })
    .from(channelMetrics)
    .where(
      and(
        eq(channelMetrics.channelId, channelId),
        gte(channelMetrics.date, dateRange.start.toISOString().split("T")[0]!),
        lte(channelMetrics.date, dateRange.end.toISOString().split("T")[0]!),
      ),
    )
    .orderBy(channelMetrics.date);

  const validRows = rows.filter(
    (r): r is typeof r & { followerCountSnapshot: number } => r.followerCountSnapshot !== null,
  );

  if (validRows.length === 0) {
    return { rate: 0, trend: "stable", dataPoints: [] };
  }

  const dataPoints: GrowthDataPoint[] = validRows.map((r) => ({
    date: r.date,
    subscribers: r.followerCountSnapshot,
  }));

  if (validRows.length < 2) {
    return { rate: 0, trend: "stable", dataPoints };
  }

  const first = validRows[0]!.followerCountSnapshot;
  const last = validRows[validRows.length - 1]!.followerCountSnapshot;

  if (first === 0) {
    return { rate: 0, trend: "stable", dataPoints };
  }

  const rate = Math.round(((last - first) / first) * 100);
  const trend: GrowthTrend = rate > 0 ? "up" : rate < 0 ? "down" : "stable";

  return { rate, trend, dataPoints };
}

export async function getBestPostingTimes(channelId: string): Promise<BestPostingTimesResult> {
  const rows = await db
    .select({
      postedAt: telegramPosts.postedAt,
      views: telegramPosts.views,
    })
    .from(telegramPosts)
    .where(eq(telegramPosts.channelId, channelId))
    .orderBy(desc(telegramPosts.postedAt));

  if (rows.length === 0) {
    return { bestHours: [], bestDays: [], heatmap: [] };
  }

  const hourStats = new Map<number, { totalViews: number; count: number }>();
  const dayStats = new Map<string, { totalViews: number; count: number }>();
  const heatmapStats = new Map<
    string,
    { totalViews: number; count: number; hour: number; day: string }
  >();

  for (const row of rows) {
    if (!row.postedAt) continue;

    const hour = row.postedAt.getUTCHours();
    const dayName = DAY_NAMES[row.postedAt.getUTCDay()]!;
    const views = row.views ?? 0;

    const hourEntry = hourStats.get(hour) ?? { totalViews: 0, count: 0 };
    hourEntry.totalViews += views;
    hourEntry.count += 1;
    hourStats.set(hour, hourEntry);

    const dayEntry = dayStats.get(dayName) ?? { totalViews: 0, count: 0 };
    dayEntry.totalViews += views;
    dayEntry.count += 1;
    dayStats.set(dayName, dayEntry);

    const heatKey = `${dayName}-${hour}`;
    const heatEntry = heatmapStats.get(heatKey) ?? {
      totalViews: 0,
      count: 0,
      hour,
      day: dayName,
    };
    heatEntry.totalViews += views;
    heatEntry.count += 1;
    heatmapStats.set(heatKey, heatEntry);
  }

  const hourAvgs = Array.from(hourStats.entries())
    .map(([hour, stats]) => ({
      hour,
      avgViews: stats.count > 0 ? stats.totalViews / stats.count : 0,
    }))
    .sort((a, b) => b.avgViews - a.avgViews);

  const dayAvgs = Array.from(dayStats.entries())
    .map(([day, stats]) => ({
      day,
      avgViews: stats.count > 0 ? stats.totalViews / stats.count : 0,
    }))
    .sort((a, b) => b.avgViews - a.avgViews);

  const bestHours = hourAvgs.slice(0, 3).map((h) => h.hour);
  const bestDays = dayAvgs.slice(0, 3).map((d) => d.day);

  const heatmap: HeatmapEntry[] = Array.from(heatmapStats.values()).map((entry) => ({
    hour: entry.hour,
    day: entry.day,
    avgViews: Math.round(entry.count > 0 ? entry.totalViews / entry.count : 0),
  }));

  return { bestHours, bestDays, heatmap };
}

export async function getContentPerformance(
  channelId: string,
  dateRange: DateRange,
): Promise<ContentPerformanceResult> {
  const rows = await db
    .select({
      id: telegramPosts.id,
      contentRaw: telegramPosts.contentRaw,
      postedAt: telegramPosts.postedAt,
      views: telegramPosts.views,
      forwards: telegramPosts.forwards,
      reactions: telegramPosts.reactions,
    })
    .from(telegramPosts)
    .where(
      and(
        eq(telegramPosts.channelId, channelId),
        gte(telegramPosts.postedAt, dateRange.start),
        lte(telegramPosts.postedAt, dateRange.end),
      ),
    )
    .orderBy(desc(telegramPosts.views));

  if (rows.length === 0) {
    return { posts: [], topPost: null, avgViews: 0, avgReactions: 0 };
  }

  const posts: PostPerformance[] = rows.map((r) => ({
    id: r.id,
    content: r.contentRaw,
    postedAt: r.postedAt,
    views: r.views ?? 0,
    forwards: r.forwards ?? 0,
    totalReactions: countReactions(r.reactions),
  }));

  const totalViews = posts.reduce((sum, p) => sum + p.views, 0);
  const totalReactions = posts.reduce((sum, p) => sum + p.totalReactions, 0);

  const avgViews = Math.round(totalViews / posts.length);
  const avgReactions = Math.round((totalReactions / posts.length) * 100) / 100;

  const topPost = posts.reduce((top, p) => (p.views > top.views ? p : top));

  return { posts, topPost, avgViews, avgReactions };
}
