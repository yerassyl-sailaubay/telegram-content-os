/**
 * Subscription tier definitions.
 *
 * Free tier is the default — no Stripe subscription required.
 * Plus ($19/mo) and Pro ($49/mo) are paid tiers via Stripe Checkout.
 *
 * Stripe Price IDs come from environment variables so they can differ
 * between test / live modes.
 */

import type { PlanDefinition, PlanTier } from "./types";

// ---------------------------------------------------------------------------
// Tier definitions
// ---------------------------------------------------------------------------

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: "free",
    name: "Free",
    priceMonthly: 0,
    stripePriceId: null,
    features: [
      "1 Telegram channel",
      "5 cross-posts / month",
      "10 AI calls / month",
      "Basic analytics",
    ],
    limits: {
      crossPostsPerMonth: 5,
      aiCallsPerMonth: 10,
      channels: 1,
    },
  },
  plus: {
    tier: "plus",
    name: "Plus",
    priceMonthly: 19,
    stripePriceId: process.env.STRIPE_PLUS_PRICE_ID ?? null,
    features: [
      "5 Telegram channels",
      "50 cross-posts / month",
      "100 AI calls / month",
      "Advanced analytics",
      "Priority support",
    ],
    limits: {
      crossPostsPerMonth: 50,
      aiCallsPerMonth: 100,
      channels: 5,
    },
  },
  pro: {
    tier: "pro",
    name: "Pro",
    priceMonthly: 49,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
    features: [
      "Unlimited channels",
      "Unlimited cross-posts",
      "Unlimited AI calls",
      "Advanced analytics",
      "Priority support",
      "Custom branding",
    ],
    limits: {
      crossPostsPerMonth: Infinity,
      aiCallsPerMonth: Infinity,
      channels: Infinity,
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a Stripe Price ID to its corresponding plan tier.
 * Returns "free" if no match is found.
 */
export function resolveTierFromPriceId(priceId: string | null): PlanTier {
  if (!priceId) return "free";

  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceId === priceId) {
      return plan.tier;
    }
  }

  return "free";
}

/**
 * Get the plan definition for a given tier.
 */
export function getPlan(tier: PlanTier): PlanDefinition {
  return PLANS[tier];
}

/**
 * Get all plan definitions ordered by price.
 */
export function getAllPlans(): PlanDefinition[] {
  return [PLANS.free, PLANS.plus, PLANS.pro];
}
