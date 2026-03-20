import fs from "node:fs";
import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const email = getRequiredEnv("E2E_EMAIL");
  const password = getRequiredEnv("E2E_PASSWORD");
  const storageStatePath = process.env.E2E_STORAGE_STATE_PATH ?? "e2e/.auth/user.json";

  fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: config.projects[0]?.use?.baseURL as string });
  const page = await context.newPage();

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 90_000 });
  await page.waitForLoadState("networkidle");

  await context.storageState({ path: storageStatePath });

  await context.close();
  await browser.close();
}
