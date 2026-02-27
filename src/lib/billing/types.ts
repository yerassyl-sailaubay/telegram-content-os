/**
 * Billing types for Stripe subscription integration.
 */

export type PlanTier = "free" | "plus" | "pro";

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing";

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  priceMonthly: number;
  stripePriceId: string | null;
  features: string[];
  limits: {
    crossPostsPerMonth: number;
    aiCallsPerMonth: number;
    channels: number;
  };
}

export interface UserSubscription {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  plan: PlanTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface CheckoutSessionParams {
  userId: string;
  userEmail: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PortalSessionParams {
  customerId: string;
  returnUrl: string;
}

export interface WebhookEventResult {
  handled: boolean;
  eventType: string;
  error?: string;
}

export interface BillingUsage {
  crossPostsUsed: number;
  crossPostsLimit: number;
  aiCallsUsed: number;
  aiCallsLimit: number;
}
