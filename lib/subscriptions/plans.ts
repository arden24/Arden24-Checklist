export type PlanKey = "basic" | "pro" | "elite";

export type PlanDefinition = {
  label: string;
  features: string[];
};

const BASIC_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC?.trim() ?? "";
const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO?.trim() ?? "";
const ELITE_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE?.trim() ?? "";

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
