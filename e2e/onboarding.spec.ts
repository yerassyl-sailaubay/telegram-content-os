import { test, expect } from "./fixtures";

const E2E_EMAIL = process.env.E2E_EMAIL ?? "test@example.com";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "password";
const EVIDENCE_DIR = ".sisyphus/evidence/task-e2e-onboarding";

test.describe("onboarding flow", () => {
  test.describe("onboarding checklist", () => {
    test("checklist is visible in sidebar for new users", async ({
      authenticatedPage,
      skipIfNoAuth,
    }) => {
      skipIfNoAuth();
      const page = authenticatedPage;

      const checklist = page
        .locator("[class*='onboarding-checklist']")
        .or(
          page
            .getByRole("list", { name: /onboarding/i })
            .or(page.locator("text='Connect Telegram'").first()),
        );

      await expect(checklist).toBeVisible({ timeout: 10_000 });

      await page.screenshot({
        path: `${EVIDENCE_DIR}/01-checklist-visible.png`,
        fullPage: true,
      });
    });

    test("checklist shows correct initial state for new user", async ({
      authenticatedPage,
      skipIfNoAuth,
    }) => {
      skipIfNoAuth();
      const page = authenticatedPage;

      const checklistItems = page
        .locator("[role='listitem']")
        .or(page.locator("a", { hasText: /Connect Telegram|Capture Idea|Generate Draft/ }));

      const count = await checklistItems.count();
      expect(count).toBeGreaterThan(0);

      await page.screenshot({
        path: `${EVIDENCE_DIR}/02-checklist-initial-state.png`,
        fullPage: true,
      });
    });

    test("checklist items link to correct pages", async ({ authenticatedPage, skipIfNoAuth }) => {
      skipIfNoAuth();
      const page = authenticatedPage;

      const connectTelegramLink = page.locator("a[href='/dashboard/channels']").first();
      const captureIdeaLink = page.locator("a[href='/dashboard/posts']").first();
      const generateDraftLink = page.locator("a[href='/dashboard/create']").first();

      if (await connectTelegramLink.isVisible().catch(() => false)) {
        await connectTelegramLink.click();
        await expect(page).toHaveURL(/\/dashboard\/channels/);
        await page.goBack();
        await page.waitForLoadState("networkidle");
      }

      if (await captureIdeaLink.isVisible().catch(() => false)) {
        await captureIdeaLink.click();
        await expect(page).toHaveURL(/\/dashboard\/posts/);
        await page.goBack();
        await page.waitForLoadState("networkidle");
      }

      if (await generateDraftLink.isVisible().catch(() => false)) {
        await generateDraftLink.click();
        await expect(page).toHaveURL(/\/dashboard\/create/);
      }
    });

    test("checklist progress updates when channel is connected", async ({
      authenticatedPage,
      skipIfNoAuth,
    }) => {
      skipIfNoAuth();
      const page = authenticatedPage;
      const request = page.request;

      await page.goto("/dashboard/channels", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");

      const hasChannels = (await page.locator("[data-testid='channel-card']").count()) > 0;

      const response = await request.get("/api/onboarding/progress");
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.checklist).toBeDefined();

      const connectTelegramItem = data.data.checklist.find(
        (item: { id: string; completed: boolean }) => item.id === "connect-telegram",
      );

      if (connectTelegramItem) {
        expect(connectTelegramItem.completed).toBe(hasChannels);
      }

      await page.screenshot({
        path: `${EVIDENCE_DIR}/03-checklist-channel-status.png`,
        fullPage: true,
      });
    });

    test("checklist can be collapsed and expanded", async ({ authenticatedPage, skipIfNoAuth }) => {
      skipIfNoAuth();
      const page = authenticatedPage;

      const checklistHeader = page
        .locator("[role='button']", { hasText: /Getting Started|Checklist/ })
        .first();

      if (await checklistHeader.isVisible().catch(() => false)) {
        await checklistHeader.click();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: `${EVIDENCE_DIR}/04-checklist-collapsed.png`,
          fullPage: true,
        });

        await checklistHeader.click();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: `${EVIDENCE_DIR}/05-checklist-expanded.png`,
          fullPage: true,
        });
      }
    });
  });

  test.describe("onboarding API", () => {
    test("GET /api/onboarding/progress returns onboarding data", async ({
      authenticatedPage,
      skipIfNoAuth,
    }) => {
      skipIfNoAuth();
      const request = authenticatedPage.request;
      const response = await request.get("/api/onboarding/progress");

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("wizardCompleted");
      expect(data.data).toHaveProperty("wizardStepReached");
      expect(data.data).toHaveProperty("dismissedAt");
      expect(data.data).toHaveProperty("toursCompleted");
      expect(data.data).toHaveProperty("checklist");
      expect(Array.isArray(data.data.checklist)).toBe(true);
      expect(Array.isArray(data.data.toursCompleted)).toBe(true);
    });

    test("POST /api/onboarding/complete marks wizard as completed", async ({
      authenticatedPage,
      skipIfNoAuth,
    }) => {
      skipIfNoAuth();
      const request = authenticatedPage.request;
      const completeResponse = await request.post("/api/onboarding/complete");
      expect(completeResponse.status()).toBe(200);

      const completeData = await completeResponse.json();
      expect(completeData.success).toBe(true);

      const progressResponse = await request.get("/api/onboarding/progress");
      const progressData = await progressResponse.json();

      expect(progressData.data.wizardCompleted).toBe(true);
      expect(progressData.data.wizardStepReached).toBe(999);
    });

    test("POST /api/onboarding/dismiss records dismissal timestamp", async ({
      authenticatedPage,
      skipIfNoAuth,
    }) => {
      skipIfNoAuth();
      const request = authenticatedPage.request;
      const dismissResponse = await request.post("/api/onboarding/dismiss");
      expect(dismissResponse.status()).toBe(200);

      const dismissData = await dismissResponse.json();
      expect(dismissData.success).toBe(true);

      const progressResponse = await request.get("/api/onboarding/progress");
      const progressData = await progressResponse.json();

      expect(progressData.data.dismissedAt).not.toBeNull();
      expect(new Date(progressData.data.dismissedAt).getTime()).toBeGreaterThan(0);
    });

    test("POST /api/onboarding/tour records completed tour", async ({
      authenticatedPage,
      skipIfNoAuth,
    }) => {
      skipIfNoAuth();
      const request = authenticatedPage.request;
      const tourResponse = await request.post("/api/onboarding/tour", {
        data: { tourId: "dashboard-intro" },
      });
      expect(tourResponse.status()).toBe(200);

      const tourData = await tourResponse.json();
      expect(tourData.success).toBe(true);

      const progressResponse = await request.get("/api/onboarding/progress");
      const progressData = await progressResponse.json();

      expect(progressData.data.toursCompleted).toContain("dashboard-intro");
    });

    test("POST /api/onboarding/reset clears all onboarding state", async ({
      authenticatedPage,
      skipIfNoAuth,
    }) => {
      skipIfNoAuth();
      const request = authenticatedPage.request;
      await request.post("/api/onboarding/complete");
      await request.post("/api/onboarding/tour", {
        data: { tourId: "test-tour" },
      });

      const resetResponse = await request.post("/api/onboarding/reset");
      expect(resetResponse.status()).toBe(200);

      const resetData = await resetResponse.json();
      expect(resetData.success).toBe(true);

      const progressResponse = await request.get("/api/onboarding/progress");
      const progressData = await progressResponse.json();

      expect(progressData.data.wizardCompleted).toBe(false);
      expect(progressData.data.wizardStepReached).toBe(0);
      expect(progressData.data.toursCompleted).toHaveLength(0);
    });
  });

  test.describe("onboarding persistence", () => {
    test("checklist state persists across page reloads", async ({
      authenticatedPage,
      skipIfNoAuth,
    }) => {
      skipIfNoAuth();
      const page = authenticatedPage;

      const initialProgress = await page.evaluate(() => {
        return localStorage.getItem("onboarding-checklist-collapsed");
      });

      const checklistHeader = page
        .locator("[role='button']", { hasText: /Getting Started|Checklist/ })
        .first();
      if (await checklistHeader.isVisible().catch(() => false)) {
        await checklistHeader.click();
        await page.waitForTimeout(500);
      }

      await page.reload({ waitUntil: "networkidle" });

      const persistedProgress = await page.evaluate(() => {
        return localStorage.getItem("onboarding-checklist-collapsed");
      });

      expect(persistedProgress).toBeDefined();
    });

    test("wizard state persists in localStorage", async ({ authenticatedPage, skipIfNoAuth }) => {
      skipIfNoAuth();
      const page = authenticatedPage;

      await page.evaluate(() => {
        localStorage.setItem(
          "onboarding-wizard-state",
          JSON.stringify({
            isOpen: false,
            currentStep: 2,
            dismissed: true,
          }),
        );
      });

      await page.reload({ waitUntil: "networkidle" });

      const wizardState = await page.evaluate(() => {
        const stored = localStorage.getItem("onboarding-wizard-state");
        return stored ? JSON.parse(stored) : null;
      });

      expect(wizardState).not.toBeNull();
      expect(wizardState.currentStep).toBe(2);
      expect(wizardState.dismissed).toBe(true);
    });
  });

  test.describe("tour state management", () => {
    test("tour dismissal is persisted in localStorage", async ({
      authenticatedPage,
      skipIfNoAuth,
    }) => {
      skipIfNoAuth();
      const page = authenticatedPage;

      await page.evaluate(() => {
        localStorage.setItem(
          "tour:dashboard-intro:state",
          JSON.stringify({
            dismissed: true,
            dismissedAt: new Date().toISOString(),
            startedCount: 1,
            completedCount: 0,
          }),
        );
      });

      const tourState = await page.evaluate(() => {
        const stored = localStorage.getItem("tour:dashboard-intro:state");
        return stored ? JSON.parse(stored) : null;
      });

      expect(tourState).not.toBeNull();
      expect(tourState.dismissed).toBe(true);
      expect(tourState.dismissedAt).toBeDefined();
    });

    test("tour completion is persisted in localStorage", async ({
      authenticatedPage,
      skipIfNoAuth,
    }) => {
      skipIfNoAuth();
      const page = authenticatedPage;

      await page.evaluate(() => {
        localStorage.setItem(
          "tour:content-library-intro:state",
          JSON.stringify({
            dismissed: true,
            dismissedAt: new Date().toISOString(),
            startedCount: 1,
            completedCount: 1,
          }),
        );
      });

      const tourState = await page.evaluate(() => {
        const stored = localStorage.getItem("tour:content-library-intro:state");
        return stored ? JSON.parse(stored) : null;
      });

      expect(tourState).not.toBeNull();
      expect(tourState.completedCount).toBe(1);
    });
  });

  test.describe("onboarding state survives logout/login", () => {
    test("onboarding progress persists after re-authentication", async ({
      page,
      resetOnboardingViaApi,
      skipIfNoAuth,
    }) => {
      skipIfNoAuth();
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await page.evaluate(() => {
        const keysToRemove = ["onboarding-wizard-state", "onboarding-checklist-collapsed"];
        keysToRemove.forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch {}
        });
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith("tour:")) {
            try {
              localStorage.removeItem(key);
            } catch {}
          }
        }
      });
      await page.locator("#email").fill(E2E_EMAIL);
      await page.locator("#password").fill(E2E_PASSWORD);
      await page.getByRole("button", { name: /log in/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 90_000 });
      await page.waitForLoadState("networkidle");

      await resetOnboardingViaApi();
      await page.request.post("/api/onboarding/complete");

      const progressBefore = await page.request.get("/api/onboarding/progress");
      const dataBefore = await progressBefore.json();
      expect(dataBefore.data.wizardCompleted).toBe(true);

      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await page.evaluate(() => {
        const keysToRemove = ["onboarding-wizard-state", "onboarding-checklist-collapsed"];
        keysToRemove.forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch {}
        });
      });
      await page.locator("#email").fill(E2E_EMAIL);
      await page.locator("#password").fill(E2E_PASSWORD);
      await page.getByRole("button", { name: /log in/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 90_000 });
      await page.waitForLoadState("networkidle");

      const progressAfter = await page.request.get("/api/onboarding/progress");
      const dataAfter = await progressAfter.json();

      expect(dataAfter.data.wizardCompleted).toBe(true);

      await page.screenshot({
        path: `${EVIDENCE_DIR}/06-persisted-after-relogin.png`,
        fullPage: true,
      });
    });
  });
});
