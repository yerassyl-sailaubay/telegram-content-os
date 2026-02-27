import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { BillingClient } from "@/components/billing/billing-client";

async function getSubscriptionData() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { db } = await import("@/server/db");
  const { subscriptions, usageTracking } = await import("@/server/db/schema");
  const { eq, and } = await import("drizzle-orm");

  // Fetch subscription
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  // Fetch usage for current month
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [usage] = await db
    .select()
    .from(usageTracking)
    .where(
      and(eq(usageTracking.userId, user.id), eq(usageTracking.month, month)),
    )
    .limit(1);

  return {
    plan: sub?.plan ?? "free",
    status: sub?.status ?? "active",
    stripeCustomerId: sub?.stripeCustomerId ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
    crossPostsUsed: usage?.crossPostsCount ?? 0,
    aiCallsUsed: usage?.aiCallsCount ?? 0,
  };
}

export default async function BillingPage() {
  const t = await getTranslations("billing");

  const data = await getSubscriptionData();

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <BillingClient
        plan={data?.plan ?? "free"}
        status={data?.status ?? "active"}
        stripeCustomerId={data?.stripeCustomerId ?? null}
        cancelAtPeriodEnd={data?.cancelAtPeriodEnd ?? false}
        currentPeriodEnd={data?.currentPeriodEnd ?? null}
        crossPostsUsed={data?.crossPostsUsed ?? 0}
        aiCallsUsed={data?.aiCallsUsed ?? 0}
      />
    </>
  );
}
