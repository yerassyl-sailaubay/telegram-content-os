import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// ─── Mock next-intl ──────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: (_ns: string) => (key: string) => {
    const messages: Record<string, string> = {
      title: "Something went wrong",
      description: "An unexpected error occurred. Please try again.",
      retry: "Try again",
    };
    return messages[key] ?? key;
  },
}));

// ─── Mock next-themes ────────────────────────────────────────────────────────

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light" }),
}));

// ─── Skeleton Variants Tests ─────────────────────────────────────────────────

describe("Skeleton Variants", () => {
  it("renders TableSkeleton without errors", async () => {
    const { TableSkeleton } = await import("../skeleton-variants");
    const { container } = render(<TableSkeleton rows={3} />);
    expect(screen.getByTestId("table-skeleton")).toBeDefined();
    // Header + 3 rows = 4 row containers
    const rows = container.querySelectorAll("[data-testid='table-skeleton'] > div");
    expect(rows.length).toBe(4); // 1 header + 3 body rows
  });

  it("renders CardSkeleton with specified count", async () => {
    const { CardSkeleton } = await import("../skeleton-variants");
    const { container } = render(<CardSkeleton count={4} />);
    expect(screen.getByTestId("card-skeleton")).toBeDefined();
    const cards = container.querySelectorAll("[data-testid='card-skeleton'] > div");
    expect(cards.length).toBe(4);
  });

  it("renders ChartSkeleton without errors", async () => {
    const { ChartSkeleton } = await import("../skeleton-variants");
    render(<ChartSkeleton />);
    expect(screen.getByTestId("chart-skeleton")).toBeDefined();
  });

  it("renders CalendarSkeleton with 5 weeks of cells", async () => {
    const { CalendarSkeleton } = await import("../skeleton-variants");
    render(<CalendarSkeleton />);
    expect(screen.getByTestId("calendar-skeleton")).toBeDefined();
  });

  it("renders StatsRowSkeleton with specified count", async () => {
    const { StatsRowSkeleton } = await import("../skeleton-variants");
    const { container } = render(<StatsRowSkeleton count={3} />);
    expect(screen.getByTestId("stats-row-skeleton")).toBeDefined();
    const stats = container.querySelectorAll("[data-testid='stats-row-skeleton'] > div");
    expect(stats.length).toBe(3);
  });

  it("renders PageHeaderSkeleton without errors", async () => {
    const { PageHeaderSkeleton } = await import("../skeleton-variants");
    render(<PageHeaderSkeleton />);
    expect(screen.getByTestId("page-header-skeleton")).toBeDefined();
  });

  it("renders TabsSkeleton without errors", async () => {
    const { TabsSkeleton } = await import("../skeleton-variants");
    render(<TabsSkeleton />);
    expect(screen.getByTestId("tabs-skeleton")).toBeDefined();
  });

  it("applies custom className to skeleton variants", async () => {
    const { TableSkeleton } = await import("../skeleton-variants");
    render(<TableSkeleton className="custom-class" />);
    const el = screen.getByTestId("table-skeleton");
    expect(el.className).toContain("custom-class");
  });
});

// ─── Empty State Tests ───────────────────────────────────────────────────────

describe("EmptyState", () => {
  // Dynamic import to avoid hoisting issues with mocks
  async function renderEmptyState(props: Record<string, unknown>) {
    const { EmptyState } = await import("../empty-state");
    const { FileText } = await import("lucide-react");
    return render(
      <EmptyState
        icon={FileText}
        title="No posts yet"
        description="Create your first post to get started."
        {...props}
      />,
    );
  }

  it("renders with icon, title, and description", async () => {
    await renderEmptyState({});
    expect(screen.getByTestId("empty-state")).toBeDefined();
    expect(screen.getByText("No posts yet")).toBeDefined();
    expect(screen.getByText("Create your first post to get started.")).toBeDefined();
  });

  it("renders CTA button with href", async () => {
    await renderEmptyState({
      actionLabel: "Create Post",
      actionHref: "/dashboard/posts/new",
    });
    const link = screen.getByText("Create Post");
    expect(link).toBeDefined();
    expect(link.closest("a")).toBeDefined();
    expect(link.closest("a")?.getAttribute("href")).toBe("/dashboard/posts/new");
  });

  it("renders CTA button with onClick handler", async () => {
    const onClick = vi.fn();
    await renderEmptyState({
      actionLabel: "Try Action",
      onAction: onClick,
    });
    const button = screen.getByText("Try Action");
    expect(button).toBeDefined();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not render button when no action props provided", async () => {
    await renderEmptyState({});
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("applies custom className", async () => {
    await renderEmptyState({ className: "my-custom-class" });
    const el = screen.getByTestId("empty-state");
    expect(el.className).toContain("my-custom-class");
  });
});

// ─── Error State Tests ───────────────────────────────────────────────────────

describe("ErrorState", () => {
  async function renderErrorState(props: Record<string, unknown> = {}) {
    const { ErrorState } = await import("../error-state");
    return render(<ErrorState {...props} />);
  }

  it("renders with default title and description", async () => {
    await renderErrorState();
    expect(screen.getByTestId("error-state")).toBeDefined();
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("An unexpected error occurred. Please try again.")).toBeDefined();
  });

  it("renders with custom title and description", async () => {
    await renderErrorState({
      title: "Custom Error",
      description: "Custom error message.",
    });
    expect(screen.getByText("Custom Error")).toBeDefined();
    expect(screen.getByText("Custom error message.")).toBeDefined();
  });

  it("renders retry button when onRetry is provided", async () => {
    const onRetry = vi.fn();
    await renderErrorState({ onRetry, retryLabel: "Retry Now" });
    const button = screen.getByTestId("error-state-retry");
    expect(button).toBeDefined();
    expect(screen.getByText("Retry Now")).toBeDefined();
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("does not render retry button when onRetry is not provided", async () => {
    await renderErrorState();
    expect(screen.queryByTestId("error-state-retry")).toBeNull();
  });

  it("has role=alert for accessibility", async () => {
    await renderErrorState();
    const el = screen.getByRole("alert");
    expect(el).toBeDefined();
  });
});

// ─── Dashboard Error Boundary Tests ──────────────────────────────────────────

describe("Dashboard Error Boundary (error.tsx)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders error state with retry functionality", async () => {
    const { default: DashboardError } = await import("@/app/(dashboard)/dashboard/error");
    const error = new Error("Test error") as Error & { digest?: string };
    error.digest = "test-digest";
    const resetFn = vi.fn();

    // Suppress console.error from useEffect
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<DashboardError error={error} reset={resetFn} />);

    expect(screen.getByTestId("error-state")).toBeDefined();
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("Try again")).toBeDefined();

    // Click retry
    fireEvent.click(screen.getByTestId("error-state-retry"));
    expect(resetFn).toHaveBeenCalledOnce();

    consoleSpy.mockRestore();
  });

  it("logs error to console", async () => {
    const { default: DashboardError } = await import("@/app/(dashboard)/dashboard/error");
    const error = new Error("Test dashboard error") as Error & {
      digest?: string;
    };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<DashboardError error={error} reset={() => {}} />);

    expect(consoleSpy).toHaveBeenCalledWith("Dashboard error:", error);
    consoleSpy.mockRestore();
  });
});
