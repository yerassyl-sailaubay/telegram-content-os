import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL;

if (!baseURL) {
  throw new Error("E2E_BASE_URL is required for agent smoke tests");
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: /agent-prod-smoke\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-agent" }]],
  timeout: 180_000,
  expect: {
    timeout: 20_000,
  },
  globalSetup: "./e2e/setup/prod-auth.global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    storageState: process.env.E2E_STORAGE_STATE_PATH ?? "e2e/.auth/user.json",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
