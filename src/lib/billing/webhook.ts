/**
 * Stripe webhook event handler.
 *
 * Verifies webhook signatures and processes subscription lifecycle events.
 * Updates the subscriptions table in the database accordingly.
 *
 * Handled events:
 * - checkout.session.completed — new subscription created
 * - customer.subscription.updated — plan changes, renewals
 * - customer.subscription.deleted — subscription canceled
 * - invoice.payment_failed — payment issue
 */

import type Stripe from "stripe";
import { getStripe } from "./stripe";
import { resolveTierFromPriceId } from "./plans";
import type { WebhookEventResult } from "./types";

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

/**
 * Verify and construct a Stripe webhook event from raw body + signature.
 */
export function constructWebhookEvent(rawBody: string, signature: string): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not set. Please set it in your environment variables.",
    );
  }

  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("checkout.session.completed: no userId in metadata");
    return;
  }

  const { db } = await import("@/server/db");
  const { subscriptions } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");

  const customerId =
    typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription?.id ?? null);

  // Fetch the subscription to get price details
  let priceId: string | null = null;
  let currentPeriodEnd: Date | null = null;
  let currentPeriodStart: Date | null = null;

  if (subscriptionId) {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const firstItem = sub.items.data[0];
    priceId = firstItem?.price.id ?? null;
    currentPeriodEnd = firstItem ? new Date(firstItem.current_period_end * 1000) : null;
    currentPeriodStart = firstItem ? new Date(firstItem.current_period_start * 1000) : null;
  }

  const tier = resolveTierFromPriceId(priceId);

  await db
    .update(subscriptions)
    .set({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      plan: tier,
      status: "active",
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("customer.subscription.updated: no userId in metadata");
    return;
  }

  const { db } = await import("@/server/db");
  const { subscriptions } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");

  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price.id ?? null;
  const tier = resolveTierFromPriceId(priceId);

  const statusMap: Record<string, "active" | "canceled" | "past_due" | "trialing"> = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    trialing: "trialing",
    unpaid: "past_due",
    incomplete: "past_due",
    incomplete_expired: "canceled",
    paused: "canceled",
  };

  const mappedStatus = statusMap[subscription.status] ?? "active";

  await db
    .update(subscriptions)
    .set({
      stripePriceId: priceId,
      plan: tier,
      status: mappedStatus,
      currentPeriodStart: firstItem ? new Date(firstItem.current_period_start * 1000) : new Date(),
      currentPeriodEnd: firstItem ? new Date(firstItem.current_period_end * 1000) : new Date(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("customer.subscription.deleted: no userId in metadata");
    return;
  }

  const { db } = await import("@/server/db");
  const { subscriptions } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");

  await db
    .update(subscriptions)
    .set({
      plan: "free",
      status: "canceled",
      stripeSubscriptionId: null,
      stripePriceId: null,
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : (invoice.customer?.id ?? null);

  if (!customerId) {
    console.error("invoice.payment_failed: no customer ID");
    return;
  }

  const { db } = await import("@/server/db");
  const { subscriptions } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");

  await db
    .update(subscriptions)
    .set({
      status: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

/**
 * Handle a verified Stripe webhook event.
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<WebhookEventResult> {
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        return { handled: true, eventType: event.type };

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        return { handled: true, eventType: event.type };

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        return { handled: true, eventType: event.type };

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        return { handled: true, eventType: event.type };

      default:
        return { handled: false, eventType: event.type };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Webhook handler error for ${event.type}:`, message);
    return { handled: false, eventType: event.type, error: message };
  }
}
