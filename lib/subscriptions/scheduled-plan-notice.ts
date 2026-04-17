import {
  getActivePlanFromSubscriptionRow,
  getPlanLabel,
  type SubscriptionPlanRow,
} from "@/lib/subscriptions/access";
import type { PlanKey } from "@/lib/subscriptions/plans";

function normalizePlanKey(value: string | null | undefined): PlanKey | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "basic" || v === "pro" || v === "elite") return v;
  return null;
}

function formatPeriodEndDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * When `scheduled_plan` differs from the still-active current plan, the user keeps current access
 * until `current_period_end` (see `getActivePlanFromSubscriptionRow`, which ignores `scheduled_plan`).
 */
export function getScheduledPlanChangeNotice(
  row: SubscriptionPlanRow | null
): string | null {
  if (!row) return null;
  const active = getActivePlanFromSubscriptionRow(row);
  const scheduled = normalizePlanKey(row.scheduled_plan);
  if (!active || !scheduled) return null;
  if (scheduled === active) return null;
  const end = row.current_period_end;
  if (!end) return null;
  return `Your plan will change to ${getPlanLabel(scheduled)} on ${formatPeriodEndDate(end)}.`;
}
