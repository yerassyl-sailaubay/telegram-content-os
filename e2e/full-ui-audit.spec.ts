import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

if (!email || !password) {
  throw new Error("E2E_EMAIL and E2E_PASSWORD are required");
}

test("full authenticated UI audit", async ({ page }) => {
  test.setTimeout(180_000);
  const uniqueName = `E2E Audit ${Date.now()}`;
  const ideaText = `E2E audit idea ${Date.now()} - validate quick capture path end-to-end.`;

  // Login with prepared credentials.
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();

  await page.waitForLoadState("networkidle");

  // If login is blocked (e.g., email confirmation), fail explicitly.
  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    const errorText = (await page.locator("body").innerText()).slice(0, 800);
    throw new Error(`Login did not reach dashboard. URL=${currentUrl}. Page excerpt=${errorText}`);
  }

  // Core dashboard check + quick capture present
  await expect(page.locator('[data-testid="quick-capture"]')).toBeVisible();

  // Route-level checks for major dashboard pages.
  const dashboardRoutes = [
    "/dashboard",
    "/dashboard/posts",
    "/dashboard/channels",
    "/dashboard/schedule",
    "/dashboard/analytics",
    "/dashboard/media",
    "/dashboard/create",
    "/dashboard/settings",
    "/dashboard/billing",
    "/dashboard/telegram-post",
    "/dashboard/crosspost",
    "/dashboard/publish",
  ];

  for (const route of dashboardRoutes) {
    const response = await page.goto(route);
    expect(response, `No response for ${route}`).not.toBeNull();
    const status = response?.status() ?? 0;
    console.log(`ROUTE_STATUS ${route} ${status}`);
    if (status >= 400) {
      const body = (await response?.text()) ?? "";
      throw new Error(`Bad status for ${route}: ${status}. Body snippet: ${body.slice(0, 1200)}`);
    }
    await page.waitForLoadState("domcontentloaded");

    // Basic sanity: should not bounce back to login
    expect(page.url(), `Unexpected auth redirect while opening ${route}`).not.toContain("/login");
  }

  // Settings: profile save
  await page.goto("/dashboard/settings");
  await expect(page.locator('[data-testid="settings-tabs"]')).toBeVisible();
  await page.locator('[data-testid="profile-name-input"]').fill(uniqueName);
  await page.locator('[data-testid="profile-save-button"]').click();
  await expect(page.locator('[data-testid="profile-saved"]')).toBeVisible();

  // Settings: AI preferences save
  await page.locator('[data-testid="tab-ai-preferences"]').click();
  await page.locator('[data-testid="ai-model-select"]').click();
  await page.getByRole("option", { name: /gemini flash/i }).click();
  await page.locator('[data-testid="adaptation-tone-select"]').click();
  await page.getByRole("option", { name: /professional/i }).click();
  await page.locator('[data-testid="ai-preferences-save-button"]').click();
  await expect(page.locator('[data-testid="ai-preferences-saved"]')).toBeVisible();

  // Create idea from dashboard quick capture.
  await page.goto("/dashboard");
  await page.locator('[data-testid="quick-capture-textarea"]').fill(ideaText);
  await page.locator('[data-testid="quick-capture-submit"]').click();
  await expect(page.locator('[data-testid="quick-capture-textarea"]')).toHaveValue("");

  // Validate idea appears in content library / Ideas tab.
  await page.goto("/dashboard/posts");
  await page.locator('[data-testid="tab-idea"]').click();
  await expect(page.locator('[data-testid="content-grid"]')).toBeVisible();
  const ideaCard = page
    .locator('[data-testid="content-card"]')
    .filter({ hasText: ideaText.slice(0, 40) })
    .first();
  await expect(ideaCard).toBeVisible({ timeout: 15000 });

  console.log(JSON.stringify({ auditEmail: email, auditName: uniqueName, auditIdea: ideaText }));
});
