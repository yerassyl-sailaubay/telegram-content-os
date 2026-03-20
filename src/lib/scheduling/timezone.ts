import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { format } from "date-fns";

/**
 * Common timezones grouped by region for the timezone selector.
 * Each entry includes the IANA timezone identifier and a human-readable label.
 */
export const TIMEZONE_GROUPS = [
  {
    label: "Americas",
    timezones: [
      { value: "America/New_York", label: "New York (ET)" },
      { value: "America/Chicago", label: "Chicago (CT)" },
      { value: "America/Denver", label: "Denver (MT)" },
      { value: "America/Los_Angeles", label: "Los Angeles (PT)" },
      { value: "America/Toronto", label: "Toronto (ET)" },
      { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
    ],
  },
  {
    label: "Europe",
    timezones: [
      { value: "Europe/London", label: "London (GMT/BST)" },
      { value: "Europe/Paris", label: "Paris (CET)" },
      { value: "Europe/Berlin", label: "Berlin (CET)" },
      { value: "Europe/Moscow", label: "Moscow (MSK)" },
      { value: "Europe/Istanbul", label: "Istanbul (TRT)" },
    ],
  },
  {
    label: "Asia",
    timezones: [
      { value: "Asia/Dubai", label: "Dubai (GST)" },
      { value: "Asia/Kolkata", label: "Kolkata (IST)" },
      { value: "Asia/Bangkok", label: "Bangkok (ICT)" },
      { value: "Asia/Shanghai", label: "Shanghai (CST)" },
      { value: "Asia/Tokyo", label: "Tokyo (JST)" },
      { value: "Asia/Seoul", label: "Seoul (KST)" },
      { value: "Asia/Almaty", label: "Almaty (ALMT)" },
    ],
  },
  {
    label: "Other",
    timezones: [
      { value: "UTC", label: "UTC" },
      { value: "Pacific/Auckland", label: "Auckland (NZST)" },
      { value: "Australia/Sydney", label: "Sydney (AEST)" },
    ],
  },
] as const;

/** Flat list of all available timezone values */
export const ALL_TIMEZONES = TIMEZONE_GROUPS.flatMap((g) => g.timezones.map((tz) => tz.value));

/**
 * Convert a local datetime in a given timezone to a UTC Date object.
 * Use when the user picks "March 5 at 10:00 in Asia/Almaty" and we need UTC for DB storage.
 */
export function localToUtc(date: Date, timezone: string): Date {
  return fromZonedTime(date, timezone);
}

/**
 * Convert a UTC Date object to the equivalent local time in the given timezone.
 * Use when reading from DB (which stores UTC) and displaying in user's timezone.
 */
export function utcToLocal(date: Date, timezone: string): Date {
  return toZonedTime(date, timezone);
}

/**
 * Format a UTC date in the user's timezone with a given format string.
 * Wraps date-fns-tz's `formatInTimeZone`.
 */
export function formatInTz(date: Date, timezone: string, formatStr: string): string {
  return formatInTimeZone(date, timezone, formatStr);
}

/**
 * Get the current UTC offset string for a timezone (e.g., "+05:00", "-08:00").
 */
export function getUtcOffset(timezone: string, date?: Date): string {
  const d = date ?? new Date();
  return formatInTimeZone(d, timezone, "xxx");
}

/**
 * Format a timezone for display: "Asia/Almaty (UTC+06:00)"
 */
export function formatTimezoneDisplay(timezone: string, date?: Date): string {
  const offset = getUtcOffset(timezone, date);
  return `${timezone.replace(/_/g, " ")} (UTC${offset})`;
}

/**
 * Detect the user's browser timezone (IANA string).
 * Falls back to UTC if detection fails.
 */
export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * Check if a given date (in UTC) is in the past relative to the current time.
 */
export function isInPast(utcDate: Date): boolean {
  return utcDate.getTime() < Date.now();
}

/**
 * Get hour labels for a day view (0-23).
 */
export function getHourLabels(timezone: string, date: Date): string[] {
  const labels: string[] = [];
  const zonedDate = toZonedTime(date, timezone);
  for (let h = 0; h < 24; h++) {
    const hourDate = new Date(zonedDate);
    hourDate.setHours(h, 0, 0, 0);
    labels.push(format(hourDate, "HH:00"));
  }
  return labels;
}
