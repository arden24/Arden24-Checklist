"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchTrades } from "@/lib/supabase/trades";
import { fetchOpenTrades } from "@/lib/supabase/open-trades";
import {
  cancelClosedTrade,
  getTradesForJournal,
  loadOpenTrades,
  type Trade,
} from "@/lib/journal";
import { logError } from "@/lib/log-error";
import JournalCalendar from "@/components/JournalCalendar";
import JournalDayDetail from "@/components/JournalDayDetail";
import JournalAccountProgress from "@/components/JournalAccountProgress";
import SummaryCard from "@/components/SummaryCard";
import PerformanceInsights from "@/components/PerformanceInsights";
import { dispatchTradesUpdated } from "@/lib/trades-updated";

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}£${Math.abs(pnl).toFixed(2)}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][(m ?? 1) - 1] ?? "";
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
  };
}

export default function JournalPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [openTradesCount, setOpenTradesCount] = useState(0);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const load = useCallback(() => {
    if (supabase && user) {
      fetchTrades(supabase).then(setTrades).catch(logError);
      fetchOpenTrades(supabase)
        .then((list) => setOpenTradesCount(list.length))
        .catch(logError);
    } else {
      setTrades(getTradesForJournal(user?.id));
      setOpenTradesCount(loadOpenTrades(user?.id).length);
    }
  }, [supabase, user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancelTrade = useCallback(
    async (trade: Trade) => {
      if (!trade?.id) return;
      const ok = window.confirm(
        "Cancel this closed trade?\n\nThis will remove it from your journal, dashboard stats, and performance history."
      );
      if (!ok) return;

      try {
        await cancelClosedTrade(trade.id, user?.id, supabase);
        setTrades((prev) => prev.filter((t) => t.id !== trade.id));
        dispatchTradesUpdated();
      } catch (err) {
        logError(err);
        alert("Failed to cancel trade. Please try again.");
      }
    },
    [supabase, user]
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const tradesInMonth = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    return trades.filter((t) => t.date.startsWith(prefix));
  }, [trades, year, month]);

  const tradesOnSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    const key = dateKey(selectedDate);
    return trades.filter((t) => t.date === key);
  }, [trades, selectedDate]);

  const stats = useMemo(() => computeStats(trades, openTradesCount), [trades, openTradesCount]);

  const goPrevMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  };

  const goNextMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));
  };

  const goToday = () => {
    const today = new Date();
    setViewDate(today);
    setSelectedDate(today);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold md:text-3xl">
              Journal & Performance — {MONTH_NAMES[month]} {year}
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrevMonth}
                className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:border-sky-400/40 hover:text-sky-300"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={goNextMonth}
                className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:border-sky-400/40 hover:text-sky-300"
              >
                Next →
              </button>
              <button
                type="button"
                onClick={goToday}
                className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-300 hover:bg-sky-500/20"
              >
                Today
              </button>
            </div>
          </div>

        </header>

        <JournalAccountProgress />

        <section className="space-y-6">
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
            <PerformanceInsights trades={trades} />
          </section>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <JournalCalendar
            year={year}
            month={month}
            trades={tradesInMonth}
            selectedDate={selectedDate}
            onSelectDay={setSelectedDate}
          />

          <div className="min-h-[320px] lg:min-h-[420px]">
            {selectedDate ? (
              <JournalDayDetail
                date={selectedDate}
                trades={tradesOnSelectedDay}
                onCancelTrade={handleCancelTrade}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/80 p-8 text-center">
                <p className="text-sm font-medium text-zinc-400">
                  Select a day
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Click a day in the calendar to see trades and notes.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-zinc-500">
          This app is designed for trading discipline, journaling and self-review.
          It does not provide financial advice.
        </p>
      </div>
    </main>
  );
}
