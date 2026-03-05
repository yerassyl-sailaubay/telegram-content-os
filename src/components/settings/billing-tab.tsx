"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlan } from "@/lib/billing/plans";
import type { PlanTier, SubscriptionStatus } from "@/lib/billing/types";

type BillingTabProps = {
  plan: PlanTier;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};

export function BillingTab({
  plan,
  status,
  stripeCustomerId,
  cancelAtPeriodEnd,
  currentPeriodEnd,
}: BillingTabProps) {
  const t = useTranslations("settings");
  const tBilling = useTranslations("billing");
  const [portalLoading, setPortalLoading] = useState(false);

  const currentPlan = getPlan(plan);

  async function handleManageSubscription() {
    if (!stripeCustomerId) return;
    setPortalLoading(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await response.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // portal navigation error
    } finally {
      setPortalLoading(false);
    }
  }

  const statusLabel = () => {
    if (cancelAtPeriodEnd) return tBilling("canceling");
    if (status === "past_due") return tBilling("pastDue");
    return null;
  };

  const renewalText = () => {
    if (!currentPeriodEnd) return null;
    const date = new Date(currentPeriodEnd).toLocaleDateString();
    if (cancelAtPeriodEnd) return tBilling("cancelingAt", { date });
    return tBilling("renewsAt", { date });
  };

  return (
    <Card data-testid="billing-tab-content">
      <CardHeader>
        <CardTitle>{t("billing.title")}</CardTitle>
        <CardDescription>{t("billing.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="space-y-3 rounded-lg border p-4" data-testid="current-plan-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="text-primary h-5 w-5" />
                <p className="font-semibold">{tBilling("currentPlan")}</p>
              </div>
              <p className="mt-1 text-2xl font-bold capitalize" data-testid="current-plan-name">
                {currentPlan.name}
              </p>
              {currentPlan.priceMonthly > 0 && (
                <p className="text-muted-foreground text-sm">
                  ${currentPlan.priceMonthly}
                  {tBilling("perMonth")}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={plan === "free" ? "secondary" : "default"} data-testid="plan-badge">
                {currentPlan.name}
              </Badge>
              {statusLabel() && (
                <Badge variant="destructive" data-testid="status-badge">
                  {statusLabel()}
                </Badge>
              )}
            </div>
          </div>

          {renewalText() && (
            <p className="text-muted-foreground text-xs" data-testid="renewal-text">
              {renewalText()}
            </p>
          )}

          <ul className="space-y-1">
            {currentPlan.features.map((feature) => (
              <li key={feature} className="text-muted-foreground flex items-center gap-2 text-sm">
                <span className="text-primary">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Manage Subscription */}
        {stripeCustomerId && (
          <Button
            variant="outline"
            onClick={handleManageSubscription}
            disabled={portalLoading}
            data-testid="manage-subscription-button"
          >
            {portalLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            {tBilling("manageSubscription")}
          </Button>
        )}

        {!stripeCustomerId && plan === "free" && (
          <p className="text-muted-foreground text-sm" data-testid="upgrade-hint">
            {t("billing.upgradeHint")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
