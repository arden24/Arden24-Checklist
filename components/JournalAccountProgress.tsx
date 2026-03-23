"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  type AccountProgress,
  type AccountProgressType,
  fetchAccountProgress,
  saveAccountProgress,
} from "@/lib/supabase/account-progress";
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

type Metrics = {
  profitSoFar: number;
  remaining: number;
  progressPercent: number;
  statusBadge: string;
  typeBadge: string;
};

function computeMetrics(
  type: AccountProgressType,
  starting: number,
  current: number,
  target: number
): Metrics {
  const profitSoFar = current - starting;
  const remaining = Math.max(0, target - current);
  const span = target - starting;

  let progressPercent = 0;
  if (span > 0) {
    progressPercent = Math.round(Math.min(100, Math.max(0, ((current - starting) / span) * 100)));
  } else if (target > 0 && current >= target) {
    progressPercent = 100;
  }

  const typeBadge = ACCOUNT_OPTIONS.find((o) => o.value === type)?.label ?? type;

  let statusBadge = "In progress";
  if (target > 0 && current >= target) {
    statusBadge = "Target hit";
  } else if (type === "demo") {
    statusBadge = "Demo tracking";
  }

  return { profitSoFar, remaining, progressPercent, statusBadge, typeBadge };
}

type AccountProgressFormState = {
  accountType: AccountProgressType;
  startingStr: string;
  currentStr: string;
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
      currentStr: "",
      targetStr: "",
      targetLabel: "",
      targetNotes: "",
      expanded: true,
    };
  }
  return {
    accountType: row.accountType,
    startingStr: row.startingBalance ? String(row.startingBalance) : "",
    currentStr: row.currentBalance ? String(row.currentBalance) : "",
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
};

function JournalAccountProgressInner({
  userId,
  supabase,
  initialFromServer,
}: JournalAccountProgressInnerProps) {
  const [form, setForm, resetFormDraft] = useSessionFormState<AccountProgressFormState>(
    `page:journal-account-progress:${userId}`,
    initialFromServer
  );

  const {
    accountType,
    startingStr,
    currentStr,
    targetStr,
    targetLabel,
    targetNotes,
    expanded,
  } = form;

  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  const starting = useMemo(() => parseMoneyInput(startingStr), [startingStr]);
  const current = useMemo(() => parseMoneyInput(currentStr), [currentStr]);
  const target = useMemo(() => parseMoneyInput(targetStr), [targetStr]);

  const metrics = useMemo(
    () => computeMetrics(accountType, starting, current, target),
    [accountType, starting, current, target]
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedHint(null);
    try {
      await saveAccountProgress(supabase, userId, {
        accountType,
        startingBalance: starting,
        currentBalance: current,
        targetAmount: target,
        targetLabel,
        targetNotes,
      });
      const savedSnapshot: AccountProgressFormState = {
        accountType,
        startingStr: starting ? String(starting) : "",
        currentStr: current ? String(current) : "",
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
      alert("Could not save account progress. Check Supabase table `account_progress` exists and RLS allows your user.");
    } finally {
      setSaving(false);
    }
  }

  const activeHint = ACCOUNT_OPTIONS.find((o) => o.value === accountType)?.hint ?? "";

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
              Set your account type, balances, and target — stay aligned with your pass or growth plan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-200">
              {metrics.typeBadge}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                metrics.statusBadge === "Target hit"
                  ? "border border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                  : metrics.statusBadge === "Demo tracking"
                    ? "border border-violet-500/40 bg-violet-500/10 text-violet-200"
                    : "border border-sky-500/40 bg-sky-500/10 text-sky-200"
              }`}
            >
              {metrics.statusBadge}
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

        {/* Metrics strip */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Profit so far</p>
            <p
              className={`mt-1 text-lg font-semibold ${
                metrics.profitSoFar >= 0 ? "text-sky-300" : "text-red-300"
              }`}
            >
              {formatMoney(metrics.profitSoFar)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">To target</p>
            <p className="mt-1 text-lg font-semibold text-white">{formatMoney(metrics.remaining)}</p>
            <p className="text-[10px] text-zinc-500">Remaining to reach target balance</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Progress</p>
              <p className="text-sm font-semibold text-sky-300">{metrics.progressPercent}%</p>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-600 to-emerald-400 transition-[width] duration-500 ease-out"
                style={{ width: `${metrics.progressPercent}%` }}
              />
            </div>
          </div>
        </div>
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
            <div className="grid gap-3 sm:grid-cols-3">
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
                <label className="mb-2 block text-xs font-medium text-zinc-400">Current balance</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={currentStr}
                  onChange={(e) => setForm((f) => ({ ...f, currentStr: e.target.value }))}
                  placeholder="51200"
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

export default function JournalAccountProgress() {
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
    />
  );
}
