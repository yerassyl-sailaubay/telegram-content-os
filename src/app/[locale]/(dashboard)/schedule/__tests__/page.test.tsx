import { describe, expect, it, vi } from "vitest";

const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

import SchedulePage from "../page";

describe("/schedule page", () => {
  it("redirects to /dashboard/schedule", async () => {
    await expect(SchedulePage()).rejects.toThrow("REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/schedule");
  });
});
