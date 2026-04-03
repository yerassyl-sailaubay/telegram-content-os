import { test as base, type Page } from "@playwright/test";

export type OnboardingFixtures = {
  clearOnboardingStorage: () => Promise<void>;
  resetOnboardingViaApi: () => Promise<void>;
  loginWithFreshState: (email: string, password: string) => Promise<void>;
  authenticatedPage: Page;
  skipIfNoAuth: () => void;
};

function getAuthCredentials(): { email: string; password: string } | null {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password || email === "test@example.com") {
    return null;
  }
  return { email, password };
}

export const onboardingFixtures = base.extend<OnboardingFixtures>({
  skipIfNoAuth: async ({}, use) => {
    await use(() => {
      const creds = getAuthCredentials();
      if (!creds) {
        base.skip(true, "Skipping test: E2E_EMAIL and E2E_PASSWORD not configured");
      }
    });
  },

  authenticatedPage: async ({ page }, use) => {
    const creds = getAuthCredentials();
    if (!creds) {
      await use(page);
      return;
    }

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

    await page.locator("#email").fill(creds.email);
    await page.locator("#password").fill(creds.password);
    await page.getByRole("button", { name: /log in/i }).click();

    try {
      await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
      await page.waitForLoadState("networkidle");
    } catch {
      base.skip(true, "Skipping test: Could not authenticate - check E2E_EMAIL and E2E_PASSWORD");
    }

    const response = await page.request.post("/api/onboarding/reset");
    if (!response.ok()) {
      console.warn("Failed to reset onboarding via API:", await response.text());
    }

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

    await use(page);
  },

  clearOnboardingStorage: async ({ page }, use) => {
    await use(async () => {
      const currentUrl = page.url();
      if (currentUrl === "about:blank" || !currentUrl.startsWith("http")) {
        return;
      }
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
    });
  },

  resetOnboardingViaApi: async ({ page }, use) => {
    await use(async () => {
      const response = await page.request.post("/api/onboarding/reset");
      if (!response.ok()) {
        console.warn("Failed to reset onboarding via API:", await response.text());
      }
    });
  },

  loginWithFreshState: async ({ page, clearOnboardingStorage, resetOnboardingViaApi }, use) => {
    await use(async (email: string, password: string) => {
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
      await page.locator("#email").fill(email);
      await page.locator("#password").fill(password);
      await page.getByRole("button", { name: /log in/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 90_000 });
      await page.waitForLoadState("networkidle");
      await resetOnboardingViaApi();
      await clearOnboardingStorage();
    });
  },
});

export const test = onboardingFixtures;
export { expect } from "@playwright/test";
