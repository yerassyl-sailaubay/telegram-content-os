"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlanTier } from "@/lib/billing/types";

type PricingCardProps = {
  name: string;
  tier: PlanTier;
  priceMonthly: number;
  features: string[];
  isCurrentPlan: boolean;
  isPopular?: boolean;
  onSelect: () => void;
  selectLabel: string;
  currentPlanLabel: string;
  perMonthLabel: string;
  popularLabel: string;
  freeLabel: string;
  loading?: boolean;
};

export function PricingCard({
  name,
  tier,
  priceMonthly,
  features,
  isCurrentPlan,
  isPopular,
  onSelect,
  selectLabel,
  currentPlanLabel,
  perMonthLabel,
  popularLabel,
  freeLabel,
  loading,
}: PricingCardProps) {
  return (
    <Card
      className={cn(
        "relative flex flex-col",
        isPopular && "border-primary shadow-md",
        isCurrentPlan && "border-primary/50 bg-primary/5",
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="default">{popularLabel}</Badge>
        </div>
      )}

      <CardHeader>
        <CardTitle className="text-lg">{name}</CardTitle>
        <CardDescription>
          <span className="text-foreground text-3xl font-bold">
            {priceMonthly === 0 ? freeLabel : `$${priceMonthly}`}
          </span>
          {priceMonthly > 0 && <span className="text-muted-foreground"> {perMonthLabel}</span>}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="text-primary mt-0.5 size-4 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={isCurrentPlan ? "outline" : isPopular ? "default" : "secondary"}
          disabled={isCurrentPlan || loading || tier === "free"}
          onClick={onSelect}
        >
          {loading ? "..." : isCurrentPlan ? currentPlanLabel : selectLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
