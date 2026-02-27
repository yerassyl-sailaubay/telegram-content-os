/**
 * Create Stripe Checkout Session for subscription upgrades.
 *
 * Uses Stripe hosted checkout — no custom payment forms.
 */

import type Stripe from "stripe";
import { getStripe } from "./stripe";
import type { CheckoutSessionParams } from "./types";

/**
 * Creates a Stripe Checkout Session in subscription mode.
 *
 * If the user already has a Stripe Customer ID, it's reused.
 * Otherwise, Stripe creates a new customer from the provided email.
 */
export async function createCheckoutSession(
  params: CheckoutSessionParams,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: params.userEmail,
    metadata: {
      userId: params.userId,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
      },
    },
  };

  return stripe.checkout.sessions.create(sessionConfig);
}
