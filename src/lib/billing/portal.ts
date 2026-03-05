/**
 * Create Stripe Customer Portal session for self-service subscription management.
 *
 * Allows customers to update payment methods, view invoices, or cancel.
 */

import type Stripe from "stripe";
import { getStripe } from "./stripe";
import type { PortalSessionParams } from "./types";

/**
 * Creates a Stripe Customer Portal session.
 *
 * The portal URL redirects the customer to Stripe's hosted management page.
 */
export async function createPortalSession(
  params: PortalSessionParams,
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();

  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
}
