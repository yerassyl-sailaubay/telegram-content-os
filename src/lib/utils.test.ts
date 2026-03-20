import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn()", () => {
  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });

  it("returns a single class name unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("merges multiple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes (falsy values are ignored)", () => {
    expect(cn("foo", false && "bar", null, undefined, "baz")).toBe("foo baz");
  });

  it("deduplicates conflicting Tailwind classes (tailwind-merge)", () => {
    // tailwind-merge should keep the last conflicting class
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles array of class names", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles object syntax from clsx", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
  });
});
