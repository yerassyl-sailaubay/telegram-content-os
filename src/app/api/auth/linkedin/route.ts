/**
 * GET /api/auth/linkedin
 *
 * Initiates the LinkedIn OAuth 2.0 PKCE flow.
 *
 * 1. Generates a cryptographic code_verifier + code_challenge (S256)
 * 2. Stores code_verifier in an HTTP-only cookie
 * 3. Redirects the user to LinkedIn's authorization page
 *
 * Requires env vars: LINKEDIN_CLIENT_ID, NEXT_PUBLIC_APP_URL
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as crypto from "crypto";

// Lazy imports to avoid build-time failures
async function getLinkedIn() {
  const linkedin = await import("@/lib/platforms/linkedin");
  return linkedin;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "LINKEDIN_CLIENT_ID is not configured" },
      { status: 500 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL is not configured" },
      { status: 500 },
    );
  }

  const redirectUri = `${appUrl}/api/auth/linkedin/callback`;

  const linkedin = await getLinkedIn();

  // Generate PKCE values
  const codeVerifier = linkedin.generateCodeVerifier();
  const codeChallenge = await linkedin.generateCodeChallenge(codeVerifier);

  // Generate random state for CSRF protection
  const state = crypto.randomBytes(16).toString("hex");

  // Build the authorization URL
  const authUrl = linkedin.buildAuthorizationUrl({
    clientId,
    redirectUri,
    codeChallenge,
    state,
  });

  // Store code_verifier and state in HTTP-only cookies
  const response = NextResponse.redirect(authUrl);

  response.cookies.set("linkedin_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  response.cookies.set("linkedin_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  // Pass through userId if provided as query param (for linking account)
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  if (userId) {
    response.cookies.set("linkedin_user_id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
  }

  return response;
}
