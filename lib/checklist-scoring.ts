import type { ChecklistItem } from "@/lib/supabase/strategies";

export type SetupStatus = "No Trade" | "Risky" | "Valid Setup" | "A+ Setup";

export type ScorableChecklistItem = ChecklistItem & {
  checked: boolean;
};

export type ChecklistScore = {
  weightedScorePercent: number; // 0-100
  checkedCount: number;
  totalCount: number;
  checkedWeight: number;
  totalWeight: number;
  missingCritical: boolean;
  status: SetupStatus;
};

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeWeightedChecklistScore(
  items: ScorableChecklistItem[]
): ChecklistScore {
  const totalCount = items.length;
  const checkedCount = items.filter((it) => it.checked).length;

  const totalWeight = items.reduce(
    (sum, item) => sum + (Number(item.weight) || 0),
    0
  );
  const checkedWeight = items.reduce(
    (sum, item) => (item.checked ? sum + (Number(item.weight) || 0) : sum),
    0
  );

  const weightedScorePercent =
    totalWeight > 0 ? clampPercent((checkedWeight / totalWeight) * 100) : 0;

  const missingCritical = items.some(
    (item) => item.critical && !item.checked
  );

  const statusFromPercent = (pct: number): SetupStatus => {
    if (pct <= 49) return "No Trade";
    if (pct <= 69) return "Risky";
    if (pct <= 84) return "Valid Setup";
    return "A+ Setup";
  };

  const baseStatus = statusFromPercent(weightedScorePercent);

  // Critical conditions are a hard gate: no Valid/A+ when any critical is missing.
  if (!missingCritical) {
    return {
      weightedScorePercent,
      checkedCount,
      totalCount,
      checkedWeight,
      totalWeight,
      missingCritical: false,
      status: baseStatus,
    };
  }

  const cappedStatus: SetupStatus =
    weightedScorePercent <= 49 ? "No Trade" : "Risky";

  return {
    weightedScorePercent,
    checkedCount,
    totalCount,
    checkedWeight,
    totalWeight,
    missingCritical: true,
    status: cappedStatus,
  };
}

