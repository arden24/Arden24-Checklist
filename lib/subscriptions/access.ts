import { PLAN_DEFINITIONS, PRICE_ID_TO_PLAN, type PlanKey } from "@/lib/subscriptions/plans";
import { subscriptionStatusIsActive } from "@/lib/supabase/subscription-access";

const PLAN_RANK: Record<PlanKey, number> = {
  basic: 0,
  pro: 1,
  elite: 2,
};

function normalizePlanKey(value: string | null | undefined): PlanKey | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "basic" || v === "pro" || v === "elite") return v;
  return null;
}

export function getPlanFromPriceId(priceId: string | null | undefined): PlanKey | null {
  if (!priceId) return null;
  const id = priceId.trim();
  if (!id) return null;
  return PRICE_ID_TO_PLAN[id] ?? null;
}

export function getPlanLabel(plan: PlanKey | null): string {
  if (!plan) return "No active plan";
  return PLAN_DEFINITIONS[plan].label;
}

export function hasPlanAccess(userPlan: PlanKey | null, requiredPlan: PlanKey): boolean {
  if (!userPlan) return false;
  return PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];
}

export function getPlanActionLabel(
  userPlan: PlanKey | null,
  targetPlan: PlanKey,
  defaultLabel: string
): "Current Plan" | "Upgrade" | "Downgrade" | string {
  if (!userPlan) return defaultLabel;
  if (userPlan === targetPlan) return "Current Plan";
  return PLAN_RANK[targetPlan] > PLAN_RANK[userPlan] ? "Upgrade" : "Downgrade";
}

export type SubscriptionPlanRow = {
  subscription_status: string | null;
  price_id?: string | null;
  subscription_plan?: string | null;
  current_period_end?: string | null;
  /** Synced when Stripe subscription schedule changes tier at period end. */
  scheduled_plan?: string | null;
};

export function getActivePlanFromSubscriptionRow(row: SubscriptionPlanRow | null): PlanKey | null {
  if (!row) return null;
  if (!subscriptionStatusIsActive(row.subscription_status)) return null;
  return getPlanFromPriceId(row.price_id) ?? normalizePlanKey(row.subscription_plan);
}
