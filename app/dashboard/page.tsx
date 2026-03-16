"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import LotSizeCalculator from "@/components/lot-size-calculator";
import TradeForm from "@/components/trade-form";
import StrategyCard from "@/components/strategy-card";
import SummaryCard from "@/components/SummaryCard";
import JournalList from "@/components/JournalList";
import PerformanceChart from "@/components/PerformanceChart";
import StrategyChecklist from "@/components/StrategyChecklist";
import ImageUploader from "@/components/ImageUploader";
import PerformanceInsights from "@/components/PerformanceInsights";
import { useAuth } from "@/contexts/AuthContext";
import { loadTrades } from "@/lib/journal";
import { getStrategiesKey, getBestStrategyImageKey, getTradesKey, getOpenTradesKey } from "@/lib/storage-keys";
import { createClient } from "@/lib/supabase/client";
import { fetchStrategies, type Strategy, type ChecklistItem } from "@/lib/supabase/strategies";
import { fetchTrades } from "@/lib/supabase/trades";
import { fetchOpenTrades } from "@/lib/supabase/open-trades";
import type { Trade } from "@/lib/supabase/trades";
import { loadOpenTrades } from "@/lib/journal";
import { logError } from "@/lib/log-error";

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
  const wins = closedTrades.filter((t) => t.result === "win" || t.pnl > 0).length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;
  const netPnl = closedTrades.reduce((s, t) => s + t.pnl, 0);
  const netPnlStr = formatPnl(netPnl);

  const byDate: Record<string, number> = {};
  closedTrades.forEach((t) => {
    byDate[t.date] = (byDate[t.date] ?? 0) + t.pnl;
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
    byAsset[key].pnl += t.pnl;
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
  const supabase = createClient();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [openTradesCount, setOpenTradesCount] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

  const loadTradesData = useCallback(() => {
    if (supabase && user) {
      fetchTrades(supabase).then(setClosedTrades).catch(logError);
      fetchOpenTrades(supabase).then((list) => setOpenTradesCount(list.length)).catch(logError);
    } else {
      setClosedTrades(loadTrades(user?.id) as Trade[]);
      setOpenTradesCount(loadOpenTrades(user?.id).length);
    }
  }, [supabase, user]);

  useEffect(() => {
    loadTradesData();
  }, [loadTradesData]);

  const loadStrategies = useCallback(() => {
    if (supabase && user) {
      fetchStrategies(supabase).then(setStrategies).catch(logError);
    } else if (typeof window !== "undefined") {
      const key = getStrategiesKey(user?.id);
      try {
        const raw = window.localStorage.getItem(key);
        const parsed = raw ? (JSON.parse(raw) as Strategy[]) : [];
        setStrategies(Array.isArray(parsed) ? parsed : []);
      } catch {
        setStrategies([]);
      }
    }
  }, [supabase, user]);

  useEffect(() => {
    loadStrategies();
  }, [loadStrategies]);

  async function handleResetAllData() {
    const firstConfirm = window.confirm(
      "Reset all account data?\n\nThis will permanently delete:\n• All your strategies\n• All closed trades (journal)\n• All open trades\n• Your best strategy image\n\nYour stats will return to zero. This cannot be undone."
    );
    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      "Are you absolutely sure? You will need to type RESET in the next step to proceed."
    );
    if (!secondConfirm) return;

    const typed = window.prompt(
      "Type RESET (in capital letters) to confirm. Anything else will cancel."
    );
    if (typed !== "RESET") {
      if (typed !== null) alert("Reset cancelled. You did not type RESET correctly.");
      return;
    }

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
      loadTradesData();
      loadStrategies();
      alert("All data has been reset. Your account is back to zero. The page will reload.");
      window.location.reload();
    } catch (err) {
      logError(err);
      alert("Something went wrong while resetting. Please try again.");
    } finally {
      setIsResetting(false);
    }
  }

  const stats = useMemo(
    () => computeStats(closedTrades, openTradesCount),
    [closedTrades, openTradesCount]
  );

  function normaliseChecklistItems(strategy: Strategy): ChecklistItem[] {
    return (strategy.checklist ?? []).map((item: any) =>
      typeof item === "string"
        ? { text: item, timeframe: "", image: undefined }
        : {
            text: item.text ?? "",
            timeframe: item.timeframe ?? "",
            image: item.image,
          }
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Trading Dashboard</h1>
          <p className="mt-3 text-zinc-400">
            Log trades, review performance, size positions, and stay
            disciplined with your strategy.
          </p>
        </div>

        <section id="dashboard-summary">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Total Trades" value={String(stats.total)} subtitle="Closed trades" />
            <SummaryCard title="Live Trades" value={String(stats.openTradesCount)} subtitle="Currently open positions" />
            <SummaryCard title="Net P/L" value={stats.netPnlStr} subtitle="Total from closed trades" />
            <SummaryCard title="Win Rate" value={`${stats.winRate}%`} subtitle="Profitable closed trades" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              title="Best Day"
              value={stats.bestDay ? formatPnl(stats.bestDay.pnl) : "—"}
              subtitle={stats.bestDay ? formatDateLabel(stats.bestDay.date) : "No data yet"}
            />
            <SummaryCard
              title="Worst Day"
              value={stats.worstDay ? formatPnl(stats.worstDay.pnl) : "—"}
              subtitle={stats.worstDay ? formatDateLabel(stats.worstDay.date) : "No data yet"}
            />
            <SummaryCard
              title="Best Traded Asset"
              value={stats.bestTradedAsset ? stats.bestTradedAsset.name : "—"}
              subtitle={stats.bestTradedAsset ? formatPnl(stats.bestTradedAsset.pnl) : "No data yet"}
            />
            <SummaryCard
              title="Most Traded Market"
              value={stats.mostTradedMarket}
              subtitle="By trade count"
            />
          </div>
        </section>

        <section id="dashboard-trades" className="space-y-4">
          <JournalList />
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

          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
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

        <section id="dashboard-performance" className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Performance</h2>
              <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Overview
              </span>
            </div>
            <div className="mt-4 min-h-[280px]">
              <PerformanceChart />
            </div>
          </div>
        </section>

        <section
          id="dashboard-strategies"
          className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,0.9fr)]"
        >
          <div className="space-y-4 rounded-2xl border border-sky-500/30 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Best Strategy</h2>
              <span className="text-[10px] uppercase tracking-[0.16em] text-sky-400">
                Focus
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Pin the setup you want to focus on right now. Upload a chart
              screenshot as a visual anchor.
            </p>
            <div className="mt-3">
              <ImageUploader storageKey={getBestStrategyImageKey(user?.id)} />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Current Strategy</h2>
              <Link
                href="/strategies"
                className="text-[11px] font-medium text-sky-400 hover:text-sky-300"
              >
                Open builder
              </Link>
            </div>
            <div className="rounded-xl bg-black/40 p-3 text-sm text-zinc-100">
              <p className="font-semibold">London Reversal</p>
              <p className="mt-1 text-xs text-zinc-400">
                Forex · Timeframes: 1H, 15M, 5M
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-slate-950/80 p-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                    Win Rate
                  </p>
                  <p className="mt-1 text-sm font-semibold text-sky-400">0%</p>
                </div>
                <div className="rounded-lg bg-slate-950/80 p-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                    Avg. R:R
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">0.0:1</p>
                </div>
                <div className="rounded-lg bg-slate-950/80 p-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                    Trades
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">0</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-zinc-400">
              <p>
                Link this to one of your saved strategies in the builder once
                you have real stats.
              </p>
              <Link
                href="/strategies/new"
                className="inline-flex text-[11px] font-medium text-sky-400 hover:text-sky-300"
              >
                Create new strategy →
              </Link>
            </div>

                {strategies.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-300">
                  Saved strategies
                </p>
                <div className="space-y-2">
                    {strategies.slice(0, 2).map((strategy) => (
                      <StrategyCard key={strategy.id} strategy={strategy} />
                    ))}
                  {strategies.length > 2 && (
                    <Link
                      href="/strategies"
                      className="block text-[11px] font-medium text-sky-400 hover:text-sky-300"
                    >
                      View all {strategies.length} strategies →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          <StrategyChecklist
            items={[
              "Breakout level confirmed",
              "Retest of level",
              "Strong momentum in direction of trade",
              "Higher time frame bias aligned",
            ]}
          />
        </section>

        <section id="dashboard-reset" className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <h2 className="text-sm font-semibold text-zinc-200">Reset account data</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Permanently delete all your strategies, closed trades, open trades, and reset stats to zero. You will be asked to confirm twice.
          </p>
          <button
            type="button"
            onClick={handleResetAllData}
            disabled={isResetting}
            className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
          >
            {isResetting ? "Resetting…" : "Reset all data"}
          </button>
        </section>

        <p className="pt-2 text-[11px] text-zinc-500">
          This app is designed for trading discipline, journaling and
          self-review. Arden24 is a product of Arden Ventures Ltd. Not financial advice.
        </p>
      </div>
    </main>
  );
}