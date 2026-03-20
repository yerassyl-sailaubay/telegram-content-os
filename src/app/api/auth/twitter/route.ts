/**
 * GET /api/auth/twitter
 *
 * Initiates the Twitter/X OAuth 2.0 PKCE flow.
 * Generates code_verifier + state, stores them in HTTP-only cookies,
 * and redirects the user to Twitter's authorization page.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Lazy imports to avoid build-time failures
  const { generateCodeVerifier, generateCodeChallenge, generateState, buildAuthorizationUrl } =
    await import("@/lib/platforms/twitter");

  const clientId = process.env.TWITTER_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Twitter OAuth is not configured" }, { status: 500 });
  }

  // Determine redirect URI from request origin
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/twitter/callback`;

  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Build the authorization URL
  const authUrl = buildAuthorizationUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge,
  });

  // Store code_verifier and state in HTTP-only cookies
  const response = NextResponse.redirect(authUrl);

  response.cookies.set("twitter_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  response.cookies.set("twitter_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
