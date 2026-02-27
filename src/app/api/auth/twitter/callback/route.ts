/**
 * GET /api/auth/twitter/callback
 *
 * Handles the OAuth 2.0 callback from Twitter.
 * Exchanges the authorization code for tokens, fetches user info,
 * encrypts tokens, and stores the platform connection in DB.
 *
 * Redirects to /settings on success or /settings?error=... on failure.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const settingsUrl = `${url.origin}/dashboard/settings`;

  // 1. Extract query params
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle Twitter errors (user denied, etc.)
  if (error) {
    return NextResponse.redirect(
      `${settingsUrl}?error=twitter_auth_denied&detail=${encodeURIComponent(error)}`,
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${settingsUrl}?error=twitter_missing_params`,
    );
  }

  // 2. Verify state and get code_verifier from cookies
  const cookies = request.cookies;
  const storedState = cookies.get("twitter_oauth_state")?.value;
  const codeVerifier = cookies.get("twitter_code_verifier")?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      `${settingsUrl}?error=twitter_state_mismatch`,
    );
  }

  if (!codeVerifier) {
    return NextResponse.redirect(
      `${settingsUrl}?error=twitter_missing_verifier`,
    );
  }

  // 3. Lazy imports
  const { exchangeCodeForTokens, getTwitterUserInfo } = await import(
    "@/lib/platforms/twitter"
  );
  const { encrypt } = await import("@/lib/platforms/encryption");

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${settingsUrl}?error=twitter_not_configured`,
    );
  }

  const redirectUri = `${url.origin}/api/auth/twitter/callback`;

  try {
    // 4. Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier,
      clientId,
      clientSecret,
      redirectUri,
    });

    // 5. Fetch user info
    const userInfo = await getTwitterUserInfo(tokens.access_token);

    // 6. Encrypt tokens
    const accessTokenEncrypted = encrypt(tokens.access_token);
    const refreshTokenEncrypted = encrypt(tokens.refresh_token);
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // 7. Store in DB (lazy imports)
    const { db } = await import("@/server/db");
    const { platformConnections } = await import("@/server/db/schema");
    const { eq, and } = await import("drizzle-orm");

    // Get the authenticated user (from session/auth)
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${settingsUrl}?error=not_authenticated`);
    }

    // Upsert: update existing connection or create new one
    const existing = await db
      .select({ id: platformConnections.id })
      .from(platformConnections)
      .where(
        and(
          eq(platformConnections.userId, user.id),
          eq(platformConnections.platform, "twitter"),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(platformConnections)
        .set({
          accessTokenEncrypted,
          refreshTokenEncrypted,
          tokenExpiresAt,
          platformUserId: userInfo.id,
          platformUsername: userInfo.username,
          updatedAt: new Date(),
        })
        .where(eq(platformConnections.id, existing[0]!.id));
    } else {
      await db.insert(platformConnections).values({
        userId: user.id,
        platform: "twitter",
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiresAt,
        platformUserId: userInfo.id,
        platformUsername: userInfo.username,
      });
    }

    // 8. Clear cookies and redirect to settings
    const response = NextResponse.redirect(
      `${settingsUrl}?twitter=connected`,
    );

    response.cookies.delete("twitter_code_verifier");
    response.cookies.delete("twitter_oauth_state");

    return response;
  } catch (err) {
    console.error("Twitter OAuth callback error:", err);
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      `${settingsUrl}?error=twitter_callback_failed&detail=${encodeURIComponent(message)}`,
    );
  }
}
