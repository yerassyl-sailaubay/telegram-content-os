import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OnboardingWizard } from "../onboarding-wizard";

const { mockDismissWizard, mockAdvanceWizard, mockCompleteWizard, mockUseOnboarding } = vi.hoisted(
  () => {
    const dismissWizard = vi.fn().mockResolvedValue(undefined);
    const advanceWizard = vi.fn();
    const completeWizard = vi.fn().mockResolvedValue(undefined);

    return {
      mockDismissWizard: dismissWizard,
      mockAdvanceWizard: advanceWizard,
      mockCompleteWizard: completeWizard,
      mockUseOnboarding: vi.fn().mockReturnValue({
        isWizardOpen: true,
        currentStep: 1,
        isWizardDismissed: false,
        dismissWizard,
        advanceWizard,
        completeWizard,
        isLoading: false,
        error: null,
      }),
    };
  },
);

vi.mock("@/hooks/use-onboarding", () => ({
  useOnboarding: mockUseOnboarding,
}));

vi.mock("@/components/channels/connect-channel-wizard", () => ({
  ConnectChannelWizard: ({ botUsername }: { botUsername: string }) => (
    <div data-testid="connect-channel-wizard">ConnectChannelWizard: {botUsername}</div>
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string | number>) => {
    const messages: Record<string, string> = {
      wizardTitle: "Welcome to Teleflow",
      wizardSubtitle: "Let's get you set up",
      stepOf: params ? `Step ${params.step} of ${params.total}` : "Step 1 of 3",
      stepIndicator: params ? `Go to step ${params.step}` : "Go to step",
      getStarted: "Get Started",
      exploreFirst: "Explore first",
      skipForNow: "Skip for now",
      startCreating: "Start Creating",
      welcomeTitle: "Welcome to Teleflow",
      welcomeDescription: "The AI content co-pilot",
      step1Preview: "Connect your Telegram channel",
      step2Preview: "AI learns your unique voice",
      step3Preview: "Generate your first AI draft",
      connectChannelTitle: "Connect Your Channel",
      connectChannelDescription: "Link your Telegram channel",
      connectChannelHelp: "Add the bot as an admin",
      aiPreviewTitle: "AI-Powered Content",
      aiPreviewDescription: "Once connected, Teleflow analyzes",
      aiDraftLabel: "AI Draft Preview",
      aiDraftExample1: "Example draft content 1",
      aiDraftExample2: "Example draft content 2",
    };
    return messages[key] ?? key;
  },
}));

vi.mock("next-intl/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(" "),
}));

describe("OnboardingWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOnboarding.mockReturnValue({
      isWizardOpen: true,
      currentStep: 1,
      isWizardDismissed: false,
      dismissWizard: mockDismissWizard,
      advanceWizard: mockAdvanceWizard,
      completeWizard: mockCompleteWizard,
      isLoading: false,
      error: null,
    });
  });

  describe("rendering", () => {
    it("renders the wizard when isWizardOpen is true", () => {
      render(<OnboardingWizard botUsername="testbot" />);

      expect(screen.getByText("Let's get you set up")).toBeTruthy();
      expect(screen.getByText("Step 1 of 3")).toBeTruthy();
    });

    it("renders progress indicator with 3 steps", () => {
      render(<OnboardingWizard botUsername="testbot" />);

      const progressButtons = screen
        .getAllByRole("button")
        .filter((el) => el.getAttribute("aria-label")?.includes("Go to step"));
      expect(progressButtons.length).toBe(3);
    });

    it("does not render when wizard is dismissed and not open", () => {
      mockUseOnboarding.mockReturnValue({
        isWizardOpen: false,
        currentStep: 1,
        isWizardDismissed: true,
        dismissWizard: mockDismissWizard,
        advanceWizard: mockAdvanceWizard,
        completeWizard: mockCompleteWizard,
        isLoading: false,
        error: null,
      });

      const { container } = render(<OnboardingWizard botUsername="testbot" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Step 1: Welcome", () => {
    it("renders welcome step with correct content", () => {
      render(<OnboardingWizard botUsername="testbot" />);

      expect(screen.getByText("The AI content co-pilot")).toBeTruthy();
      expect(screen.getByText("Connect your Telegram channel")).toBeTruthy();
      expect(screen.getByText("AI learns your unique voice")).toBeTruthy();
      expect(screen.getByText("Generate your first AI draft")).toBeTruthy();
    });

    it("has Get Started button that advances to step 2", () => {
      render(<OnboardingWizard botUsername="testbot" />);

      const getStartedButton = screen.getByText("Get Started");
      expect(getStartedButton).toBeTruthy();

      fireEvent.click(getStartedButton);
      expect(mockAdvanceWizard).toHaveBeenCalledWith(2);
    });

    it("has Explore first button that dismisses wizard", async () => {
      render(<OnboardingWizard botUsername="testbot" />);

      const exploreButton = screen.getByText("Explore first");
      expect(exploreButton).toBeTruthy();

      fireEvent.click(exploreButton);
      await waitFor(() => {
        expect(mockDismissWizard).toHaveBeenCalled();
      });
    });
  });

  describe("Step 2: Channel Connection", () => {
    beforeEach(() => {
      mockUseOnboarding.mockReturnValue({
        isWizardOpen: true,
        currentStep: 2,
        isWizardDismissed: false,
        dismissWizard: mockDismissWizard,
        advanceWizard: mockAdvanceWizard,
        completeWizard: mockCompleteWizard,
        isLoading: false,
        error: null,
      });
    });

    it("renders channel connection step", () => {
      render(<OnboardingWizard botUsername="testbot" />);

      expect(screen.getByText("Connect Your Channel")).toBeTruthy();
      expect(screen.getByText("Link your Telegram channel")).toBeTruthy();
      expect(screen.getByText("Add the bot as an admin")).toBeTruthy();
    });

    it("embeds ConnectChannelWizard component", () => {
      render(<OnboardingWizard botUsername="testbot" />);

      expect(screen.getByTestId("connect-channel-wizard")).toBeTruthy();
      expect(screen.getByText("ConnectChannelWizard: testbot")).toBeTruthy();
    });

    it("has Back button to return to step 1", () => {
      render(<OnboardingWizard botUsername="testbot" />);

      const backButton = screen.getByRole("button", { name: /back/i });
      fireEvent.click(backButton);

      expect(mockAdvanceWizard).toHaveBeenCalledWith(1);
    });

    it("has Skip button that dismisses wizard", async () => {
      render(<OnboardingWizard botUsername="testbot" />);

      const skipButton = screen.getByText("Skip for now");
      fireEvent.click(skipButton);

      await waitFor(() => {
        expect(mockDismissWizard).toHaveBeenCalled();
      });
    });
  });

  describe("Step 3: AI Preview", () => {
    beforeEach(() => {
      mockUseOnboarding.mockReturnValue({
        isWizardOpen: true,
        currentStep: 3,
        isWizardDismissed: false,
        dismissWizard: mockDismissWizard,
        advanceWizard: mockAdvanceWizard,
        completeWizard: mockCompleteWizard,
        isLoading: false,
        error: null,
      });
    });

    it("renders AI preview step", () => {
      render(<OnboardingWizard botUsername="testbot" />);

      expect(screen.getByText("AI-Powered Content")).toBeTruthy();
      expect(screen.getByText("Once connected, Teleflow analyzes")).toBeTruthy();
    });

    it("shows AI draft preview cards", () => {
      render(<OnboardingWizard botUsername="testbot" />);

      const draftLabels = screen.getAllByText("AI Draft Preview");
      expect(draftLabels.length).toBe(2);
      expect(screen.getByText("Example draft content 1")).toBeTruthy();
      expect(screen.getByText("Example draft content 2")).toBeTruthy();
    });

    it("has Start Creating button that completes wizard", async () => {
      render(<OnboardingWizard botUsername="testbot" />);

      const startButton = screen.getByText("Start Creating");
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockCompleteWizard).toHaveBeenCalled();
      });
    });

    it("has Back button to return to step 2", () => {
      render(<OnboardingWizard botUsername="testbot" />);

      const backButton = screen.getByRole("button", { name: /back/i });
      fireEvent.click(backButton);

      expect(mockAdvanceWizard).toHaveBeenCalledWith(2);
    });
  });

  describe("progress indicator", () => {
    it("allows navigation to completed steps", () => {
      mockUseOnboarding.mockReturnValue({
        isWizardOpen: true,
        currentStep: 3,
        isWizardDismissed: false,
        dismissWizard: mockDismissWizard,
        advanceWizard: mockAdvanceWizard,
        completeWizard: mockCompleteWizard,
        isLoading: false,
        error: null,
      });

      render(<OnboardingWizard botUsername="testbot" />);

      const progressButtons = screen
        .getAllByRole("button")
        .filter((el) => el.getAttribute("aria-label")?.includes("Go to step"));

      fireEvent.click(progressButtons[0]);
      expect(mockAdvanceWizard).toHaveBeenCalledWith(1);

      fireEvent.click(progressButtons[1]);
      expect(mockAdvanceWizard).toHaveBeenCalledWith(2);
    });

    it("disables navigation to future steps", () => {
      mockUseOnboarding.mockReturnValue({
        isWizardOpen: true,
        currentStep: 1,
        isWizardDismissed: false,
        dismissWizard: mockDismissWizard,
        advanceWizard: mockAdvanceWizard,
        completeWizard: mockCompleteWizard,
        isLoading: false,
        error: null,
      });

      render(<OnboardingWizard botUsername="testbot" />);

      const progressButtons = screen
        .getAllByRole("button")
        .filter((el) => el.getAttribute("aria-label")?.includes("Go to step"));

      expect(progressButtons[2]).toBeDisabled();
    });
  });

  describe("close button", () => {
    it("closes wizard when X button is clicked", async () => {
      render(<OnboardingWizard botUsername="testbot" />);

      const closeButton = screen.getByLabelText("cancel");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(mockDismissWizard).toHaveBeenCalled();
      });
    });
  });
});
