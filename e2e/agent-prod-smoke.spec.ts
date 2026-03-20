import { expect, test } from "@playwright/test";

const expectedChannelName = process.env.E2E_EXPECTED_CHANNEL_NAME;

const dashboardRoutes = [
  "/dashboard",
  "/dashboard/posts",
  "/dashboard/channels",
  "/dashboard/schedule",
  "/dashboard/analytics",
  "/dashboard/create",
  "/dashboard/settings",
  "/dashboard/billing",
  "/dashboard/telegram-post",
  "/dashboard/media",
];

test.describe("agent production smoke", () => {
  test("core authenticated dashboard routes return success", async ({ page }) => {
    test.setTimeout(180_000);

    for (const route of dashboardRoutes) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });

      expect(response, `No response for route ${route}`).not.toBeNull();
      const status = response?.status() ?? 0;

      if (status >= 400) {
        const body = (await response?.text()) ?? "";
        throw new Error(`Bad status for ${route}: ${status}. Body: ${body.slice(0, 1000)}`);
      }

      await page.waitForLoadState("networkidle");
      expect(page.url(), `Unexpected redirect while opening ${route}`).not.toContain("/login");
    }
  });

  test("connected channels are visible", async ({ page }) => {
    await page.goto("/dashboard/channels", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const channelCards = page.locator('[data-testid="channel-card"]');
    await expect(channelCards.first()).toBeVisible();

    const channelCount = await channelCards.count();
    expect(channelCount).toBeGreaterThan(0);

    if (expectedChannelName) {
      await expect(
        page
          .locator('[data-testid="channel-card-title"]')
          .filter({ hasText: expectedChannelName })
          .first(),
      ).toBeVisible();
    }
  });

  test("quick capture creates an idea visible in posts", async ({ page }) => {
    const ideaText = `Agent smoke idea ${Date.now()} - verify quick capture path`;
    const ideaPrefix = ideaText.slice(0, 28);

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-testid="quick-capture"]')).toBeVisible();
    await page.locator('[data-testid="quick-capture-textarea"]').fill(ideaText);
    await page.locator('[data-testid="quick-capture-submit"]').click();
    await expect(page.locator('[data-testid="quick-capture-textarea"]')).toHaveValue("");

    await page.goto("/dashboard/posts", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    await page.locator('[data-testid="tab-idea"]').click();
    await expect(page.locator('[data-testid="content-grid"]')).toBeVisible();

    const createdIdeaCard = page
      .locator('[data-testid="content-card"]')
      .filter({ hasText: ideaPrefix })
      .first();

    await expect(createdIdeaCard).toBeVisible({ timeout: 30_000 });
  });

  test("service endpoints are healthy", async ({ request }) => {
    const healthResponse = await request.get("/api/health");
    expect(healthResponse.status()).toBe(200);
    await expect(healthResponse.json()).resolves.toEqual({ status: "ok" });

    const inngestResponse = await request.get("/api/inngest");
    expect(inngestResponse.status()).toBe(200);

    const inngestBody = await inngestResponse.json();
    expect(inngestBody.mode).toBe("cloud");
    expect(inngestBody.has_signing_key).toBe(true);
    expect(inngestBody.has_event_key).toBe(true);
    expect(inngestBody.function_count).toBeGreaterThan(0);
  });
});
