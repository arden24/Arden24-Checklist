import { hasPlanAccess } from "@/lib/subscriptions/access";
import type { PlanKey } from "@/lib/subscriptions/plans";
import type { ChecklistItem } from "@/lib/supabase/strategies";

export const BASIC_MAX_STRATEGIES = 2;
export const BASIC_MAX_CONFLUENCES = 5;

export function canUseProScreenshots(plan: PlanKey | null): boolean {
  return hasPlanAccess(plan, "pro");
}

export function canUseProCriticalConfluence(plan: PlanKey | null): boolean {
  return hasPlanAccess(plan, "pro");
}

export function canUseProTimeframeTags(plan: PlanKey | null): boolean {
  return hasPlanAccess(plan, "pro");
}

export function canUseProNotes(plan: PlanKey | null): boolean {
  return hasPlanAccess(plan, "pro");
}

export function canUseProJournalCalendar(plan: PlanKey | null): boolean {
  return hasPlanAccess(plan, "pro");
}

export function canUseProGoalsAndAccount(plan: PlanKey | null): boolean {
  return hasPlanAccess(plan, "pro");
}

export function canUseProAdvancedStats(plan: PlanKey | null): boolean {
  return hasPlanAccess(plan, "pro");
}

export function canUseProPerformanceInsights(plan: PlanKey | null): boolean {
  return hasPlanAccess(plan, "pro");
}

export function canUseProLiveTradeRatings(plan: PlanKey | null): boolean {
  return hasPlanAccess(plan, "pro");
}

export function canUseEliteKeyPointGenerate(plan: PlanKey | null): boolean {
  return hasPlanAccess(plan, "elite");
}

export function canUseEliteAdvancedInsights(plan: PlanKey | null): boolean {
  return hasPlanAccess(plan, "elite");
}

export function canUseEliteWorkspaceThemes(plan: PlanKey | null): boolean {
  return hasPlanAccess(plan, "elite");
}

/** Treat missing subscription as Basic for builder limits. */
export function isBasicTier(plan: PlanKey | null): boolean {
  return plan === null || plan === "basic";
}

export type ChecklistForSave = {
  text: string;
  timeframe: string;
  image?: string | null;
  imageRef?: string | null;
  weight: number | string;
  critical: boolean;
};

export function normalizeChecklistForPlan(
  plan: PlanKey | null,
  checklist: ChecklistForSave[]
): ChecklistForSave[] {
  if (!isBasicTier(plan)) return checklist;
  return checklist
    .filter((c) => c.text.trim().length > 0)
    .slice(0, BASIC_MAX_CONFLUENCES)
    .map((c) => ({
      ...c,
      critical: false,
      timeframe: "",
      image: undefined,
      imageRef: undefined,
    }));
}

export function persistedChecklistFromNormalized(
  items: ChecklistForSave[]
): ChecklistItem[] {
  return items.map((c) => ({
    text: c.text,
    timeframe: c.timeframe,
    image: c.image ?? undefined,
    imageRef: c.imageRef ?? undefined,
    weight: typeof c.weight === "number" ? c.weight : Number(c.weight) || 0,
    critical: c.critical,
  }));
}
