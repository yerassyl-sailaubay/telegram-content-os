import { describe, it, expect } from "vitest";
import {
  localToUtc,
  utcToLocal,
  formatInTz,
  getUtcOffset,
  formatTimezoneDisplay,
  isInPast,
  getHourLabels,
  ALL_TIMEZONES,
  TIMEZONE_GROUPS,
} from "../timezone";

describe("timezone utilities", () => {
  describe("localToUtc", () => {
    it("converts Almaty local time to UTC (UTC+5)", () => {
      // 2026-03-05 10:00:00 in Asia/Almaty → 2026-03-05 05:00:00 UTC
      const localDate = new Date(2026, 2, 5, 10, 0, 0);
      const utcDate = localToUtc(localDate, "Asia/Almaty");
      expect(utcDate.toISOString()).toBe("2026-03-05T05:00:00.000Z");
    });

    it("converts New York local time to UTC (UTC-5 in winter)", () => {
      // 2026-01-15 09:00:00 in America/New_York → 2026-01-15 14:00:00 UTC
      const localDate = new Date(2026, 0, 15, 9, 0, 0);
      const utcDate = localToUtc(localDate, "America/New_York");
      expect(utcDate.toISOString()).toBe("2026-01-15T14:00:00.000Z");
    });

    it("handles UTC timezone as identity", () => {
      const date = new Date(2026, 5, 15, 12, 0, 0);
      const utcDate = localToUtc(date, "UTC");
      expect(utcDate.toISOString()).toBe("2026-06-15T12:00:00.000Z");
    });
  });

  describe("utcToLocal", () => {
    it("converts UTC to Almaty local time (UTC+5)", () => {
      const utcDate = new Date("2026-03-05T05:00:00.000Z");
      const localDate = utcToLocal(utcDate, "Asia/Almaty");
      expect(localDate.getHours()).toBe(10);
      expect(localDate.getDate()).toBe(5);
    });

    it("converts UTC to Tokyo local time (UTC+9)", () => {
      const utcDate = new Date("2026-03-05T15:00:00.000Z");
      const localDate = utcToLocal(utcDate, "Asia/Tokyo");
      // 15:00 UTC + 9 = 00:00 next day
      expect(localDate.getHours()).toBe(0);
      expect(localDate.getDate()).toBe(6);
    });
  });

  describe("formatInTz", () => {
    it("formats a UTC date in a specific timezone", () => {
      const utcDate = new Date("2026-03-05T10:00:00.000Z");
      const result = formatInTz(utcDate, "Asia/Almaty", "yyyy-MM-dd HH:mm");
      expect(result).toBe("2026-03-05 15:00");
    });

    it("formats with day-of-week pattern", () => {
      const utcDate = new Date("2026-03-05T10:00:00.000Z");
      const result = formatInTz(utcDate, "UTC", "EEEE");
      expect(result).toBe("Thursday");
    });
  });

  describe("getUtcOffset", () => {
    it("returns offset for UTC", () => {
      const offset = getUtcOffset("UTC");
      expect(offset).toBe("+00:00");
    });

    it("returns correct offset for Almaty", () => {
      const offset = getUtcOffset("Asia/Almaty", new Date("2026-01-15T00:00:00Z"));
      expect(offset).toBe("+05:00");
    });

    it("returns correct offset for Tokyo", () => {
      const offset = getUtcOffset("Asia/Tokyo", new Date("2026-01-15T00:00:00Z"));
      expect(offset).toBe("+09:00");
    });
  });

  describe("formatTimezoneDisplay", () => {
    it("formats timezone with offset", () => {
      const display = formatTimezoneDisplay("Asia/Almaty", new Date("2026-06-15T00:00:00Z"));
      expect(display).toBe("Asia/Almaty (UTC+05:00)");
    });

    it("replaces underscores with spaces", () => {
      const display = formatTimezoneDisplay("America/New_York", new Date("2026-01-15T00:00:00Z"));
      expect(display).toContain("America/New York");
    });
  });

  describe("isInPast", () => {
    it("returns true for past dates", () => {
      const pastDate = new Date("2020-01-01T00:00:00Z");
      expect(isInPast(pastDate)).toBe(true);
    });

    it("returns false for future dates", () => {
      const futureDate = new Date("2099-01-01T00:00:00Z");
      expect(isInPast(futureDate)).toBe(false);
    });
  });

  describe("getHourLabels", () => {
    it("returns 24 hour labels", () => {
      const labels = getHourLabels("UTC", new Date("2026-03-05T00:00:00Z"));
      expect(labels).toHaveLength(24);
      expect(labels[0]).toBe("00:00");
      expect(labels[12]).toBe("12:00");
      expect(labels[23]).toBe("23:00");
    });
  });

  describe("TIMEZONE_GROUPS", () => {
    it("has at least 4 groups", () => {
      expect(TIMEZONE_GROUPS.length).toBeGreaterThanOrEqual(4);
    });

    it("ALL_TIMEZONES contains all timezone values", () => {
      const total = TIMEZONE_GROUPS.reduce((sum, g) => sum + g.timezones.length, 0);
      expect(ALL_TIMEZONES).toHaveLength(total);
    });

    it("includes common timezones", () => {
      expect(ALL_TIMEZONES).toContain("UTC");
      expect(ALL_TIMEZONES).toContain("America/New_York");
      expect(ALL_TIMEZONES).toContain("Asia/Almaty");
      expect(ALL_TIMEZONES).toContain("Europe/Moscow");
    });
  });
});
