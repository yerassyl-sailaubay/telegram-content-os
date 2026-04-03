/**
 * POST /api/billing/webhook
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 * Uses raw body for signature verification — must NOT parse JSON before verify.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  try {
    const { constructWebhookEvent, handleWebhookEvent } = await import("@/lib/billing/webhook");

    const event = constructWebhookEvent(rawBody, signature);
    const result = await handleWebhookEvent(event);

    return NextResponse.json({
      received: true,
      handled: result.handled,
      eventType: result.eventType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", message);

    // Return 400 for signature verification failures
    if (message.includes("signature") || message.includes("Webhook")) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    // Return 200 for handler errors to prevent Stripe from retrying
    return NextResponse.json({ received: true });
  }
}
