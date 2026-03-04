"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PricingCard } from "./pricing-card";
import { UsageMeter } from "./usage-meter";
import { UpgradePrompt } from "./upgrade-prompt";
import { getAllPlans, getPlan } from "@/lib/billing/plans";
import type { PlanTier, SubscriptionStatus } from "@/lib/billing/types";

const NEXT_PLAN: Record<PlanTier, PlanTier | null> = {
  free: "plus",
  plus: "pro",
  pro: null,
};

type BillingClientProps = {
  plan: PlanTier;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  crossPostsUsed: number;
  aiCallsUsed: number;
};

export function BillingClient({
  plan,
  status,
  stripeCustomerId,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  crossPostsUsed,
  aiCallsUsed,
}: BillingClientProps) {
  const t = useTranslations("billing");
  const [loading, setLoading] = useState<PlanTier | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const currentPlan = getPlan(plan);
  const allPlans = getAllPlans();
  const nextPlanTier = NEXT_PLAN[plan];
  const nextPlanName = nextPlanTier ? getPlan(nextPlanTier).name : "";

  async function handleSelectPlan(tier: PlanTier) {
    const planDef = getPlan(tier);
    if (!planDef.stripePriceId || tier === "free") return;

    setLoading(tier);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: planDef.stripePriceId }),
      });

      const data = (await response.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Error handling — could add toast notification
    } finally {
      setLoading(null);
    }
  }

  async function handleManageSubscription() {
    if (!stripeCustomerId) return;

    setPortalLoading(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = (await response.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Error handling
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Current plan & usage */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="size-5" />
              <CardTitle className="text-base">{t("currentPlan")}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={plan === "free" ? "secondary" : "default"}>{currentPlan.name}</Badge>
              {cancelAtPeriodEnd && <Badge variant="destructive">{t("canceling")}</Badge>}
              {status === "past_due" && <Badge variant="destructive">{t("pastDue")}</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageMeter
            label={t("aiCallsUsage")}
            used={aiCallsUsed}
            limit={currentPlan.limits.aiCallsPerMonth}
          />
          <div className="opacity-60">
            <UsageMeter
              label={t("crossPostsUsage")}
              used={crossPostsUsed}
              limit={currentPlan.limits.crossPostsPerMonth}
            />
          </div>

          {nextPlanName && (
            <UpgradePrompt
              used={aiCallsUsed}
              limit={currentPlan.limits.aiCallsPerMonth}
              nextPlanName={nextPlanName}
              onUpgrade={() => nextPlanTier && handleSelectPlan(nextPlanTier)}
              loading={loading === nextPlanTier}
            />
          )}

          {currentPeriodEnd && (
            <p className="text-muted-foreground text-sm">
              {cancelAtPeriodEnd
                ? t("cancelingAt", {
                    date: new Date(currentPeriodEnd).toLocaleDateString(),
                  })
                : t("renewsAt", {
                    date: new Date(currentPeriodEnd).toLocaleDateString(),
                  })}
            </p>
          )}

          {stripeCustomerId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageSubscription}
              disabled={portalLoading}
            >
              {portalLoading ? "..." : t("manageSubscription")}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Pricing cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">{t("plans")}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {allPlans.map((planDef) => (
            <PricingCard
              key={planDef.tier}
              name={planDef.name}
              tier={planDef.tier}
              priceMonthly={planDef.priceMonthly}
              features={planDef.features}
              isCurrentPlan={planDef.tier === plan}
              isPopular={planDef.tier === "plus"}
              onSelect={() => handleSelectPlan(planDef.tier)}
              selectLabel={t("upgrade")}
              currentPlanLabel={t("currentPlan")}
              perMonthLabel={t("perMonth")}
              popularLabel={t("popular")}
              freeLabel={t("free")}
              loading={loading === planDef.tier}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
