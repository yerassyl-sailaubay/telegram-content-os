/**
 * Server-side Stripe client with lazy initialization.
 *
 * Uses STRIPE_SECRET_KEY environment variable.
 * The client is cached as a singleton to avoid creating multiple instances.
 */

import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/**
 * Returns the Stripe client singleton.
 * Throws if STRIPE_SECRET_KEY is not set.
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not set. Please set it in your environment variables.");
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return stripeInstance;
}

/**
 * Reset the client instance (useful for testing).
 */
export function resetStripeClient(): void {
  stripeInstance = null;
}
