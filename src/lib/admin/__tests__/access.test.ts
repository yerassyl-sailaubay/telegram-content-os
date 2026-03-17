import { afterEach, describe, expect, it } from "vitest";
import { getAdminAccessMode, getConfiguredAdminEmails, isAdminEmail } from "../access";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.ADMIN_EMAIL;
  delete process.env.ADMIN_EMAILS;
}

afterEach(() => {
  resetEnv();
});

describe("admin access helpers", () => {
  it("uses ADMIN_EMAILS list when provided", () => {
    process.env.ADMIN_EMAILS = "owner@example.com, admin@example.com";

    expect(getConfiguredAdminEmails()).toEqual(["owner@example.com", "admin@example.com"]);
    expect(isAdminEmail("OWNER@example.com")).toBe(true);
    expect(isAdminEmail("random@example.com")).toBe(false);
    expect(getAdminAccessMode()).toBe("restricted");
  });

  it("falls back to ADMIN_EMAIL when ADMIN_EMAILS is missing", () => {
    process.env.ADMIN_EMAIL = "fallback@example.com";

    expect(getConfiguredAdminEmails()).toEqual(["fallback@example.com"]);
    expect(isAdminEmail("fallback@example.com")).toBe(true);
    expect(getAdminAccessMode()).toBe("restricted");
  });

  it("uses open_dev mode in non-production when no admin emails configured", () => {
    process.env = { ...process.env, NODE_ENV: "test" };

    expect(getConfiguredAdminEmails()).toEqual([]);
    expect(getAdminAccessMode()).toBe("open_dev");
    expect(isAdminEmail("anyone@example.com")).toBe(true);
  });

  it("denies all users in production when no admin emails configured", () => {
    process.env = { ...process.env, NODE_ENV: "production" };

    expect(getConfiguredAdminEmails()).toEqual([]);
    expect(getAdminAccessMode()).toBe("restricted");
    expect(isAdminEmail("anyone@example.com")).toBe(false);
  });
});
