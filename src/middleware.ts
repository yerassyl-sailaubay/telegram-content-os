import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

// Create the next-intl middleware handler
const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip i18n for auth callback (API-like route)
  if (pathname.startsWith("/auth/callback")) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Run i18n middleware first to handle locale detection and routing
  const intlResponse = intlMiddleware(request);

  // After i18n middleware, resolve the effective pathname (without locale prefix)
  // to check auth rules
  const localePattern = /^\/(en|ru)(\/|$)/;
  const match = pathname.match(localePattern);
  const pathWithoutLocale = match ? pathname.replace(localePattern, "/") : pathname;
  const effectivePath = pathWithoutLocale === "" ? "/" : pathWithoutLocale;

  // For auth-protected routes, run Supabase session check.
  // Locale roots (/, /ru, /en) stay public to serve the landing page.
  const needsAuthCheck =
    effectivePath.startsWith("/dashboard") ||
    effectivePath === "/login" ||
    effectivePath === "/signup";

  if (needsAuthCheck) {
    // If intl middleware wants to redirect (e.g., adding locale prefix), do that first
    if (intlResponse.status === 307 || intlResponse.status === 308) {
      return intlResponse;
    }

    const { user, supabaseResponse } = await updateSession(request);

    // Copy any cookies set by intl middleware to supabase response
    intlResponse.headers.forEach((value, key) => {
      supabaseResponse.headers.set(key, value);
    });

    // Redirect unauthenticated users away from protected routes
    if (!user && effectivePath.startsWith("/dashboard")) {
      const locale = match?.[1] || routing.defaultLocale;
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      return NextResponse.redirect(url);
    }

    // Redirect authenticated users away from auth pages
    if (user && (effectivePath === "/login" || effectivePath === "/signup")) {
      const locale = match?.[1] || routing.defaultLocale;
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/dashboard`;
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  return intlResponse;
}

export const config = {
  // Match all pathnames except for:
  // - /api (API routes)
  // - /_next (Next.js internals)
  // - /_vercel (Vercel internals)
  // - files with extensions (e.g. favicon.ico, images)
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
