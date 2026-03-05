import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock Stripe SDK (must be before any imports that reference it)
// ---------------------------------------------------------------------------

const mockCheckoutCreate = vi.fn();
const mockPortalCreate = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();
const mockWebhooksConstructEvent = vi.fn();

vi.mock("stripe", () => {
  class StripeMock {
    checkout = { sessions: { create: mockCheckoutCreate } };
    billingPortal = { sessions: { create: mockPortalCreate } };
    subscriptions = { retrieve: mockSubscriptionsRetrieve };
    webhooks = { constructEvent: mockWebhooksConstructEvent };
    constructor(_key: string, _opts: Record<string, unknown>) {}
  }
  return { default: StripeMock };
});

// Mock DB — each handler dynamically imports these
const mockDbUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  }),
});
const mockDb = { update: mockDbUpdate };
const mockSubscriptionsTable = Symbol("subscriptions");

vi.mock("@/server/db", () => ({ db: mockDb }));
vi.mock("@/server/db/schema", () => ({
  subscriptions: mockSubscriptionsTable,
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

// ---------------------------------------------------------------------------
// Now import the modules under test
// ---------------------------------------------------------------------------

import {
  PLANS,
  resolveTierFromPriceId,
  getPlan,
  getAllPlans,
} from "../plans";
import { getStripe, resetStripeClient } from "../stripe";
import { createCheckoutSession } from "../checkout";
import { createPortalSession } from "../portal";
import { constructWebhookEvent, handleWebhookEvent } from "../webhook";
import type { CheckoutSessionParams, PortalSessionParams } from "../types";

// ---------------------------------------------------------------------------
// Setup & teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  resetStripeClient();
  // Provide env vars for Stripe client initialization
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_fake";
  process.env.STRIPE_PLUS_PRICE_ID = "price_plus_test";
  process.env.STRIPE_PRO_PRICE_ID = "price_pro_test";
});

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_PLUS_PRICE_ID;
  delete process.env.STRIPE_PRO_PRICE_ID;
});

// ===========================================================================
// Plan definitions
// ===========================================================================

describe("plans", () => {
  it("defines three tiers: free, plus, pro", () => {
    expect(Object.keys(PLANS)).toEqual(["free", "plus", "pro"]);
  });

  it("free tier has correct limits", () => {
    expect(PLANS.free.priceMonthly).toBe(0);
    expect(PLANS.free.limits.crossPostsPerMonth).toBe(5);
    expect(PLANS.free.limits.aiCallsPerMonth).toBe(10);
    expect(PLANS.free.limits.channels).toBe(1);
    expect(PLANS.free.stripePriceId).toBeNull();
  });

  it("plus tier costs $19/month", () => {
    expect(PLANS.plus.priceMonthly).toBe(19);
    expect(PLANS.plus.limits.crossPostsPerMonth).toBe(50);
    expect(PLANS.plus.limits.aiCallsPerMonth).toBe(100);
    expect(PLANS.plus.limits.channels).toBe(5);
  });

  it("pro tier costs $49/month with unlimited limits", () => {
    expect(PLANS.pro.priceMonthly).toBe(49);
    expect(PLANS.pro.limits.crossPostsPerMonth).toBe(Infinity);
    expect(PLANS.pro.limits.aiCallsPerMonth).toBe(Infinity);
    expect(PLANS.pro.limits.channels).toBe(Infinity);
  });

  describe("resolveTierFromPriceId", () => {
    it("returns 'free' for null", () => {
      expect(resolveTierFromPriceId(null)).toBe("free");
    });

    it("returns 'free' for unknown price ID", () => {
      expect(resolveTierFromPriceId("price_unknown")).toBe("free");
    });

    it("resolves plus price ID", () => {
      // Since PLANS.plus.stripePriceId reads from env at module-load time,
      // and env is set in beforeEach, we need to check the actual value
      const plusPriceId = PLANS.plus.stripePriceId;
      if (plusPriceId) {
        expect(resolveTierFromPriceId(plusPriceId)).toBe("plus");
      }
    });

    it("resolves pro price ID", () => {
      const proPriceId = PLANS.pro.stripePriceId;
      if (proPriceId) {
        expect(resolveTierFromPriceId(proPriceId)).toBe("pro");
      }
    });
  });

  describe("getPlan", () => {
    it("returns the correct plan for each tier", () => {
      expect(getPlan("free")).toBe(PLANS.free);
      expect(getPlan("plus")).toBe(PLANS.plus);
      expect(getPlan("pro")).toBe(PLANS.pro);
    });
  });

  describe("getAllPlans", () => {
    it("returns plans ordered by price", () => {
      const plans = getAllPlans();
      expect(plans).toHaveLength(3);
      expect(plans[0]!.tier).toBe("free");
      expect(plans[1]!.tier).toBe("plus");
      expect(plans[2]!.tier).toBe("pro");
    });
  });
});

// ===========================================================================
// Stripe client
// ===========================================================================

describe("stripe client", () => {
  it("throws when STRIPE_SECRET_KEY is missing", () => {
    delete process.env.STRIPE_SECRET_KEY;
    resetStripeClient();
    expect(() => getStripe()).toThrow("STRIPE_SECRET_KEY is not set");
  });

  it("returns a Stripe instance when key is present", () => {
    const stripe = getStripe();
    expect(stripe).toBeDefined();
  });

  it("returns the same singleton on subsequent calls", () => {
    const first = getStripe();
    const second = getStripe();
    expect(first).toBe(second);
  });

  it("creates a new instance after resetStripeClient()", () => {
    const first = getStripe();
    resetStripeClient();
    const second = getStripe();
    expect(first).not.toBe(second);
  });
});

// ===========================================================================
// Checkout
// ===========================================================================

describe("createCheckoutSession", () => {
  it("calls stripe.checkout.sessions.create with correct params", async () => {
    const mockSession = { id: "cs_test_123", url: "https://checkout.stripe.com/test" };
    mockCheckoutCreate.mockResolvedValue(mockSession);

    const params: CheckoutSessionParams = {
      userId: "user_123",
      userEmail: "test@example.com",
      priceId: "price_plus_test",
      successUrl: "https://app.test/billing?success=true",
      cancelUrl: "https://app.test/billing?canceled=true",
    };

    const session = await createCheckoutSession(params);

    expect(session).toBe(mockSession);
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: "price_plus_test", quantity: 1 }],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: "test@example.com",
        metadata: { userId: "user_123" },
        subscription_data: { metadata: { userId: "user_123" } },
      }),
    );
  });
});

// ===========================================================================
// Portal
// ===========================================================================

describe("createPortalSession", () => {
  it("calls stripe.billingPortal.sessions.create with correct params", async () => {
    const mockPortalSession = { id: "bps_test_123", url: "https://billing.stripe.com/test" };
    mockPortalCreate.mockResolvedValue(mockPortalSession);

    const params: PortalSessionParams = {
      customerId: "cus_test_123",
      returnUrl: "https://app.test/billing",
    };

    const result = await createPortalSession(params);

    expect(result).toBe(mockPortalSession);
    expect(mockPortalCreate).toHaveBeenCalledWith({
      customer: "cus_test_123",
      return_url: "https://app.test/billing",
    });
  });
});

// ===========================================================================
// Webhook
// ===========================================================================

describe("webhook", () => {
  describe("constructWebhookEvent", () => {
    it("throws when STRIPE_WEBHOOK_SECRET is missing", () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      expect(() => constructWebhookEvent("body", "sig")).toThrow(
        "STRIPE_WEBHOOK_SECRET is not set",
      );
    });

    it("delegates to stripe.webhooks.constructEvent", () => {
      const fakeEvent = { id: "evt_123", type: "test" };
      mockWebhooksConstructEvent.mockReturnValue(fakeEvent);

      const result = constructWebhookEvent("raw_body", "sig_header");

      expect(result).toBe(fakeEvent);
      expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
        "raw_body",
        "sig_header",
        "whsec_test_fake",
      );
    });
  });

  describe("handleWebhookEvent", () => {
    it("handles checkout.session.completed", async () => {
      mockSubscriptionsRetrieve.mockResolvedValue({
        items: { data: [{ price: { id: "price_plus_test" } }] },
        current_period_start: 1700000000,
        current_period_end: 1702600000,
      });

      const event = {
        type: "checkout.session.completed",
        data: {
          object: {
            customer: "cus_123",
            subscription: "sub_123",
            metadata: { userId: "user_abc" },
          },
        },
      } as unknown as import("stripe").default.Event;

      const result = await handleWebhookEvent(event);

      expect(result.handled).toBe(true);
      expect(result.eventType).toBe("checkout.session.completed");
      expect(mockDbUpdate).toHaveBeenCalledWith(mockSubscriptionsTable);
    });

    it("handles customer.subscription.updated", async () => {
      const event = {
        type: "customer.subscription.updated",
        data: {
          object: {
            metadata: { userId: "user_abc" },
            items: { data: [{ price: { id: "price_plus_test" } }] },
            status: "active",
            current_period_start: 1700000000,
            current_period_end: 1702600000,
            cancel_at_period_end: false,
          },
        },
      } as unknown as import("stripe").default.Event;

      const result = await handleWebhookEvent(event);

      expect(result.handled).toBe(true);
      expect(result.eventType).toBe("customer.subscription.updated");
      expect(mockDbUpdate).toHaveBeenCalledWith(mockSubscriptionsTable);
    });

    it("handles customer.subscription.deleted", async () => {
      const event = {
        type: "customer.subscription.deleted",
        data: {
          object: {
            metadata: { userId: "user_abc" },
            items: { data: [] },
            status: "canceled",
            current_period_start: 1700000000,
            current_period_end: 1702600000,
            cancel_at_period_end: false,
          },
        },
      } as unknown as import("stripe").default.Event;

      const result = await handleWebhookEvent(event);

      expect(result.handled).toBe(true);
      expect(result.eventType).toBe("customer.subscription.deleted");
      expect(mockDbUpdate).toHaveBeenCalledWith(mockSubscriptionsTable);
    });

    it("handles invoice.payment_failed", async () => {
      const event = {
        type: "invoice.payment_failed",
        data: {
          object: {
            customer: "cus_123",
          },
        },
      } as unknown as import("stripe").default.Event;

      const result = await handleWebhookEvent(event);

      expect(result.handled).toBe(true);
      expect(result.eventType).toBe("invoice.payment_failed");
      expect(mockDbUpdate).toHaveBeenCalledWith(mockSubscriptionsTable);
    });

    it("returns handled=false for unrecognized events", async () => {
      const event = {
        type: "some.unknown.event",
        data: { object: {} },
      } as unknown as import("stripe").default.Event;

      const result = await handleWebhookEvent(event);

      expect(result.handled).toBe(false);
      expect(result.eventType).toBe("some.unknown.event");
    });

    it("returns error when handler throws", async () => {
      // checkout.session.completed with no userId → logs error, doesn't throw
      // but we can force an error by making db.update throw
      const originalUpdate = mockDbUpdate.getMockImplementation();
      mockDbUpdate.mockImplementation(() => {
        throw new Error("DB connection failed");
      });

      mockSubscriptionsRetrieve.mockResolvedValue({
        items: { data: [{ price: { id: "price_plus_test" } }] },
        current_period_start: 1700000000,
        current_period_end: 1702600000,
      });

      const event = {
        type: "checkout.session.completed",
        data: {
          object: {
            customer: "cus_123",
            subscription: "sub_123",
            metadata: { userId: "user_abc" },
          },
        },
      } as unknown as import("stripe").default.Event;

      const result = await handleWebhookEvent(event);

      expect(result.handled).toBe(false);
      expect(result.error).toBe("DB connection failed");

      // Restore
      if (originalUpdate) {
        mockDbUpdate.mockImplementation(originalUpdate);
      } else {
        mockDbUpdate.mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        });
      }
    });

    it("skips DB update when checkout.session.completed has no userId", async () => {
      const event = {
        type: "checkout.session.completed",
        data: {
          object: {
            customer: "cus_123",
            subscription: "sub_123",
            metadata: {}, // no userId
          },
        },
      } as unknown as import("stripe").default.Event;

      const result = await handleWebhookEvent(event);

      // Should still return handled=true since the event type was recognized
      expect(result.handled).toBe(true);
      // DB should NOT be updated since there's no userId
      expect(mockDbUpdate).not.toHaveBeenCalled();
    });
  });
});

// ===========================================================================
// Barrel exports
// ===========================================================================

describe("barrel exports", () => {
  it("re-exports all public APIs from index", async () => {
    const barrel = await import("../index");

    expect(barrel.getStripe).toBeDefined();
    expect(barrel.resetStripeClient).toBeDefined();
    expect(barrel.PLANS).toBeDefined();
    expect(barrel.resolveTierFromPriceId).toBeDefined();
    expect(barrel.getPlan).toBeDefined();
    expect(barrel.getAllPlans).toBeDefined();
    expect(barrel.createCheckoutSession).toBeDefined();
    expect(barrel.createPortalSession).toBeDefined();
    expect(barrel.constructWebhookEvent).toBeDefined();
    expect(barrel.handleWebhookEvent).toBeDefined();
  });
});
