export type AdminAccessMode = "restricted" | "open_dev";

function parseEmails(raw: string | undefined): string[] {
  if (!raw) return [];

  return Array.from(
    new Set(
      raw
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0),
    ),
  );
}

export function getConfiguredAdminEmails(): string[] {
  const fromList = parseEmails(process.env.ADMIN_EMAILS);
  if (fromList.length > 0) return fromList;

  return parseEmails(process.env.ADMIN_EMAIL);
}

export function getAdminAccessMode(): AdminAccessMode {
  const admins = getConfiguredAdminEmails();

  if (admins.length > 0) {
    return "restricted";
  }

  return process.env.NODE_ENV === "production" ? "restricted" : "open_dev";
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const normalized = email.toLowerCase();
  const admins = getConfiguredAdminEmails();

  if (admins.length > 0) {
    return admins.includes(normalized);
  }

  return process.env.NODE_ENV !== "production";
}
