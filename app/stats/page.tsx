"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchTrades } from "@/lib/supabase/trades";
import { fetchOpenTrades } from "@/lib/supabase/open-trades";
import { loadTrades, loadOpenTrades } from "@/lib/journal";
import type { Trade } from "@/lib/supabase/trades";
import { logError } from "@/lib/log-error";
import SummaryCard from "@/components/SummaryCard";
import PerformanceInsights from "@/components/PerformanceInsights";

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

  const byDate: Record<string, number> = {};
  closedTrades.forEach((t) => {
    byDate[t.date] = (byDate[t.date] ?? 0) + t.pnl;
  });
  const dates = Object.entries(byDate);
  const bestDay = dates.length ? dates.reduce((a, b) => (a[1] > b[1] ? a : b)) : null;
  const worstDay = dates.length ? dates.reduce((a, b) => (a[1] < b[1] ? a : b)) : null;

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
    netPnl,
    netPnlStr: formatPnl(netPnl),
    bestDay: bestDay ? { date: bestDay[0], pnl: bestDay[1] } : null,
    worstDay: worstDay ? { date: worstDay[0], pnl: worstDay[1] } : null,
    bestTradedAsset: bestTradedAsset ? { name: bestTradedAsset[0], pnl: bestTradedAsset[1].pnl } : null,
    mostTradedMarket,
    recentTrades: closedTrades.slice(0, 10),
  };
}

export default function StatsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [openTradesCount, setOpenTradesCount] = useState(0);

  const load = useCallback(() => {
    if (supabase && user) {
      fetchTrades(supabase).then(setClosedTrades).catch(logError);
      fetchOpenTrades(supabase).then((list) => setOpenTradesCount(list.length)).catch(logError);
    } else {
      setClosedTrades(loadTrades(user?.id) as Trade[]);
      setOpenTradesCount(loadOpenTrades(user?.id).length);
    }
  }, [supabase, user]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(
    () => computeStats(closedTrades, openTradesCount),
    [closedTrades, openTradesCount]
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <h1 className="text-4xl font-bold">Stats</h1>
          <p className="mt-3 text-zinc-400">
            Performance metrics from your closed and open trades.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Total Trades" value={String(stats.total)} subtitle="Closed" />
          <SummaryCard title="Live Trades" value={String(stats.openTradesCount)} subtitle="Current positions" />
          <SummaryCard title="Net P/L" value={stats.netPnlStr} subtitle="Total from closed" />
          <SummaryCard title="Win Rate" value={`${stats.winRate}%`} subtitle="Profitable trades" />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <PerformanceInsights trades={closedTrades} />
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <h2 className="text-sm font-semibold text-white">Recent Trades</h2>
          <p className="mt-1 text-xs text-zinc-500">Last 10 closed trades</p>
          {stats.recentTrades.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No closed trades yet. Close trades from the Live Trades page.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {stats.recentTrades.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/40 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-white">{t.pair}</span>
                  <span className="text-zinc-400">{t.market}</span>
                  <span className={t.pnl >= 0 ? "text-sky-400" : "text-red-400"}>
                    {formatPnl(t.pnl)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/journal"
            className="mt-4 inline-block text-xs font-medium text-sky-400 hover:text-sky-300"
          >
            View full journal →
          </Link>
        </section>

        <p className="text-[11px] text-zinc-500">
          This app is designed for trading discipline, journaling and self-review. It does not provide financial advice.
        </p>
      </div>
    </main>
  );
}
