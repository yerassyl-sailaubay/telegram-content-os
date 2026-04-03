/**
 * Left sidebar with category navigation and count badges.
 */

import type { CategoryResult } from "../../../src/types.js";
import { getScoreColor } from "../lib/format.js";

const CATEGORY_NAMES: Record<string, string> = {
  core: "Core SEO",
  technical: "Technical SEO",
  perf: "Performance",
  links: "Links",
  images: "Images",
  security: "Security",
  crawl: "Crawlability",
  schema: "Structured Data",
  a11y: "Accessibility",
  content: "Content",
  social: "Social",
  eeat: "E-E-A-T",
  url: "URL Structure",
  mobile: "Mobile",
  i18n: "Internationalization",
  legal: "Legal",
  js: "JS Rendering",
  redirect: "Redirects",
  htmlval: "HTML Validation",
  geo: "AI/GEO",
};

interface SidebarProps {
  categories: CategoryResult[];
  activeCategory?: string | null;
  onCategoryClick: (categoryId: string) => void;
}

export function Sidebar({ categories, activeCategory, onCategoryClick }: SidebarProps) {
  return (
    <aside className="fixed top-[var(--header-height)] bottom-0 left-0 w-[var(--sidebar-width)] overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3">
      <div
        className="mb-3 px-2 text-xs font-semibold tracking-wider uppercase"
        style={{ color: "var(--color-text-muted)" }}
      >
        Categories
      </div>
      <nav className="space-y-0.5">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.categoryId;
          const color = getScoreColor(cat.score);
          const issueCount = cat.failCount + cat.warnCount;
          return (
            <button
              key={cat.categoryId}
              onClick={() => onCategoryClick(cat.categoryId)}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-[var(--color-accent-light)] font-medium"
                  : "hover:bg-[var(--color-bg-hover)]"
              }`}
              style={{
                color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
              }}
            >
              <span className="truncate">{CATEGORY_NAMES[cat.categoryId] ?? cat.categoryId}</span>
              <div className="ml-2 flex shrink-0 items-center gap-2">
                {issueCount > 0 && (
                  <span
                    className="rounded-full px-1.5 text-xs font-medium"
                    style={{
                      color: cat.failCount > 0 ? "var(--color-fail)" : "var(--color-warn)",
                      backgroundColor:
                        cat.failCount > 0 ? "var(--color-fail-bg)" : "var(--color-warn-bg)",
                    }}
                  >
                    {issueCount}
                  </span>
                )}
                <span className="text-xs font-bold" style={{ color }}>
                  {Math.round(cat.score)}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
