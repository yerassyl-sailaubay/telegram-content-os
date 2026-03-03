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

async function getLinkedIn() {
  const linkedin = await import("@/lib/platforms/linkedin");
  return linkedin;
}

async function getEq() {
  const { eq, and } = await import("drizzle-orm");
  return { eq, and };
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
  const userId = cookieStore.get("linkedin_user_id")?.value;

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

  if (!userId) {
    return NextResponse.json(
      { error: "Missing user ID — please restart the connection flow" },
      { status: 400 },
    );
  }

  try {
    const linkedin = await getLinkedIn();

    // Step 1: Exchange code for tokens
    const tokens = await linkedin.exchangeCodeForTokens({
      code,
      redirectUri,
      clientId,
      clientSecret,
      codeVerifier,
    });

    // Step 2: Get user profile info
    const userInfo = await linkedin.getUserInfo(tokens.accessToken);

    // Step 3: Encrypt tokens
    const { encrypt } = await getEncryption();
    const accessTokenEncrypted = encrypt(tokens.accessToken);
    const refreshTokenEncrypted = encrypt(tokens.refreshToken);

    // Step 4: Upsert platform connection in DB
    const db = await getDb();
    const { platformConnections } = await getSchema();
    const { eq, and } = await getEq();

    // Check if connection already exists for this user + platform
    const existing = await db
      .select({ id: platformConnections.id })
      .from(platformConnections)
      .where(
        and(eq(platformConnections.userId, userId), eq(platformConnections.platform, "linkedin")),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing connection
      await db
        .update(platformConnections)
        .set({
          accessTokenEncrypted,
          refreshTokenEncrypted,
          tokenExpiresAt: tokens.expiresAt,
          platformUserId: userInfo.sub,
          platformUsername: userInfo.name,
          updatedAt: new Date(),
        })
        .where(eq(platformConnections.id, existing[0]!.id));
    } else {
      // Create new connection
      await db.insert(platformConnections).values({
        userId,
        platform: "linkedin",
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiresAt: tokens.expiresAt,
        platformUserId: userInfo.sub,
        platformUsername: userInfo.name,
        connectedAt: new Date(),
      });
    }

    // Step 5: Clear OAuth cookies and redirect to dashboard
    const dashboardUrl = new URL("/dashboard/settings", appUrl);
    dashboardUrl.searchParams.set("linkedin_connected", "true");
    const response = NextResponse.redirect(dashboardUrl.toString());

    response.cookies.delete("linkedin_code_verifier");
    response.cookies.delete("linkedin_oauth_state");
    response.cookies.delete("linkedin_user_id");

    return response;
  } catch (err) {
    console.error("LinkedIn OAuth callback error:", err);
    const dashboardUrl = new URL("/dashboard/settings", appUrl);
    dashboardUrl.searchParams.set("linkedin_error", "callback_failed");
    return NextResponse.redirect(dashboardUrl.toString());
  }
}
