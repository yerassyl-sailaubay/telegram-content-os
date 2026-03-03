import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  console.log("[Auth Callback] Code:", code ? "present" : "missing");
  console.log("[Auth Callback] Next:", next);
  console.log("[Auth Callback] Origin:", origin);

  if (code) {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[Auth Callback] Exchange error:", error?.message || "none");
    console.log("[Auth Callback] User:", user ? "present" : "missing");

    if (!error && user) {
      // Ensure user exists in local database
      try {
        const existingUser = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        if (existingUser.length === 0) {
          console.log("[Auth Callback] Creating local user record for:", user.id);
          await db.insert(users).values({
            id: user.id,
            email: user.email ?? "",
            name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? null,
            locale: "en",
          });
          console.log("[Auth Callback] Local user created");
        }
      } catch (dbError) {
        console.error("[Auth Callback] Failed to create local user:", dbError);
        // Continue anyway - don't block auth flow
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      console.log("[Auth Callback] Redirecting to:", `${origin}${next}`);

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}
