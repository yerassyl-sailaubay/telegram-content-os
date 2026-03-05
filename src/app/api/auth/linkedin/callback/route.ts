/**
 * GET /api/auth/linkedin/callback
 *
 * Handles the LinkedIn OAuth 2.0 callback after user authorization.
 *
 * 1. Validates state parameter against cookie (CSRF protection)
 * 2. Exchanges authorization code for tokens using PKCE code_verifier
 * 3. Fetches LinkedIn user profile info
 * 4. Encrypts tokens and stores in platform_connections table
 * 5. Redirects to dashboard with success/error status
 *
 * Requires env vars: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET,
 *                    NEXT_PUBLIC_APP_URL, ENCRYPTION_KEY
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Lazy imports — avoid eager DB connection at build time
// ---------------------------------------------------------------------------

async function getDb() {
  const { db } = await import("@/server/db");
  return db;
}

async function getSchema() {
  const schema = await import("@/server/db/schema");
  return schema;
}

async function getSupabaseClient() {
  const { createClient } = await import("@/lib/supabase/server");
  return createClient();
}

async function getLinkedIn() {
  const linkedin = await import("@/lib/platforms/linkedin");
  return linkedin;
}

async function getEncryption() {
  const { encrypt } = await import("@/lib/platforms/encryption");
  return { encrypt };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL is not configured" }, { status: 500 });
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "LinkedIn OAuth credentials are not configured" },
      { status: 500 },
    );
  }

  const redirectUri = `${appUrl}/api/auth/linkedin/callback`;

  // Parse query params
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Handle user denial or LinkedIn error
  if (error) {
    console.error(`LinkedIn OAuth error: ${error} — ${errorDescription}`);
    const dashboardUrl = new URL("/dashboard/settings", appUrl);
    dashboardUrl.searchParams.set("linkedin_error", error);
    return NextResponse.redirect(dashboardUrl.toString());
  }

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state parameter" }, { status: 400 });
  }

  // Validate state against cookie (CSRF protection)
  const cookieStore = await request.cookies;
  const storedState = cookieStore.get("linkedin_oauth_state")?.value;
  const codeVerifier = cookieStore.get("linkedin_code_verifier")?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.json(
      { error: "Invalid state parameter — possible CSRF attack" },
      { status: 403 },
    );
  }

  if (!codeVerifier) {
    return NextResponse.json(
      { error: "Missing code_verifier — OAuth flow may have expired" },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const dashboardUrl = new URL("/dashboard/settings", appUrl);
    dashboardUrl.searchParams.set("linkedin_error", "not_authenticated");
    return NextResponse.redirect(dashboardUrl.toString());
  }

  try {
    const linkedinPromise = getLinkedIn();
    const encryptionPromise = getEncryption();
    const dbPromise = getDb();
    const schemaPromise = getSchema();
    const linkedin = await linkedinPromise;

    // Step 1: Exchange code for tokens
    const tokens = await linkedin.exchangeCodeForTokens({
      code,
      redirectUri,
      clientId,
      clientSecret,
      codeVerifier,
    });

    // Step 2: Get user profile info
    const [userInfo, { encrypt }, db, { platformConnections }] = await Promise.all([
      linkedin.getUserInfo(tokens.accessToken),
      encryptionPromise,
      dbPromise,
      schemaPromise,
    ]);

    // Step 3: Encrypt tokens
    const accessTokenEncrypted = encrypt(tokens.accessToken);
    const refreshTokenEncrypted = encrypt(tokens.refreshToken);

    // Step 4: Upsert platform connection in DB (atomic)
    await db
      .insert(platformConnections)
      .values({
        userId: user.id,
        platform: "linkedin",
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiresAt: tokens.expiresAt,
        platformUserId: userInfo.sub,
        platformUsername: userInfo.name,
        connectedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [platformConnections.userId, platformConnections.platform],
        set: {
          accessTokenEncrypted,
          refreshTokenEncrypted,
          tokenExpiresAt: tokens.expiresAt,
          platformUserId: userInfo.sub,
          platformUsername: userInfo.name,
          updatedAt: new Date(),
        },
      });

    // Step 5: Clear OAuth cookies and redirect to dashboard
    const dashboardUrl = new URL("/dashboard/settings", appUrl);
    dashboardUrl.searchParams.set("linkedin_connected", "true");
    const response = NextResponse.redirect(dashboardUrl.toString());

    response.cookies.delete("linkedin_code_verifier");
    response.cookies.delete("linkedin_oauth_state");

    return response;
  } catch (err) {
    console.error("LinkedIn OAuth callback error:", err);
    const dashboardUrl = new URL("/dashboard/settings", appUrl);
    dashboardUrl.searchParams.set("linkedin_error", "callback_failed");
    return NextResponse.redirect(dashboardUrl.toString());
  }
}
