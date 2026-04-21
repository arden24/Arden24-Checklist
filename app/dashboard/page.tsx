"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import TradeForm from "@/components/trade-form";
import SummaryCard from "@/components/SummaryCard";
import { PanelSkeleton } from "@/components/PanelSkeleton";

const LotSizeCalculator = dynamic(() => import("@/components/lot-size-calculator"), {
  loading: () => <PanelSkeleton lines={5} />,
});

const JournalList = dynamic(() => import("@/components/JournalList"), {
  loading: () => <PanelSkeleton lines={8} />,
});

const PerformanceChart = dynamic(() => import("@/components/PerformanceChart"), {
  loading: () => <PanelSkeleton lines={3} minHeight="min-h-[16rem]" />,
});
import { useAuth } from "@/contexts/AuthContext";
import { loadTrades, loadOpenTrades, type OpenTrade } from "@/lib/journal";
import { getStrategiesKey, getBestStrategyImageKey, getTradesKey, getOpenTradesKey } from "@/lib/storage-keys";
import { createClient } from "@/lib/supabase/client";
import { fetchTrades } from "@/lib/supabase/trades";
import { fetchOpenTrades } from "@/lib/supabase/open-trades";
import type { Trade } from "@/lib/supabase/trades";
import { logError } from "@/lib/log-error";
import { ARDEN24_TRADES_UPDATED_EVENT } from "@/lib/trades-updated";
import { canonicalRealisedPnl, tradeOutcomeKind } from "@/lib/realised-pnl";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TextConfirmDialog } from "@/components/TextConfirmDialog";
import { useAppToast } from "@/contexts/AppToastContext";
import FeatureLockCard from "@/components/subscriptions/FeatureLockCard";
import { hasPlanAccess } from "@/lib/subscriptions/access";
import { useActivePlan } from "@/lib/subscriptions/use-active-plan";
import { canUseProAdvancedStats } from "@/lib/subscriptions/tier-gates";

type ResetWizardStep = "idle" | "step1" | "step2" | "step3";

const MONTH_ABBREV = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? "+" : "";
  return `£${sign}${pnl.toFixed(2)}`;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const month = MONTH_ABBREV[(m ?? 1) - 1] ?? "";
  return `${d ?? 0} ${month} ${y ?? ""}`;
}

function computeStats(closedTrades: Trade[], openTradesCount: number) {
  const total = closedTrades.length;
  const wins = closedTrades.filter((t) => tradeOutcomeKind(t) === "win").length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;
  const netPnl = closedTrades.reduce((s, t) => s + canonicalRealisedPnl(t), 0);
  const netPnlStr = formatPnl(netPnl);

  const byDate: Record<string, number> = {};
  closedTrades.forEach((t) => {
    byDate[t.date] = (byDate[t.date] ?? 0) + canonicalRealisedPnl(t);
  });
  const dates = Object.entries(byDate);
  const bestDay = dates.length
    ? dates.reduce((a, b) => (a[1] > b[1] ? a : b))
    : null;
  const worstDay = dates.length
    ? dates.reduce((a, b) => (a[1] < b[1] ? a : b))
    : null;

  const byAsset: Record<string, { pnl: number; count: number }> = {};
  closedTrades.forEach((t) => {
    const key = t.pair?.trim() || "—";
    if (!byAsset[key]) byAsset[key] = { pnl: 0, count: 0 };
    byAsset[key].pnl += canonicalRealisedPnl(t);
    byAsset[key].count += 1;
  });
  const bestTradedAsset = Object.entries(byAsset).length
    ? Object.entries(byAsset).reduce((a, b) => (a[1].pnl > b[1].pnl ? a : b))
    : null;

  const byMarket: Record<string, number> = {};
  closedTrades.forEach((t) => {
    const m = t.market?.trim() || "—";
    byMarket[m] = (byMarket[m] ?? 0) + 1;
  });
  const mostTradedMarket = Object.entries(byMarket).length
    ? Object.entries(byMarket).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
    : "—";

  return {
    total,
    openTradesCount,
    winRate,
    netPnlStr,
    bestDay: bestDay ? { date: bestDay[0], pnl: bestDay[1] } : null,
    worstDay: worstDay ? { date: worstDay[0], pnl: worstDay[1] } : null,
    bestTradedAsset: bestTradedAsset ? { name: bestTradedAsset[0], pnl: bestTradedAsset[1].pnl } : null,
    mostTradedMarket,
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { pushToast } = useAppToast();
  const supabase = useMemo(() => createClient(), []);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [openTradesList, setOpenTradesList] = useState<OpenTrade[]>([]);
  const [openTradesCount, setOpenTradesCount] = useState(0);
  const [tradesReady, setTradesReady] = useState(false);
  const tradesLoadSeq = useRef(0);
  const [isResetting, setIsResetting] = useState(false);
  const [resetWizard, setResetWizard] = useState<ResetWizardStep>("idle");
  const { plan: userPlan, loading: planLoaded } = useActivePlan();

  const loadTradesData = useCallback(async () => {
    const seq = ++tradesLoadSeq.current;
    const applyIfCurrent = () => seq === tradesLoadSeq.current;

    if (supabase && user) {
      try {
        const [closed, open] = await Promise.all([
          fetchTrades(supabase),
          fetchOpenTrades(supabase),
        ]);
        if (!applyIfCurrent()) return;
        setClosedTrades(closed);
        setOpenTradesList(open);
        setOpenTradesCount(open.length);
      } catch (e) {
        logError(e);
        if (!applyIfCurrent()) return;
        setClosedTrades([]);
        setOpenTradesList([]);
        setOpenTradesCount(0);
      } finally {
        if (applyIfCurrent()) setTradesReady(true);
      }
    } else {
      const open = loadOpenTrades(user?.id);
      if (!applyIfCurrent()) return;
      setClosedTrades(loadTrades(user?.id) as Trade[]);
      setOpenTradesList(open);
      setOpenTradesCount(open.length);
      setTradesReady(true);
    }
  }, [supabase, user]);

  useEffect(() => {
    void loadTradesData();
  }, [loadTradesData]);

  const prevUserIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevUserIdRef.current;
    prevUserIdRef.current = user?.id;
    if (prev !== undefined && prev !== user?.id) {
      setTradesReady(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const onUpdated = () => {
      void loadTradesData();
    };
    window.addEventListener(ARDEN24_TRADES_UPDATED_EVENT, onUpdated);
    return () => {
      window.removeEventListener(ARDEN24_TRADES_UPDATED_EVENT, onUpdated);
    };
  }, [loadTradesData]);

  async function executeResetAllDataConfirmed() {
    setIsResetting(true);
    try {
      if (supabase && user) {
        await supabase.from("strategies").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("trades").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("open_trades").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }
      if (typeof window !== "undefined") {
        const keys = [
          getStrategiesKey(user?.id),
          getStrategiesKey(null),
          getTradesKey(user?.id),
          getTradesKey(null),
          getOpenTradesKey(user?.id),
          getOpenTradesKey(null),
          getBestStrategyImageKey(user?.id),
          getBestStrategyImageKey(null),
        ];
        keys.forEach((key) => window.localStorage.removeItem(key));
      }
      void loadTradesData();
      pushToast("All data has been reset. Reloading the page…", "success");
      window.location.reload();
    } catch (err) {
      logError(err);
      pushToast("Something went wrong while resetting. Please try again.", "error");
    } finally {
      setIsResetting(false);
    }
  }

  const stats = useMemo(
    () => computeStats(closedTrades, openTradesCount),
    [closedTrades, openTradesCount]
  );
  const canUsePerformance = hasPlanAccess(userPlan, "pro");
  const canUseAdvStats = canUseProAdvancedStats(userPlan);

  return (
    <main className="min-h-screen w-full max-w-full min-w-0 overflow-x-hidden bg-slate-950 py-6 text-white sm:py-8">
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold break-words sm:text-4xl">Trading Dashboard</h1>
          <p className="mt-3 max-w-prose text-zinc-400">
            Log trades, review performance, size positions, and stay
            disciplined with your strategy.
          </p>
        </div>

        <section id="dashboard-summary" className="min-w-0">
          <div className="grid min-w-0 gap-4 *:min-w-0 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Total Trades" value={String(stats.total)} subtitle="Closed trades" />
            <SummaryCard title="Live Trades" value={String(stats.openTradesCount)} subtitle="Currently open positions" />
            <SummaryCard title="Net P/L" value={stats.netPnlStr} subtitle="Total from closed trades" />
            <SummaryCard title="Win Rate" value={`${stats.winRate}%`} subtitle="Profitable closed trades" />
          </div>
          {!planLoaded ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-zinc-400">
              Loading stats…
            </div>
          ) : canUseAdvStats ? (
            <div className="mt-4 grid min-w-0 gap-4 *:min-w-0 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Best Day"
                value={stats.bestDay ? formatPnl(stats.bestDay.pnl) : "—"}
                subtitle={stats.bestDay ? formatDateLabel(stats.bestDay.date) : "No closed trades yet"}
              />
              <SummaryCard
                title="Worst Day"
                value={stats.worstDay ? formatPnl(stats.worstDay.pnl) : "—"}
                subtitle={stats.worstDay ? formatDateLabel(stats.worstDay.date) : "No data yet"}
              />
              <SummaryCard
                title="Best Traded Asset"
                value={stats.bestTradedAsset ? stats.bestTradedAsset.name : "—"}
                subtitle={stats.bestTradedAsset ? formatPnl(stats.bestTradedAsset.pnl) : "No closed trades yet"}
              />
              <SummaryCard
                title="Most Traded Market"
                value={stats.mostTradedMarket}
                subtitle="By trade count"
              />
            </div>
          ) : (
            <div className="mt-4">
              <FeatureLockCard
                requiredPlan="pro"
                title="Advanced dashboard stats"
                description="See best / worst days, strongest assets, and busiest markets from your own closed trades."
              />
            </div>
          )}
        </section>

        <section id="dashboard-trades" className="space-y-4">
          <JournalList trades={closedTrades} dataReady={tradesReady} />
        </section>

        <section id="dashboard-calculator" className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)]">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Lot Size Calculator</h2>
              <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Risk
              </span>
            </div>
            <div className="mt-3">
              <LotSizeCalculator />
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Log trade</h2>
              <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Journal
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Complete your sizing, then record the trade details here. It will appear in Live Trades and flow into your stats when closed.
            </p>
            <div className="mt-3">
              <TradeForm />
            </div>
          </div>
        </section>

        <section id="dashboard-performance" className="min-w-0 space-y-4">
          <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Performance</h2>
              <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Overview
              </span>
            </div>
            <div className="mt-4 min-h-[280px]">
              {!planLoaded ? (
                <PanelSkeleton lines={3} minHeight="min-h-[16rem]" />
              ) : canUsePerformance ? (
                <PerformanceChart
                  useParentTrades
                  closedTrades={closedTrades}
                  openTrades={openTradesList}
                  dataReady={tradesReady}
                />
              ) : (
                <FeatureLockCard
                  requiredPlan="pro"
                  title="Performance analytics"
                  description="Unlock detailed performance charts and trend visibility."
                />
              )}
            </div>
          </div>
        </section>

        <section
          id="dashboard-reset"
          className="min-w-0 rounded-2xl border border-red-500/20 bg-red-500/5 p-5"
        >
          <h2 className="text-sm font-semibold text-zinc-200">Reset account data</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Permanently delete all your strategies, closed trades, open trades, and reset stats to zero. You will be asked to confirm twice.
          </p>
          <button
            type="button"
            onClick={() => setResetWizard("step1")}
            disabled={isResetting}
            className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
          >
            {isResetting ? "Resetting…" : "Reset all data"}
          </button>
        </section>

        <p className="min-w-0 pt-2 text-[11px] leading-relaxed text-zinc-500 break-words">
          This app is designed for trading discipline, journaling and
          self-review. Arden24 is a product of Arden Ventures Ltd. Not financial advice.
        </p>
      </div>

      <ConfirmDialog
        open={resetWizard === "step1"}
        onClose={() => !isResetting && setResetWizard("idle")}
        title="Reset all account data?"
        description={
          "This will permanently delete:\n• All your strategies\n• All closed trades (journal)\n• All open trades\n• Your best strategy image\n\nYour stats will return to zero. This cannot be undone."
        }
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        isLoading={isResetting}
        onConfirm={() => setResetWizard("step2")}
      />
      <ConfirmDialog
        open={resetWizard === "step2"}
        onClose={() => !isResetting && setResetWizard("idle")}
        title="Are you absolutely sure?"
        description="You will need to type RESET in the next step to proceed. This permanently removes your stored trading data in Arden24."
        confirmLabel="I understand — continue"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        isLoading={isResetting}
        onConfirm={() => setResetWizard("step3")}
      />
      <TextConfirmDialog
        open={resetWizard === "step3"}
        onClose={() => !isResetting && setResetWizard("idle")}
        title="Final confirmation"
        description="Type RESET in capital letters exactly. Anything else cancels this reset."
        inputLabel="Type RESET to confirm"
        placeholder="RESET"
        expectedValue="RESET"
        mismatchMessage="That does not match. Enter RESET in capitals, or cancel."
        confirmLabel="Erase all my data"
        cancelLabel="Cancel"
        onConfirmed={() => {
          setResetWizard("idle");
          void executeResetAllDataConfirmed();
        }}
      />
    </main>
  );
}