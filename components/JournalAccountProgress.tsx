"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  type AccountProgress,
  type AccountProgressType,
  fetchAccountProgress,
  saveAccountProgress,
} from "@/lib/supabase/account-progress";
import {
  buildAccountProgressAlerts,
  buildSuggestedMilestones,
  computeGoalProgress,
  computeStreakStats,
  labelMilestoneStates,
  sortTradesChronological,
  totalNetPLFromClosedTrades,
  type GoalProgressMath,
} from "@/lib/account-progress-metrics";
import type { Trade } from "@/lib/journal";
import { logError } from "@/lib/log-error";
import { AppSelect, type AppSelectOption } from "@/components/AppSelect";
import {
  sessionFormFullKey,
  useSessionFormState,
} from "@/lib/hooks/useSessionFormState";

const ACCOUNT_OPTIONS: {
  value: AccountProgressType;
  label: string;
  hint: string;
}[] = [
  {
    value: "challenge",
    label: "Challenge",
    hint: "Evaluation-style account: balance must reach your target to pass.",
  },
  {
    value: "passed",
    label: "Passed",
    hint: "After passing — track the next verification or payout phase.",
  },
  {
    value: "funded",
    label: "Funded",
    hint: "Live funded account — growth or payout milestones.",
  },
  {
    value: "personal_live",
    label: "Personal live",
    hint: "Your own capital — set a growth goal you care about.",
  },
  {
    value: "demo",
    label: "Demo",
    hint: "Practice account — consistency or learning goals.",
  },
];

const ACCOUNT_TYPE_SELECT_OPTIONS: AppSelectOption<AccountProgressType>[] =
  ACCOUNT_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

function formatMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}£${Math.abs(n).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseMoneyInput(raw: string): number {
  const cleaned = raw.replace(/[£,\s]/g, "").trim();
  if (cleaned === "" || cleaned === "-") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Strict positive amount for validation (save). */
function parseStrictPositiveMoney(raw: string): { ok: true; value: number } | { ok: false } {
  const cleaned = raw.replace(/[£,\s]/g, "").trim();
  if (cleaned === "") return { ok: false };
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return { ok: false };
  return { ok: true, value: n };
}

/** Target: empty = not set (0); if present must be valid positive number. */
function parseTargetMoney(raw: string): { ok: true; value: number } | { ok: false } {
  const cleaned = raw.replace(/[£,\s]/g, "").trim();
  if (cleaned === "") return { ok: true, value: 0 };
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return { ok: false };
  return { ok: true, value: n };
}

function toTargetCopy(g: GoalProgressMath): { line: string; hint: string } {
  if (g.targetAmount <= 0) {
    return { line: "—", hint: "Set a target below to track distance to goal." };
  }
  if (g.aheadOfTarget) {
    return {
      line: formatMoney(0),
      hint: `Ahead of target by ${formatMoney(g.currentBalance - g.targetAmount)}`,
    };
  }
  if (g.targetReached) {
    return { line: formatMoney(0), hint: "Target reached" };
  }
  return {
    line: formatMoney(g.remainingToTarget),
    hint: "Remaining to reach your target balance",
  };
}

function progressLabelText(g: GoalProgressMath): string {
  if (g.targetAmount <= 0 || g.targetDistance <= 0) return "—";
  if (g.targetReached || g.aheadOfTarget) return g.aheadOfTarget ? "100%+" : "100%";
  return `${g.progressPercentLabel}%`;
}

type AccountProgressFormState = {
  accountType: AccountProgressType;
  startingStr: string;
  targetStr: string;
  targetLabel: string;
  targetNotes: string;
  expanded: boolean;
};

function mapRowToFormState(row: AccountProgress | null): AccountProgressFormState {
  if (!row) {
    return {
      accountType: "challenge",
      startingStr: "",
      targetStr: "",
      targetLabel: "",
      targetNotes: "",
      expanded: true,
    };
  }
  return {
    accountType: row.accountType,
    startingStr: row.startingBalance ? String(row.startingBalance) : "",
    targetStr: row.targetAmount ? String(row.targetAmount) : "",
    targetLabel: row.targetLabel,
    targetNotes: row.targetNotes,
    expanded: false,
  };
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-500/50";
const inputErrorClass =
  "w-full rounded-xl border border-red-500/40 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-red-400/60";

type FieldErrors = {
  starting?: string;
  target?: string;
};

type JournalAccountProgressInnerProps = {
  userId: string;
  supabase: NonNullable<ReturnType<typeof createClient>>;
  initialFromServer: AccountProgressFormState;
  closedTrades: Trade[];
  hasServerProfile: boolean;
  loadError: string | null;
  onRetryLoad: () => void;
  onLoadErrorDismiss: () => void;
};

function JournalAccountProgressInner({
  userId,
  supabase,
  initialFromServer,
  closedTrades,
  hasServerProfile,
  loadError,
  onRetryLoad,
  onLoadErrorDismiss,
}: JournalAccountProgressInnerProps) {
  const [form, setForm, resetFormDraft] = useSessionFormState<AccountProgressFormState>(
    `page:journal-account-progress:${userId}`,
    initialFromServer,
  );

  const { accountType, startingStr, targetStr, targetLabel, targetNotes, expanded } = form;

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const starting = useMemo(() => parseMoneyInput(startingStr), [startingStr]);
  const target = useMemo(() => parseMoneyInput(targetStr), [targetStr]);

  const totalNetPL = useMemo(
    () => totalNetPLFromClosedTrades(closedTrades),
    [closedTrades],
  );

  const goal = useMemo(
    () => computeGoalProgress(starting, target, totalNetPL),
    [starting, target, totalNetPL],
  );

  const orderedTrades = useMemo(
    () => sortTradesChronological(closedTrades),
    [closedTrades],
  );

  const streaks = useMemo(() => computeStreakStats(orderedTrades), [orderedTrades]);

  const milestoneAmounts = useMemo(
    () => buildSuggestedMilestones(starting, target, 5),
    [starting, target],
  );

  const milestoneRows = useMemo(
    () => labelMilestoneStates(milestoneAmounts, goal.currentBalance),
    [milestoneAmounts, goal.currentBalance],
  );

  const prevBestWinRef = useRef(0);
  const prevBalanceRef = useRef<number | null>(null);
  const [ephemeralFlags, setEphemeralFlags] = useState<{
    newBestWin: boolean;
    milestone: number | null;
  }>({ newBestWin: false, milestone: null });

  useEffect(() => {
    const prevBest = prevBestWinRef.current;
    const newBestWin = streaks.bestWinningStreak > prevBest && prevBest > 0;
    prevBestWinRef.current = Math.max(prevBest, streaks.bestWinningStreak);

    let milestone: number | null = null;
    const ms = buildSuggestedMilestones(starting, target, 5);
    if (prevBalanceRef.current != null && ms.length > 0) {
      for (const m of ms) {
        if (prevBalanceRef.current < m && goal.currentBalance >= m) {
          milestone = m;
          break;
        }
      }
    }
    prevBalanceRef.current = goal.currentBalance;

    setEphemeralFlags((prev) => {
      if (prev.newBestWin === newBestWin && prev.milestone === milestone) return prev;
      return { newBestWin, milestone };
    });
  }, [closedTrades, streaks.bestWinningStreak, goal.currentBalance, starting, target]);

  const alerts = useMemo(
    () =>
      buildAccountProgressAlerts(goal, streaks, {
        newBestWinningStreak: ephemeralFlags.newBestWin,
        milestoneJustReached: ephemeralFlags.milestone,
      }),
    [goal, streaks, ephemeralFlags],
  );

  const typeBadge = ACCOUNT_OPTIONS.find((o) => o.value === accountType)?.label ?? accountType;

  let statusBadge = "In progress";
  if (goal.targetAmount > 0 && goal.targetReached) {
    statusBadge = "Target hit";
  } else if (accountType === "demo") {
    statusBadge = "Demo tracking";
  }

  const activeHint = ACCOUNT_OPTIONS.find((o) => o.value === accountType)?.hint ?? "";

  const toTarget = toTargetCopy(goal);
  const progressPct = progressLabelText(goal);

  const hasPositiveStarting = starting > 0;
  const hasValidTargetBand =
    goal.targetAmount > 0 && goal.targetDistance > 0 && goal.targetAmount > goal.startingBalance;
  const setupCompleteEnoughForBar = hasPositiveStarting && hasValidTargetBand;

  const noTradesYet = closedTrades.length === 0;
  const streakHasData = streaks.bestWinningStreak > 0 || streaks.bestLosingStreak > 0;
  const streakNeutralEmpty =
    noTradesYet || (!streakHasData && streaks.currentKind === "neutral" && streaks.currentStreak === 0);

  function validateForm(): boolean {
    const next: FieldErrors = {};
    const startParsed = parseStrictPositiveMoney(startingStr);
    if (!startParsed.ok) {
      next.starting = "Enter a valid starting balance (a positive number).";
    }

    const targetParsed = parseTargetMoney(targetStr);
    if (!targetParsed.ok) {
      next.target = "Enter a valid target amount, or leave it blank until you are ready.";
    } else if (targetParsed.value > 0 && startParsed.ok) {
      if (accountType === "challenge" && targetParsed.value <= startParsed.value) {
        next.target = "Target amount must be higher than your starting balance for a challenge.";
      } else if (targetParsed.value > 0 && targetParsed.value <= startParsed.value) {
        next.target = "Set your target above your starting balance so progress can be measured.";
      }
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSuccessMessage(null);
    if (!validateForm()) return;

    const startParsed = parseStrictPositiveMoney(startingStr);
    const targetParsed = parseTargetMoney(targetStr);
    if (!startParsed.ok || !targetParsed.ok) return;

    setSaving(true);
    try {
      await saveAccountProgress(supabase, userId, {
        accountType,
        startingBalance: startParsed.value,
        currentBalance: goal.currentBalance,
        targetAmount: targetParsed.value,
        targetLabel,
        targetNotes,
      });
      const savedSnapshot: AccountProgressFormState = {
        accountType,
        startingStr: startParsed.value ? String(startParsed.value) : "",
        targetStr: targetParsed.value ? String(targetParsed.value) : "",
        targetLabel,
        targetNotes,
        expanded: false,
      };
      setForm(savedSnapshot);
      setFieldErrors({});
      try {
        sessionStorage.removeItem(sessionFormFullKey(`page:journal-account-progress:${userId}`));
      } catch {
        // ignore
      }
      setSuccessMessage(
        "Progress settings saved. Your starting balance, target, and labels are stored. Current balance and profit stay in sync with closed trades.",
      );
      window.setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err) {
      logError(err);
      setSaveError(
        "We could not save your progress right now. Check your connection and try again. If it keeps happening, confirm the `account_progress` table exists and RLS allows your user.",
      );
    } finally {
      setSaving(false);
    }
  }

  const streakTypeLabel =
    streaks.currentKind === "winning"
      ? "Winning"
      : streaks.currentKind === "losing"
        ? "Losing"
        : "Neutral";

  return (
    <section className="overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-br from-slate-950 via-slate-950 to-sky-950/30 shadow-[0_20px_70px_rgba(15,23,42,0.95)]">
      <div className="border-b border-white/10 bg-black/30 px-4 py-5 sm:px-6">
        {loadError ? (
          <div
            className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <p className="text-sm text-amber-100/95">{loadError}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onRetryLoad}
                className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/25"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={onLoadErrorDismiss}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-white/25"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {saveError ? (
          <div
            className="mb-4 rounded-xl border border-red-500/35 bg-red-950/40 px-3 py-3 text-sm text-red-100/95"
            role="alert"
          >
            {saveError}
          </div>
        ) : null}

        {successMessage ? (
          <div
            className="mb-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-100/95"
            role="status"
          >
            {successMessage}
          </div>
        ) : null}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400/90">
              Journal
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Funding &amp; goal progress
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Track progress toward a funding evaluation, payout, or personal balance goal.{" "}
              <span className="text-zinc-300">You set</span> starting balance and target;{" "}
              <span className="text-zinc-300">closed trades update</span> profit and current balance
              automatically. Milestones below are optional visual checkpoints only.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-200">
              {typeBadge}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                statusBadge === "Target hit"
                  ? "border border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                  : statusBadge === "Demo tracking"
                    ? "border border-violet-500/40 bg-violet-500/10 text-violet-200"
                    : "border border-sky-500/40 bg-sky-500/10 text-sky-200"
              }`}
            >
              {statusBadge}
            </span>
          </div>
        </div>

        <details className="group mt-4 rounded-xl border border-white/[0.08] bg-zinc-950/40 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
          <summary className="px-3 py-2.5 text-sm text-zinc-400 transition hover:text-zinc-200 sm:px-4">
            <span className="font-medium text-zinc-300">How it works</span>
            <span className="ml-2 text-xs text-zinc-600 group-open:hidden">— tap to expand</span>
          </summary>
          <ol className="space-y-2 border-t border-white/[0.06] px-3 pb-3 pt-2 text-sm leading-relaxed text-zinc-400 sm:px-4 sm:pb-4">
            <li className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-200">
                1
              </span>
              <span>
                Choose your <span className="text-zinc-300">account type</span> and enter{" "}
                <span className="text-zinc-300">starting balance</span> plus{" "}
                <span className="text-zinc-300">target amount</span> (and optional labels).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-200">
                2
              </span>
              <span>
                <span className="text-zinc-300">Journal closed trades</span> in Arden24 as you trade.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-200">
                3
              </span>
              <span>
                <span className="text-zinc-300">Profit</span>, <span className="text-zinc-300">current balance</span>
                , <span className="text-zinc-300">remaining to target</span>, and{" "}
                <span className="text-zinc-300">progress %</span> update here automatically — then save to keep your
                goal settings on this device.
              </span>
            </li>
          </ol>
        </details>

        {!hasServerProfile && !hasPositiveStarting ? (
          <div className="mt-4 rounded-xl border border-dashed border-sky-500/30 bg-sky-500/[0.06] px-4 py-4 sm:px-5">
            <p className="text-sm font-semibold text-sky-100/95">Set up your goal</p>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              Enter a <span className="text-zinc-300">starting balance</span> and{" "}
              <span className="text-zinc-300">target</span> below, then save. Example: start{" "}
              <span className="font-mono text-zinc-300">£50,000</span>, target{" "}
              <span className="font-mono text-zinc-300">£52,500</span> for a phase pass.
            </p>
          </div>
        ) : null}

        {hasPositiveStarting && noTradesYet ? (
          <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 sm:px-5">
            <p className="text-sm font-medium text-zinc-200">No closed trades yet</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">
              Profit and current balance will move automatically once you journal closed trades. Log your first
              outcome from the Dashboard or Open Trades to begin tracking.
            </p>
          </div>
        ) : null}

        {alerts.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={`max-w-full rounded-xl border px-3 py-2 text-xs font-medium leading-snug ${
                  a.tone === "success"
                    ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-100"
                    : a.tone === "warning"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                      : a.tone === "accent"
                        ? "border-sky-500/40 bg-sky-500/10 text-sky-100"
                        : "border-white/15 bg-white/5 text-zinc-200"
                }`}
              >
                {a.message}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Live from your journal
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-sky-500/25 bg-gradient-to-b from-sky-950/50 to-black/40 px-4 py-3 ring-1 ring-sky-500/10">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-sky-300/80">
                  Current balance
                </p>
                <span className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                  Auto
                </span>
              </div>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-white sm:text-[1.65rem]">
                {formatMoney(goal.currentBalance)}
              </p>
              <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
                Starting balance + net P/L from closed trades. Read-only — not typed in manually.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Profit so far
                </p>
                <span className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                  Auto
                </span>
              </div>
              <p
                className={`mt-1.5 text-2xl font-semibold tabular-nums sm:text-[1.65rem] ${
                  goal.totalNetPL >= 0 ? "text-sky-300" : "text-red-300"
                }`}
              >
                {formatMoney(goal.totalNetPL)}
              </p>
              <p className="mt-1.5 text-[11px] text-zinc-500">Realised P/L summed from closed trades.</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Remaining to target
                </p>
                <span className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                  Auto
                </span>
              </div>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-white sm:text-[1.65rem]">{toTarget.line}</p>
              <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">{toTarget.hint}</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 sm:col-span-2 lg:col-span-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Progress</p>
                <p className="text-lg font-semibold text-sky-300">{progressPct}</p>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-600 to-emerald-400 transition-[width] duration-500 ease-out"
                  style={{
                    width: `${setupCompleteEnoughForBar ? goal.progressBarFill * 100 : goal.targetReached ? 100 : 0}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
                {setupCompleteEnoughForBar
                  ? "Share of the path from starting balance to target."
                  : "Add a target above your starting balance to see a meaningful %."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-stretch">
          <div className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-3 sm:px-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Suggested checkpoints
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Optional evenly spaced balance markers from start → target. They are{" "}
              <span className="text-zinc-400">display only</span> (not saved as separate rows); colours show completed
              vs next vs upcoming.
            </p>
            {milestoneRows.length > 0 ? (
              <div
                className="mt-3 flex flex-wrap gap-1.5"
                role="list"
                aria-label="Suggested balance checkpoints, display only"
              >
                {milestoneRows.map((m) => (
                  <span
                    key={m.value}
                    role="listitem"
                    title={
                      m.state === "completed"
                        ? "Balance has reached this level"
                        : m.state === "current"
                          ? "Next checkpoint ahead"
                          : "Upcoming checkpoint"
                    }
                    className={`inline-flex cursor-default select-none items-center rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
                      m.state === "completed"
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
                        : m.state === "current"
                          ? "border-sky-500/50 bg-sky-500/15 text-sky-100"
                          : "border-white/10 bg-black/30 text-zinc-500"
                    }`}
                  >
                    {formatMoney(m.value)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-600">
                Enter a starting balance and a target above it to see suggested checkpoints here.
              </p>
            )}
          </div>

          <div className="shrink-0 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-3 lg:max-w-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Win / loss streaks</p>
            {streakNeutralEmpty ? (
              <div className="mt-2">
                <p className="text-sm text-zinc-500">
                  Streaks appear once you have wins or losses in a row (breakeven closes are skipped). Journal
                  qualifying closed trades to see your current run and bests.
                </p>
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm text-zinc-200">
                  <span className="font-semibold text-white">{streakTypeLabel}</span>
                  {streaks.currentStreak > 0 && streaks.currentKind !== "neutral"
                    ? ` · ${streaks.currentStreak} in a row`
                    : " · no active run"}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                  Best winning streak: <span className="text-zinc-300">{streaks.bestWinningStreak}</span> · Best
                  losing streak: <span className="text-zinc-300">{streaks.bestLosingStreak}</span>
                  <span className="mt-1 block text-zinc-600">Breakeven trades do not extend or break streaks.</span>
                </p>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, expanded: !f.expanded }))}
            className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium text-zinc-300 hover:border-sky-400/50 hover:text-white"
          >
            {expanded ? "Hide goal settings" : "Edit goal settings"}
          </button>
        </div>
      </div>

      {expanded && (
        <form onSubmit={handleSave} className="space-y-5 px-4 py-5 sm:px-6">
          <p className="text-xs text-zinc-500">
            Fields you type are saved when you press save. Balance and profit always follow your journal.
          </p>

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] text-zinc-600">
                Describes this goal — your choice, saved with the profile.
              </p>
              <AppSelect<AccountProgressType>
                label="Account type"
                value={accountType}
                onChange={(v) => setForm((f) => ({ ...f, accountType: v }))}
                options={ACCOUNT_TYPE_SELECT_OPTIONS}
              />
              <p className="mt-2 text-xs text-zinc-500">{activeHint}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">Starting balance</label>
                <p className="mb-2 text-[11px] text-zinc-600">You enter once (or when you change account). Required.</p>
                <input
                  type="text"
                  inputMode="decimal"
                  value={startingStr}
                  onChange={(e) => {
                    setFieldErrors((fe) => ({ ...fe, starting: undefined }));
                    setForm((f) => ({ ...f, startingStr: e.target.value }));
                  }}
                  placeholder="e.g. 50000"
                  className={fieldErrors.starting ? inputErrorClass : inputClass}
                  aria-invalid={Boolean(fieldErrors.starting)}
                  aria-describedby={fieldErrors.starting ? "starting-error" : undefined}
                />
                {fieldErrors.starting ? (
                  <p id="starting-error" className="mt-1.5 text-xs text-red-300/95">
                    {fieldErrors.starting}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">Target amount</label>
                <p className="mb-2 text-[11px] text-zinc-600">
                  You set the goal balance. For challenges it must sit above starting balance. Leave blank if you only
                  want P/L tracking for now.
                </p>
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetStr}
                  onChange={(e) => {
                    setFieldErrors((fe) => ({ ...fe, target: undefined }));
                    setForm((f) => ({ ...f, targetStr: e.target.value }));
                  }}
                  placeholder="e.g. 52500"
                  className={fieldErrors.target ? inputErrorClass : inputClass}
                  aria-invalid={Boolean(fieldErrors.target)}
                  aria-describedby={fieldErrors.target ? "target-error" : undefined}
                />
                {fieldErrors.target ? (
                  <p id="target-error" className="mt-1.5 text-xs text-red-300/95">
                    {fieldErrors.target}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">Goal label (optional)</label>
              <p className="mb-2 text-[11px] text-zinc-600">Shown next to milestones — e.g. phase name or payout step.</p>
              <input
                type="text"
                value={targetLabel}
                onChange={(e) => setForm((f) => ({ ...f, targetLabel: e.target.value }))}
                placeholder="e.g. Phase 1 pass, first payout"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">Notes (optional)</label>
              <p className="mb-2 text-[11px] text-zinc-600">Rules, drawdown reminders, or desk notes — saved with this goal.</p>
              <textarea
                value={targetNotes}
                onChange={(e) => setForm((f) => ({ ...f, targetNotes: e.target.value }))}
                placeholder="Drawdown limits, rules, reminders…"
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
            <button
              type="button"
              onClick={resetFormDraft}
              className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:border-sky-400/60 hover:text-sky-300"
            >
              Reset draft
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-sky-400 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save progress"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

type JournalAccountProgressProps = {
  closedTrades: Trade[];
};

export default function JournalAccountProgress({ closedTrades }: JournalAccountProgressProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const userId = user?.id;

  const [serverRow, setServerRow] = useState<AccountProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const row = await fetchAccountProgress(supabase, userId);
      setServerRow(row);
    } catch (e) {
      logError(e);
      setLoadError(
        "We couldn't load your funding settings. Check your connection and try again. If the problem continues, confirm the `account_progress` table exists and your account can read it.",
      );
      setServerRow(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const initialFromServer = useMemo(() => mapRowToFormState(serverRow), [serverRow]);

  if (!user) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.85)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400/80">Journal</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Funding &amp; goal progress</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Sign in to set a starting balance and target, then let closed trades update your balance automatically.
        </p>
      </section>
    );
  }

  if (!supabase) {
    return (
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
        <h2 className="text-lg font-semibold text-white">Funding &amp; goal progress</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Supabase is not configured. Add environment keys to enable saving progress.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-br from-slate-950 via-slate-950 to-sky-950/30 shadow-[0_20px_70px_rgba(15,23,42,0.95)]">
        <div className="border-b border-white/10 bg-black/30 px-4 py-5 sm:px-6">
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
          <div className="mt-3 h-7 w-64 max-w-full animate-pulse rounded bg-zinc-800" />
          <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-zinc-800/80" />
          <div className="mt-2 h-4 w-full max-w-lg animate-pulse rounded bg-zinc-800/60" />
          <p className="mt-4 text-sm text-zinc-500">Loading your goal settings…</p>
        </div>
        <div className="grid gap-3 px-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-900/80" />
          ))}
        </div>
      </section>
    );
  }

  const signedInUserId = user.id;

  return (
    <JournalAccountProgressInner
      key={signedInUserId}
      userId={signedInUserId}
      supabase={supabase}
      initialFromServer={initialFromServer}
      closedTrades={closedTrades}
      hasServerProfile={serverRow !== null}
      loadError={loadError}
      onRetryLoad={() => void load()}
      onLoadErrorDismiss={() => setLoadError(null)}
    />
  );
}
