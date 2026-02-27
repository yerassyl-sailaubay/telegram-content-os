/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout Session for subscription upgrade.
 * Requires authenticated user. Body: { priceId: string }
 */

import { NextRequest, NextResponse } from "next/server";

async function getSupabaseClient() {
  const { createClient } = await import("@/lib/supabase/server");
  return createClient();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await getSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { priceId?: string };

    if (!body.priceId) {
      return NextResponse.json(
        { error: "priceId is required" },
        { status: 400 },
      );
    }

    const { createCheckoutSession } = await import("@/lib/billing/checkout");

    const origin = request.nextUrl.origin;
    const session = await createCheckoutSession({
      userId: user.id,
      userEmail: user.email ?? "",
      priceId: body.priceId,
      successUrl: `${origin}/dashboard/billing?success=true`,
      cancelUrl: `${origin}/dashboard/billing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session creation failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
