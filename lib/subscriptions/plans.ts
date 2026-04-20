import {
  STRIPE_PRICE_BASIC,
  STRIPE_PRICE_ELITE,
  STRIPE_PRICE_PRO,
} from "@/lib/stripe/subscription-plan";

export type PlanKey = "basic" | "pro" | "elite";

export type PlanDefinition = {
  label: string;
  features: string[];
};

const BASIC_PRICE_ID = STRIPE_PRICE_BASIC;
const PRO_PRICE_ID = STRIPE_PRICE_PRO;
const ELITE_PRICE_ID = STRIPE_PRICE_ELITE;

export const PLAN_DEFINITIONS: Record<PlanKey, PlanDefinition> = {
  basic: {
    label: "Basic",
    features: ["Core journaling", "Checklist", "Starter analytics"],
  },
  pro: {
    label: "Pro",
    features: ["Everything in Basic", "Advanced analytics", "Priority tools"],
  },
  elite: {
    label: "Elite",
    features: ["Everything in Pro", "Top-tier insights", "Premium support"],
  },
};

export const PRICE_ID_TO_PLAN: Record<string, PlanKey> = Object.fromEntries(
  [
    [BASIC_PRICE_ID, "basic"],
    [PRO_PRICE_ID, "pro"],
    [ELITE_PRICE_ID, "elite"],
  ].filter(([priceId]) => Boolean(priceId))
) as Record<string, PlanKey>;
