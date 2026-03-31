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
import {
  sessionFormFullKey,
  useSessionFormState,
} from "@/lib/hooks/useSessionFormState";

const ACCOUNT_OPTIONS: { value: AccountProgressType; label: string; hint: string }[] = [
  { value: "challenge", label: "Challenge", hint: "Track balance needed to pass the evaluation." },
  { value: "passed", label: "Passed", hint: "Milestone after passing — next phase or verification goal." },
  { value: "funded", label: "Funded", hint: "Payout or growth milestone on a live funded account." },
  { value: "personal_live", label: "Personal live", hint: "Personal capital growth goal." },
  { value: "demo", label: "Demo", hint: "Practice goal or consistency milestone." },
];

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

function toTargetCopy(g: GoalProgressMath): { line: string; hint: string } {
  if (g.targetAmount <= 0) {
    return { line: "—", hint: "Set a target amount to track distance." };
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
    hint: "Remaining to reach target balance",
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
    expanded: true,
  };
}

type JournalAccountProgressInnerProps = {
  userId: string;
  supabase: NonNullable<ReturnType<typeof createClient>>;
  initialFromServer: AccountProgressFormState;
  closedTrades: Trade[];
};

function JournalAccountProgressInner({
  userId,
  supabase,
  initialFromServer,
  closedTrades,
}: JournalAccountProgressInnerProps) {
  const [form, setForm, resetFormDraft] = useSessionFormState<AccountProgressFormState>(
    `page:journal-account-progress:${userId}`,
    initialFromServer
  );

  const { accountType, startingStr, targetStr, targetLabel, targetNotes, expanded } = form;

  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  const starting = useMemo(() => parseMoneyInput(startingStr), [startingStr]);
  const target = useMemo(() => parseMoneyInput(targetStr), [targetStr]);

  const totalNetPL = useMemo(
    () => totalNetPLFromClosedTrades(closedTrades),
    [closedTrades]
  );

  const goal = useMemo(
    () => computeGoalProgress(starting, target, totalNetPL),
    [starting, target, totalNetPL]
  );

  const orderedTrades = useMemo(
    () => sortTradesChronological(closedTrades),
    [closedTrades]
  );

  const streaks = useMemo(() => computeStreakStats(orderedTrades), [orderedTrades]);

  const milestoneAmounts = useMemo(
    () => buildSuggestedMilestones(starting, target, 5),
    [starting, target]
  );

  const milestoneRows = useMemo(
    () => labelMilestoneStates(milestoneAmounts, goal.currentBalance),
    [milestoneAmounts, goal.currentBalance]
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
    [goal, streaks, ephemeralFlags]
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedHint(null);
    try {
      await saveAccountProgress(supabase, userId, {
        accountType,
        startingBalance: starting,
        currentBalance: goal.currentBalance,
        targetAmount: target,
        targetLabel,
        targetNotes,
      });
      const savedSnapshot: AccountProgressFormState = {
        accountType,
        startingStr: starting ? String(starting) : "",
        targetStr: target ? String(target) : "",
        targetLabel,
        targetNotes,
        expanded,
      };
      setForm(savedSnapshot);
      try {
        sessionStorage.removeItem(sessionFormFullKey(`page:journal-account-progress:${userId}`));
      } catch {
        // ignore
      }
      setSavedHint("Saved");
      setTimeout(() => setSavedHint(null), 2500);
    } catch (err) {
      logError(err);
      alert(
        "Could not save account progress. Check Supabase table `account_progress` exists and RLS allows your user."
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
      <div className="border-b border-white/10 bg-black/30 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400/90">
              Journal · Funding
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">Account progress</h2>
            <p className="mt-1 max-w-xl text-sm text-zinc-400">
              Balances and P/L update from your closed trades. Edit starting balance, target, and
              labels below — current balance stays in sync automatically.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, expanded: !f.expanded }))}
              className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-zinc-300 hover:border-sky-400/50 hover:text-white"
            >
              {expanded ? "Collapse" : "Edit details"}
            </button>
          </div>
        </div>

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

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Profit so far
            </p>
            <p
              className={`mt-1 text-lg font-semibold ${
                goal.totalNetPL >= 0 ? "text-sky-300" : "text-red-300"
              }`}
            >
              {formatMoney(goal.totalNetPL)}
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">Realised from closed trades</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Current balance
              </p>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-200/90">
                Auto-updated from trades
              </span>
            </div>
            <p className="mt-1 text-lg font-semibold text-white">{formatMoney(goal.currentBalance)}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
              Starting {formatMoney(starting)} + net P/L. Not editable — follows your journal.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">To target</p>
            <p className="mt-1 text-lg font-semibold text-white">{toTarget.line}</p>
            <p className="mt-1 text-[10px] text-zinc-500">{toTarget.hint}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Progress</p>
              <p className="text-sm font-semibold text-sky-300">{progressPct}</p>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-600 to-emerald-400 transition-[width] duration-500 ease-out"
                style={{ width: `${goal.targetAmount > 0 && goal.targetDistance > 0 ? goal.progressBarFill * 100 : goal.targetReached ? 100 : 0}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-zinc-500">
              Toward target from starting balance · bar capped at 100%
              {goal.targetDistance <= 0 && goal.targetAmount > 0
                ? " (set target above starting balance for a meaningful range)"
                : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          {milestoneRows.length > 0 && (
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Milestones
                {targetLabel.trim() ? (
                  <span className="ml-2 font-normal normal-case text-zinc-600">
                    · toward “{targetLabel.trim()}”
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-[10px] text-zinc-600">
                Suggested checkpoints from start → target (not saved separately).
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {milestoneRows.map((m) => (
                  <span
                    key={m.value}
                    title={
                      m.state === "completed"
                        ? "Completed"
                        : m.state === "current"
                          ? "Next checkpoint"
                          : "Locked"
                    }
                    className={`inline-flex items-center rounded-lg border px-2 py-1 text-[11px] font-medium ${
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
            </div>
          )}

          <div className="shrink-0 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 lg:max-w-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Streaks
            </p>
            <p className="mt-1 text-xs text-zinc-200">
              <span className="font-semibold text-white">{streakTypeLabel}</span>
              {streaks.currentStreak > 0 && streaks.currentKind !== "neutral"
                ? ` · ${streaks.currentStreak} in a row`
                : " · no active run"}
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">
              Best win {streaks.bestWinningStreak} · Best loss {streaks.bestLosingStreak}
              <span className="mt-0.5 block text-zinc-600">
                Breakeven trades are skipped in streak counts.
              </span>
            </p>
          </div>
        </div>

        {closedTrades.length === 0 && (
          <p className="mt-3 text-xs text-zinc-500">
            No closed trades in your journal yet — net P/L is £0 until you record outcomes from live
            trades or add closed trades.
          </p>
        )}
      </div>

      {expanded && (
        <form onSubmit={handleSave} className="space-y-5 px-4 py-5 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400">Account type</label>
              <select
                value={accountType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accountType: e.target.value as AccountProgressType }))
                }
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/50"
              >
                {ACCOUNT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-zinc-500">{activeHint}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">Starting balance</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={startingStr}
                  onChange={(e) => setForm((f) => ({ ...f, startingStr: e.target.value }))}
                  placeholder="50000"
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-sky-500/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">Target amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetStr}
                  onChange={(e) => setForm((f) => ({ ...f, targetStr: e.target.value }))}
                  placeholder="52000"
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-sky-500/50"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3">
            <p className="text-xs font-medium text-zinc-300">Current balance (read-only)</p>
            <p className="mt-1 text-lg font-semibold text-white">{formatMoney(goal.currentBalance)}</p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Auto-updated from trades. Saved to your profile as the computed value when you click Save
              progress.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400">Target / milestone name</label>
              <input
                type="text"
                value={targetLabel}
                onChange={(e) => setForm((f) => ({ ...f, targetLabel: e.target.value }))}
                placeholder="e.g. Phase 1 pass, 4% growth, first payout"
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-sky-500/50"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-400">Notes (optional)</label>
              <textarea
                value={targetNotes}
                onChange={(e) => setForm((f) => ({ ...f, targetNotes: e.target.value }))}
                placeholder="Rules, drawdown limits, or reminders…"
                rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-sky-500/50"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
            {savedHint && <span className="text-sm text-emerald-400">{savedHint}</span>}
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

  const load = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await fetchAccountProgress(supabase, userId);
      setServerRow(row);
    } catch (e) {
      logError(e);
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
        <h2 className="text-lg font-semibold text-white">Account progress</h2>
        <p className="mt-2 text-sm text-zinc-500">Sign in to track funding targets and milestones here.</p>
      </section>
    );
  }

  if (!supabase) {
    return (
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
        <h2 className="text-lg font-semibold text-white">Account progress</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Supabase is not configured. Add environment keys to enable saving progress.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-br from-slate-950 via-slate-950 to-sky-950/30 shadow-[0_20px_70px_rgba(15,23,42,0.95)]">
        <div className="border-b border-white/10 bg-black/30 px-4 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-white">Account progress</h2>
          <p className="mt-2 text-sm text-zinc-500">Loading your settings…</p>
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
    />
  );
}
