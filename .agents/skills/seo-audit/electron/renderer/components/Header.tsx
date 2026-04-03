/**
 * Fixed header with logo, audited URL info, and theme toggle.
 * Left padding accounts for macOS traffic light buttons.
 */

import { useTheme } from "../hooks/useTheme.js";

interface HeaderProps {
  url?: string | null;
  crawledPages?: number;
  activeView: "audit" | "history";
  onViewChange: (view: "audit" | "history") => void;
}

export function Header({ url, crawledPages, activeView, onViewChange }: HeaderProps) {
  const { theme, toggle } = useTheme();

  return (
    <header
      className="drag-region fixed top-0 right-0 left-0 z-50 flex h-[var(--header-height)] items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] pr-5 pl-[var(--traffic-light-width)]"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      {/* Brand */}
      <div className="flex shrink-0 items-center gap-2.5">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
          style={{ background: "linear-gradient(135deg, var(--color-accent), #3b82f6)" }}
        >
          S
        </div>
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          SEOmator
        </span>
      </div>

      {/* Separator */}
      <div className="h-5 w-px shrink-0" style={{ backgroundColor: "var(--color-border)" }} />

      {/* Nav tabs */}
      <nav className="no-drag flex shrink-0 gap-1">
        <NavTab
          label="Audit"
          active={activeView === "audit"}
          onClick={() => onViewChange("audit")}
        />
        <NavTab
          label="History"
          active={activeView === "history"}
          onClick={() => onViewChange("history")}
        />
      </nav>

      {/* URL info */}
      <div className="no-drag flex min-w-0 flex-1 items-center gap-2.5">
        {url && (
          <>
            <span
              className="truncate text-xs"
              style={{ color: "var(--color-text-muted)" }}
              title={url}
            >
              {url}
            </span>
            {crawledPages != null && crawledPages > 1 && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: "var(--color-info-bg)",
                  color: "var(--color-info)",
                }}
              >
                {crawledPages} pages
              </span>
            )}
          </>
        )}
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="no-drag flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--color-bg-hover)]"
        title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        <span className="text-base">{theme === "light" ? "\u263E" : "\u2600"}</span>
      </button>
    </header>
  );
}

function NavTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-[var(--color-accent-light)]" : "hover:bg-[var(--color-bg-hover)]"
      }`}
      style={{
        color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
      }}
    >
      {label}
    </button>
  );
}
