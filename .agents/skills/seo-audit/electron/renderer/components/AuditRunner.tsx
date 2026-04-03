/**
 * Audit runner form with URL input, options, and Run/Cancel button.
 */

import { useState, type FormEvent } from "react";

interface AuditRunnerProps {
  isRunning: boolean;
  onRun: (url: string, options: { measureCwv: boolean; crawl: boolean; maxPages: number }) => void;
  onCancel: () => void;
}

export function AuditRunner({ isRunning, onRun, onCancel }: AuditRunnerProps) {
  const [url, setUrl] = useState("");
  const [measureCwv, setMeasureCwv] = useState(false);
  const [crawl, setCrawl] = useState(false);
  const [maxPages, setMaxPages] = useState(10);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    onRun(normalizedUrl, { measureCwv, crawl, maxPages });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* URL input */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to audit (e.g., example.com)"
            disabled={isRunning}
            className="w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-50"
            style={{ color: "var(--color-text)" }}
          />
        </div>
        {isRunning ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: "var(--color-fail)" }}
          >
            Cancel
          </button>
        ) : (
          <button
            type="submit"
            disabled={!url.trim()}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            Run Audit
          </button>
        )}
      </div>

      {/* Options */}
      <div className="flex items-center gap-4">
        <label
          className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            color: measureCwv ? "var(--color-accent)" : "var(--color-text-muted)",
            borderColor: measureCwv ? "var(--color-accent)" : "var(--color-border)",
            backgroundColor: measureCwv ? "var(--color-accent-light)" : "transparent",
          }}
        >
          <input
            type="checkbox"
            checked={measureCwv}
            onChange={(e) => setMeasureCwv(e.target.checked)}
            disabled={isRunning}
            className="sr-only"
          />
          Core Web Vitals
        </label>
        <label
          className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            color: crawl ? "var(--color-accent)" : "var(--color-text-muted)",
            borderColor: crawl ? "var(--color-accent)" : "var(--color-border)",
            backgroundColor: crawl ? "var(--color-accent-light)" : "transparent",
          }}
        >
          <input
            type="checkbox"
            checked={crawl}
            onChange={(e) => setCrawl(e.target.checked)}
            disabled={isRunning}
            className="sr-only"
          />
          Crawl site
        </label>
        {crawl && (
          <label
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Max pages:
            <input
              type="range"
              min={2}
              max={50}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              disabled={isRunning}
              className="w-24 accent-[var(--color-accent)]"
            />
            <span
              className="w-6 text-right font-mono text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              {maxPages}
            </span>
          </label>
        )}
      </div>
    </form>
  );
}
