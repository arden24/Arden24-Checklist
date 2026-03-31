/**
 * Pure helpers for Journal Account Progress: P/L from closed trades, goal math,
 * default milestones, streaks, and alert copy.
 *
 * Streaks use `tradeOutcomeKind` from `realised-pnl` (canonical P/L vs result).
 * Breakeven trades are omitted from W/L sequences (see computeStreakStats).
 */

import type { Trade } from "@/lib/journal";
import { canonicalRealisedPnl, tradeOutcomeKind } from "@/lib/realised-pnl";

export type { TradeOutcomeKind } from "@/lib/realised-pnl";

/** Sort key for chronological order (oldest → newest). */
export function tradeCloseSortKey(t: Trade): number {
  const datePart = t.date?.trim() || "";
  const timePart = (t.time?.trim() || "00:00").slice(0, 5);
  if (datePart) {
    const combined =
      timePart.length >= 4
        ? `${datePart}T${timePart.length === 5 ? timePart : "00:00"}:00`
        : `${datePart}T12:00:00`;
    const ms = Date.parse(combined);
    if (!Number.isNaN(ms)) return ms;
  }
  const c = Date.parse(t.createdAt || "");
  return Number.isNaN(c) ? 0 : c;
}

export function sortTradesChronological(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => tradeCloseSortKey(a) - tradeCloseSortKey(b));
}

export function totalNetPLFromClosedTrades(trades: Trade[]): number {
  return trades.reduce((s, t) => s + canonicalRealisedPnl(t), 0);
}

export type GoalProgressMath = {
  startingBalance: number;
  targetAmount: number;
  totalNetPL: number;
  currentBalance: number;
  progressValue: number;
  targetDistance: number;
  /** 0..1 ratio; 0 when targetDistance <= 0 */
  progressRatio: number;
  /** For bar fill only — clamped 0..1 */
  progressBarFill: number;
  /** Label 0..100 from progressRatio (bar); can cap at 100 for display */
  progressPercentLabel: number;
  remainingToTarget: number;
  targetReached: boolean;
  /** currentBalance > targetAmount */
  aheadOfTarget: boolean;
};

export function computeGoalProgress(
  startingBalance: number,
  targetAmount: number,
  totalNetPL: number
): GoalProgressMath {
  const total = Number.isFinite(totalNetPL) ? totalNetPL : 0;
  const start = Number.isFinite(startingBalance) ? startingBalance : 0;
  const target = Number.isFinite(targetAmount) ? targetAmount : 0;

  const currentBalance = start + total;
  const progressValue = currentBalance - start;
  const targetDistance = target - start;
  const remainingToTarget = target - currentBalance;

  let progressRatio = 0;
  if (targetDistance > 0) {
    progressRatio = progressValue / targetDistance;
  }

  const progressBarFill = Math.min(1, Math.max(0, progressRatio));
  const progressPercentLabel = Math.round(Math.min(100, Math.max(0, progressRatio * 100)));

  const targetReached = target > 0 && currentBalance >= target;
  const aheadOfTarget = target > 0 && currentBalance > target;

  return {
    startingBalance: start,
    targetAmount: target,
    totalNetPL: total,
    currentBalance,
    progressValue,
    targetDistance,
    progressRatio,
    progressBarFill,
    progressPercentLabel,
    remainingToTarget,
    targetReached,
    aheadOfTarget,
  };
}

/** Evenly spaced checkpoints from start to target (inclusive of target), e.g. 25k→27.5k → 5 steps. */
export function buildSuggestedMilestones(
  startingBalance: number,
  targetAmount: number,
  maxSteps = 5
): number[] {
  const dist = targetAmount - startingBalance;
  if (!Number.isFinite(dist) || dist <= 0 || !Number.isFinite(startingBalance)) return [];

  const steps = Math.min(8, Math.max(2, maxSteps));
  const out: number[] = [];
  for (let i = 1; i <= steps; i++) {
    out.push(Math.round(startingBalance + (dist * i) / steps));
  }
  out[out.length - 1] = targetAmount;
  return [...new Set(out)].sort((a, b) => a - b);
}

export type MilestoneState = "completed" | "current" | "locked";

export type MilestoneRow = { value: number; state: MilestoneState };

export function labelMilestoneStates(
  milestoneAmounts: number[],
  currentBalance: number
): MilestoneRow[] {
  if (milestoneAmounts.length === 0) return [];
  let assignedCurrent = false;
  return milestoneAmounts.map((value) => {
    if (currentBalance >= value) {
      return { value, state: "completed" };
    }
    if (!assignedCurrent) {
      assignedCurrent = true;
      return { value, state: "current" };
    }
    return { value, state: "locked" };
  });
}

export type StreakStats = {
  currentStreak: number;
  currentKind: "winning" | "losing" | "neutral";
  bestWinningStreak: number;
  bestLosingStreak: number;
};

/**
 * Oldest → newest trade list. Breakeven entries are omitted from the W/L sequence
 * used for “best” streaks and for walking current streak from the newest trade.
 */
export function computeStreakStats(orderedOldestFirst: Trade[]): StreakStats {
  const seq: ("W" | "L")[] = [];
  for (const t of orderedOldestFirst) {
    const o = tradeOutcomeKind(t);
    if (o === "breakeven") continue;
    seq.push(o === "win" ? "W" : "L");
  }

  let bestW = 0;
  let bestL = 0;
  let runW = 0;
  let runL = 0;
  for (const x of seq) {
    if (x === "W") {
      runW++;
      runL = 0;
      bestW = Math.max(bestW, runW);
    } else {
      runL++;
      runW = 0;
      bestL = Math.max(bestL, runL);
    }
  }

  let currentStreak = 0;
  let currentKind: StreakStats["currentKind"] = "neutral";
  for (let i = seq.length - 1; i >= 0; i--) {
    const x = seq[i];
    if (currentStreak === 0) {
      currentKind = x === "W" ? "winning" : "losing";
      currentStreak = 1;
      continue;
    }
    if (x === "W" && currentKind === "winning") {
      currentStreak++;
      continue;
    }
    if (x === "L" && currentKind === "losing") {
      currentStreak++;
      continue;
    }
    break;
  }

  return {
    currentStreak,
    currentKind,
    bestWinningStreak: bestW,
    bestLosingStreak: bestL,
  };
}

export type AccountAlert = {
  id: string;
  message: string;
  tone: "success" | "info" | "warning" | "accent";
  priority: number;
};

export function drawdownThreshold(startingBalance: number): number {
  if (startingBalance <= 0) return 100;
  return Math.max(100, startingBalance * 0.005);
}

/**
 * Stateless alerts from current metrics. Ephemeral flags (new best streak, milestone
 * crossed) are passed from the component when detected.
 */
export function buildAccountProgressAlerts(
  g: GoalProgressMath,
  streaks: StreakStats,
  opts?: {
    newBestWinningStreak?: boolean;
    milestoneJustReached?: number | null;
  }
): AccountAlert[] {
  const alerts: AccountAlert[] = [];

  if (g.targetAmount > 0 && g.targetReached) {
    alerts.push({
      id: "target-reached",
      message: "Target reached — great work on this phase.",
      tone: "success",
      priority: 100,
    });
  } else if (g.targetAmount > 0 && g.remainingToTarget > 0 && g.remainingToTarget <= 500) {
    alerts.push({
      id: "near-target",
      message: `Within £${g.remainingToTarget.toFixed(0)} of your target balance.`,
      tone: "accent",
      priority: 85,
    });
  } else if (g.targetAmount > 0 && g.remainingToTarget > 500 && g.remainingToTarget <= 2000) {
    alerts.push({
      id: "closing-in",
      message: `${formatGbp(g.remainingToTarget)} to target.`,
      tone: "info",
      priority: 70,
    });
  }

  if (
    g.startingBalance > 0 &&
    g.currentBalance < g.startingBalance &&
    g.startingBalance - g.currentBalance >= drawdownThreshold(g.startingBalance)
  ) {
    alerts.push({
      id: "drawdown",
      message: `Drawdown warning: balance is below starting level by ${formatGbp(
        g.startingBalance - g.currentBalance
      )}.`,
      tone: "warning",
      priority: 90,
    });
  }

  if (opts?.milestoneJustReached != null && opts.milestoneJustReached > 0) {
    alerts.push({
      id: "milestone",
      message: `Milestone reached — ${formatGbp(opts.milestoneJustReached)} checkpoint.`,
      tone: "success",
      priority: 88,
    });
  }

  if (opts?.newBestWinningStreak && streaks.bestWinningStreak > 0) {
    alerts.push({
      id: "new-best-win",
      message: `New best winning streak: ${streaks.bestWinningStreak} trades.`,
      tone: "success",
      priority: 82,
    });
  }

  const streakTargets = [3, 5, 10, 20];
  for (const n of streakTargets) {
    if (
      streaks.currentKind === "winning" &&
      streaks.currentStreak === n - 1 &&
      n > 1
    ) {
      alerts.push({
        id: `one-from-${n}`,
        message: `One winning trade away from a ${n}-trade streak.`,
        tone: "info",
        priority: 55,
      });
      break;
    }
  }

  if (g.targetAmount <= 0 && g.totalNetPL !== 0) {
    alerts.push({
      id: "no-target",
      message: "Set a target amount to track progress toward a funded or personal goal.",
      tone: "info",
      priority: 20,
    });
  }

  alerts.sort((a, b) => b.priority - a.priority);

  const seen = new Set<string>();
  const deduped: AccountAlert[] = [];
  for (const a of alerts) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    deduped.push(a);
  }
  return deduped.slice(0, 3);
}

function formatGbp(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}£${Math.abs(n).toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}
