/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session for self-service subscription management.
 * Requires authenticated user with an active Stripe subscription.
 */

import { NextRequest, NextResponse } from "next/server";

async function getSupabaseClient() {
  const { createClient } = await import("@/lib/supabase/server");
  return createClient();
}

async function getDb() {
  const { db } = await import("@/server/db");
  return db;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await getSupabaseClient();
    const [
      {
        data: { user },
      },
      db,
      { subscriptions },
      { eq },
    ] = await Promise.all([
      supabase.auth.getUser(),
      getDb(),
      import("@/server/db/schema"),
      import("drizzle-orm"),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const portalSessionPromise = import("@/lib/billing/portal");

    // Fetch subscription to get Stripe Customer ID
    const rows = await db
      .select({ stripeCustomerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    const subscription = rows[0];

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
    }

    const { createPortalSession } = await portalSessionPromise;

    const origin = request.nextUrl.origin;
    const session = await createPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${origin}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal session creation failed:", error);
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}
