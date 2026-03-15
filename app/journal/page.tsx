"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchTrades } from "@/lib/supabase/trades";
import { getTradesForJournal, type Trade } from "@/lib/journal";
import { logError } from "@/lib/log-error";
import JournalCalendar from "@/components/JournalCalendar";
import JournalDayDetail from "@/components/JournalDayDetail";

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

export default function JournalPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const load = useCallback(() => {
    if (supabase && user) {
      fetchTrades(supabase).then(setTrades).catch(logError);
    } else {
      setTrades(getTradesForJournal(user?.id));
    }
  }, [supabase, user]);

  useEffect(() => {
    load();
  }, [load]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const tradesInMonth = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    return trades.filter((t) => t.date.startsWith(prefix));
  }, [trades, year, month]);

  const monthlyStats = useMemo(() => {
    let pnl = 0;
    let wins = 0;
    let losses = 0;
    tradesInMonth.forEach((t) => {
      pnl += t.pnl;
      if (t.pnl > 0) wins += 1;
      else if (t.pnl < 0) losses += 1;
    });
    return {
      pnl,
      wins,
      losses,
      total: tradesInMonth.length,
    };
  }, [tradesInMonth]);

  const tradesOnSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    const key = dateKey(selectedDate);
    return trades.filter((t) => t.date === key);
  }, [trades, selectedDate]);

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
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold md:text-3xl">
              Journal — {MONTH_NAMES[month]} {year}
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3">
              <p className="text-xs text-zinc-500">Monthly P/L</p>
              <p
                className={`text-lg font-semibold ${
                  monthlyStats.pnl > 0
                    ? "text-sky-400"
                    : monthlyStats.pnl < 0
                    ? "text-red-400"
                    : "text-zinc-300"
                }`}
              >
                {formatPnl(monthlyStats.pnl)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3">
              <p className="text-xs text-zinc-500">Wins</p>
              <p className="text-lg font-semibold text-sky-400">
                {monthlyStats.wins}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3">
              <p className="text-xs text-zinc-500">Losses</p>
              <p className="text-lg font-semibold text-red-400">
                {monthlyStats.losses}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3">
              <p className="text-xs text-zinc-500">Total Trades</p>
              <p className="text-lg font-semibold text-white">
                {monthlyStats.total}
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
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
