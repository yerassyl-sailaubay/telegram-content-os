import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_AUTH_REDIRECT_PATH = "/dashboard";

function sanitizeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }

  try {
    const parsed = new URL(next, "https://local.invalid");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = sanitizeNextPath(searchParams.get("next"));
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

  if (code) {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // Ensure user exists in local database
      try {
        const existingUser = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        if (existingUser.length === 0) {
          await db.insert(users).values({
            id: user.id,
            email: user.email ?? "",
            name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? null,
            locale: "en",
          });
        }
      } catch (dbError) {
        console.error("[Auth Callback] Failed to create local user:", dbError);
        // Continue anyway - don't block auth flow
      }

      return NextResponse.redirect(new URL(nextPath, appBaseUrl));
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL("/login?error=Could+not+authenticate", appBaseUrl));
}
