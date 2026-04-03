// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOnboarding } from "../use-onboarding";

const STORAGE_KEY = "onboarding-wizard-state";

function createMockResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers(),
    redirected: false,
    type: "basic",
    url: "",
    clone: () => createMockResponse(data),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    text: async () => JSON.stringify(data),
    json: async () => data,
  } as Response;
}

function createLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };
}

describe("useOnboarding", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
    fetchMock = vi.fn();
    global.fetch = fetchMock as typeof global.fetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("returns initial wizard state", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            wizardCompleted: false,
            wizardStepReached: 0,
            dismissedAt: null,
            toursCompleted: [],
            checklist: [],
          },
        }),
      });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isWizardOpen).toBe(false);
      expect(result.current.currentStep).toBe(0);
      expect(result.current.isWizardDismissed).toBe(false);
      expect(result.current.checklist).toEqual([]);
      expect(result.current.toursCompleted).toEqual([]);
    });

    it("loads wizard state from localStorage", async () => {
      localStorageMock.setItem(
        STORAGE_KEY,
        JSON.stringify({
          isOpen: true,
          currentStep: 2,
          dismissed: false,
        }),
      );

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            wizardCompleted: false,
            wizardStepReached: 0,
            dismissedAt: null,
            toursCompleted: [],
            checklist: [],
          },
        }),
      });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isWizardOpen).toBe(true);
      expect(result.current.currentStep).toBe(2);
    });

    it("loads dismissed state from DB", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            wizardCompleted: false,
            wizardStepReached: 0,
            dismissedAt: "2026-01-01T00:00:00Z",
            toursCompleted: [],
            checklist: [],
          },
        }),
      });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isWizardDismissed).toBe(true);
    });
  });

  describe("startWizard", () => {
    it("opens wizard at step 1", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            wizardCompleted: false,
            wizardStepReached: 0,
            dismissedAt: null,
            toursCompleted: [],
            checklist: [],
          },
        }),
      });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.startWizard();
      });

      expect(result.current.isWizardOpen).toBe(true);
      expect(result.current.currentStep).toBe(1);
    });

    it("persists to localStorage", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            wizardCompleted: false,
            wizardStepReached: 0,
            dismissedAt: null,
            toursCompleted: [],
            checklist: [],
          },
        }),
      });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.startWizard();
      });

      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY) || "{}");
      expect(stored.isOpen).toBe(true);
      expect(stored.currentStep).toBe(1);
    });
  });

  describe("advanceWizard", () => {
    it("updates current step", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            wizardCompleted: false,
            wizardStepReached: 0,
            dismissedAt: null,
            toursCompleted: [],
            checklist: [],
          },
        }),
      });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.startWizard();
      });

      act(() => {
        result.current.advanceWizard(3);
      });

      expect(result.current.currentStep).toBe(3);
    });

    it("persists step to localStorage", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            wizardCompleted: false,
            wizardStepReached: 0,
            dismissedAt: null,
            toursCompleted: [],
            checklist: [],
          },
        }),
      });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.advanceWizard(5);
      });

      const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY) || "{}");
      expect(stored.currentStep).toBe(5);
    });
  });

  describe("completeWizard", () => {
    it("closes wizard and calls API", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              wizardCompleted: false,
              wizardStepReached: 0,
              dismissedAt: null,
              toursCompleted: [],
              checklist: [],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.startWizard();
      });

      await act(async () => {
        await result.current.completeWizard();
      });

      expect(result.current.isWizardOpen).toBe(false);
      expect(result.current.currentStep).toBe(999);
      expect(fetchMock).toHaveBeenCalledWith("/api/onboarding/complete", { method: "POST" });
    });
  });

  describe("dismissWizard", () => {
    it("dismisses wizard and calls API", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              wizardCompleted: false,
              wizardStepReached: 0,
              dismissedAt: null,
              toursCompleted: [],
              checklist: [],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.dismissWizard();
      });

      expect(result.current.isWizardDismissed).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith("/api/onboarding/dismiss", { method: "POST" });
    });
  });

  describe("getChecklistStatus", () => {
    it("returns checklist from DB data", async () => {
      const mockChecklist = [
        { id: "item-1", label: "Item 1", completed: true },
        { id: "item-2", label: "Item 2", completed: false },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            wizardCompleted: false,
            wizardStepReached: 0,
            dismissedAt: null,
            toursCompleted: [],
            checklist: mockChecklist,
          },
        }),
      });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.getChecklistStatus()).toEqual(mockChecklist);
      expect(result.current.completedChecklistCount).toBe(1);
      expect(result.current.totalChecklistCount).toBe(2);
    });
  });

  describe("markTourCompleted", () => {
    it("calls API to mark tour completed", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              wizardCompleted: false,
              wizardStepReached: 0,
              dismissedAt: null,
              toursCompleted: [],
              checklist: [],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.markTourCompleted("dashboard-tour");
      });

      expect(fetchMock).toHaveBeenCalledWith("/api/onboarding/tour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourId: "dashboard-tour" }),
      });
    });

    it("returns true for completed tour", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            wizardCompleted: false,
            wizardStepReached: 0,
            dismissedAt: null,
            toursCompleted: ["sidebar-tour", "header-tour"],
            checklist: [],
          },
        }),
      });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isTourCompleted("sidebar-tour")).toBe(true);
      expect(result.current.isTourCompleted("header-tour")).toBe(true);
      expect(result.current.isTourCompleted("unknown-tour")).toBe(false);
    });
  });

  describe("resetOnboarding", () => {
    it("clears localStorage and resets state", async () => {
      localStorageMock.setItem(
        STORAGE_KEY,
        JSON.stringify({
          isOpen: true,
          currentStep: 5,
          dismissed: true,
        }),
      );

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              wizardCompleted: true,
              wizardStepReached: 999,
              dismissedAt: "2026-01-01T00:00:00Z",
              toursCompleted: ["tour-1"],
              checklist: [{ id: "1", label: "Item", completed: true }],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              wizardCompleted: false,
              wizardStepReached: 0,
              dismissedAt: null,
              toursCompleted: [],
              checklist: [],
            },
          }),
        });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.resetOnboarding();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
      expect(result.current.isWizardOpen).toBe(false);
      expect(result.current.currentStep).toBe(0);
      expect(fetchMock).toHaveBeenCalledWith("/api/onboarding/reset", { method: "POST" });
    });
  });

  describe("error handling", () => {
    it("sets error when fetch fails", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe("Network error");
    });

    it("sets error when API returns error", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: "Failed to load data",
        }),
      });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe("Failed to load data");
    });
  });

  describe("refresh", () => {
    it("refetches DB data", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              wizardCompleted: false,
              wizardStepReached: 0,
              dismissedAt: null,
              toursCompleted: [],
              checklist: [],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              wizardCompleted: true,
              wizardStepReached: 999,
              dismissedAt: null,
              toursCompleted: ["new-tour"],
              checklist: [{ id: "1", label: "Item", completed: true }],
            },
          }),
        });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.toursCompleted).toContain("new-tour");
    });
  });

  describe("Wizard state persistence across remounts", () => {
    it("remembers wizard step after unmount and remount", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            wizardCompleted: false,
            wizardStepReached: 0,
            dismissedAt: null,
            toursCompleted: [],
            checklist: [],
          },
        }),
      });

      const { result, unmount } = renderHook(() => useOnboarding());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.startWizard();
      });

      act(() => {
        result.current.advanceWizard(2);
      });

      expect(result.current.currentStep).toBe(2);

      unmount();

      const { result: newResult } = renderHook(() => useOnboarding());

      await waitFor(() => expect(newResult.current.isLoading).toBe(false));

      expect(newResult.current.isWizardOpen).toBe(true);
      expect(newResult.current.currentStep).toBe(2);
    });
  });
});
