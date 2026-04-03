/**
 * Dropdown for selecting an audited domain from history.
 */

interface DomainPickerProps {
  domains: string[];
  selected: string | null;
  onChange: (domain: string | null) => void;
}

export function DomainPicker({ domains, selected, onChange }: DomainPickerProps) {
  return (
    <select
      value={selected ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
      style={{ color: "var(--color-text)" }}
    >
      <option value="">All domains</option>
      {domains.map((domain) => (
        <option key={domain} value={domain}>
          {domain}
        </option>
      ))}
    </select>
  );
}
