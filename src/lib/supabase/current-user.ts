import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
};

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function readNameFromClaims(claims: Record<string, unknown>): string | null {
  const directName =
    toNonEmptyString(claims.full_name) ??
    toNonEmptyString(claims.name) ??
    toNonEmptyString(claims.display_name);

  if (directName) {
    return directName;
  }

  const userMetadata = claims.user_metadata;
  if (typeof userMetadata !== "object" || userMetadata === null) {
    return null;
  }

  const metadata = userMetadata as Record<string, unknown>;
  return (
    toNonEmptyString(metadata.full_name) ??
    toNonEmptyString(metadata.name) ??
    toNonEmptyString(metadata.display_name)
  );
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();

  // Prefer JWT claims because they are generally faster than getUser() calls.
  if (typeof supabase.auth.getClaims === "function") {
    try {
      const claimsResult = await supabase.auth.getClaims();
      const claimsRaw = claimsResult.data?.claims;

      if (claimsRaw && typeof claimsRaw === "object") {
        const claims = claimsRaw as Record<string, unknown>;
        const id = toNonEmptyString(claims.sub);

        if (id) {
          return {
            id,
            email: toNonEmptyString(claims.email),
            name: readNameFromClaims(claims),
          };
        }
      }
    } catch {
      // Fall back to getUser() when claims verification is unavailable.
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;

  return {
    id: user.id,
    email: user.email ?? null,
    name,
  };
}

export async function getCurrentUserId(): Promise<string> {
  return (await getCurrentUser()).id;
}
