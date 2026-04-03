/**
 * Table of past audits from the database.
 */

import type { AuditSummaryIpc } from "../../shared/ipc-types.js";
import { getScoreColor, formatDate } from "../lib/format.js";

interface AuditListProps {
  audits: AuditSummaryIpc[];
  loading: boolean;
  onAuditClick?: (auditId: string) => void;
}

export function AuditList({ audits, loading, onAuditClick }: AuditListProps) {
  if (loading) {
    return (
      <div className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
        Loading audits...
      </div>
    );
  }

  if (audits.length === 0) {
    return (
      <div className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
        No audits found. Run your first audit to see history here.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--color-bg-hover)]">
            <th
              className="p-3 text-left font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Date
            </th>
            <th
              className="p-3 text-left font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              URL
            </th>
            <th
              className="p-3 text-center font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Score
            </th>
            <th
              className="p-3 text-center font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Pages
            </th>
            <th
              className="p-3 text-center font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Results
            </th>
            <th className="w-10 p-3"></th>
          </tr>
        </thead>
        <tbody>
          {audits.map((audit) => {
            const scoreColor = getScoreColor(audit.overallScore);
            return (
              <tr
                key={audit.auditId}
                className="cursor-pointer border-t border-[var(--color-border-subtle)] transition-colors hover:bg-[var(--color-bg-hover)]"
                onClick={() => onAuditClick?.(audit.auditId)}
              >
                <td className="p-3" style={{ color: "var(--color-text-secondary)" }}>
                  {formatDate(audit.startedAt)}
                </td>
                <td className="max-w-xs truncate p-3" style={{ color: "var(--color-text)" }}>
                  {audit.startUrl}
                </td>
                <td className="p-3 text-center">
                  <span
                    className="rounded-full px-2 py-0.5 text-sm font-bold"
                    style={{ color: scoreColor, backgroundColor: `${scoreColor}15` }}
                  >
                    {Math.round(audit.overallScore)}
                  </span>
                </td>
                <td className="p-3 text-center" style={{ color: "var(--color-text-muted)" }}>
                  {audit.pagesAudited}
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {audit.failedCount > 0 && (
                      <span className="text-xs" style={{ color: "var(--color-fail)" }}>
                        {audit.failedCount}F
                      </span>
                    )}
                    {audit.warningCount > 0 && (
                      <span className="text-xs" style={{ color: "var(--color-warn)" }}>
                        {audit.warningCount}W
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "var(--color-pass)" }}>
                      {audit.passedCount}P
                    </span>
                  </div>
                </td>
                <td className="p-3 text-center" style={{ color: "var(--color-text-muted)" }}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
