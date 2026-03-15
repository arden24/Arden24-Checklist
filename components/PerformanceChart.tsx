"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchTrades } from "@/lib/supabase/trades";
import { fetchOpenTrades } from "@/lib/supabase/open-trades";
import { loadTrades, loadOpenTrades, type Trade, type OpenTrade } from "@/lib/journal";
import { logError } from "@/lib/log-error";

type Timeframe = "days" | "weeks" | "months" | "quarters" | "years";

type PeriodBucket = {
  label: string;
  wins: number;
  losses: number;
  breakeven: number;
  openCount: number;
};

const MONTH_ABBREV = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay() + 1);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getQuarterKey(dateStr: string): string {
  const [y, month] = dateStr.split("-").map(Number);
  const q = Math.floor((month - 1) / 3) + 1;
  return `${y}-Q${q}`;
}

function aggregateByTimeframe(
  closed: Trade[],
  open: OpenTrade[],
  timeframe: Timeframe
): PeriodBucket[] {
  const now = new Date();
  const buckets: Record<string, { label: string; wins: number; losses: number; breakeven: number; openCount: number }> = {};

  function ensureBucket(key: string, label: string) {
    if (!buckets[key]) {
      buckets[key] = { label, wins: 0, losses: 0, breakeven: 0, openCount: 0 };
    }
  }

  if (timeframe === "days") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${day}`;
      const label = `${d.getDate()} ${MONTH_ABBREV[d.getMonth()]}`;
      ensureBucket(key, label);
    }
  } else if (timeframe === "weeks") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const key = getWeekKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      const label = `${d.getDate()} ${MONTH_ABBREV[d.getMonth()]}`;
      ensureBucket(key, label);
    }
  } else if (timeframe === "months") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTH_ABBREV[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
      ensureBucket(key, label);
    }
  } else if (timeframe === "quarters") {
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
      const key = getQuarterKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
      const label = `Q${Math.floor(d.getMonth() / 3) + 1} ${String(d.getFullYear()).slice(2)}`;
      ensureBucket(key, label);
    }
  } else {
    for (let i = 4; i >= 0; i--) {
      const y = now.getFullYear() - i;
      const key = String(y);
      ensureBucket(key, key);
    }
  }

  closed.forEach((t) => {
    const dateStr = t.date;
    let key: string;
    let label: string;
    if (timeframe === "days") {
      key = dateStr;
      const d = new Date(dateStr + "T12:00:00");
      label = `${d.getDate()} ${MONTH_ABBREV[d.getMonth()]}`;
    } else if (timeframe === "weeks") {
      key = getWeekKey(dateStr);
      const d = new Date(key + "T12:00:00");
      label = `${d.getDate()} ${MONTH_ABBREV[d.getMonth()]}`;
    } else if (timeframe === "months") {
      key = dateStr.slice(0, 7);
      const d = new Date(dateStr + "-01");
      label = `${MONTH_ABBREV[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    } else if (timeframe === "quarters") {
      key = getQuarterKey(dateStr);
      const [y, q] = key.split("-Q");
      label = `Q${q} ${String(y).slice(2)}`;
    } else {
      key = dateStr.slice(0, 4);
      label = key;
    }
    if (!buckets[key]) ensureBucket(key, label);
    if (t.pnl > 0) buckets[key].wins += 1;
    else if (t.pnl < 0) buckets[key].losses += 1;
    else buckets[key].breakeven += 1;
  });

  open.forEach((t) => {
    const dateStr = t.date;
    let key: string;
    if (timeframe === "days") key = dateStr;
    else if (timeframe === "weeks") key = getWeekKey(dateStr);
    else if (timeframe === "months") key = dateStr.slice(0, 7);
    else if (timeframe === "quarters") key = getQuarterKey(dateStr);
    else key = dateStr.slice(0, 4);
    if (buckets[key]) buckets[key].openCount += 1;
    else {
      const label = key;
      ensureBucket(key, label);
      buckets[key].openCount += 1;
    }
  });

  const order = Object.keys(buckets).sort();
  return order.map((key) => ({ ...buckets[key], label: buckets[key].label }));
}

export default function PerformanceChart() {
  const { user } = useAuth();
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [openTrades, setOpenTrades] = useState<OpenTrade[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>("months");

  const load = useCallback(() => {
    if (supabase && user) {
      fetchTrades(supabase).then(setClosedTrades).catch(logError);
      fetchOpenTrades(supabase).then(setOpenTrades).catch(logError);
    } else {
      setClosedTrades(loadTrades(user?.id));
      setOpenTrades(loadOpenTrades(user?.id));
    }
    setMounted(true);
  }, [supabase, user]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = useMemo(
    () => (mounted ? aggregateByTimeframe(closedTrades, openTrades, timeframe) : []),
    [mounted, closedTrades, openTrades, timeframe]
  );

  const maxTotal = useMemo(() => {
    const m = Math.max(...chartData.map((d) => d.wins + d.losses + d.breakeven), 1);
    return m;
  }, [chartData]);

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Performance Overview</h2>
          <p className="text-xs text-zinc-500">Wins vs losses from closed trades.</p>
        </div>
        <div className="mt-4 flex h-64 items-center justify-center rounded-xl bg-black/40 text-xs text-zinc-500">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Performance Overview</h2>
          <p className="text-xs text-zinc-500">
            Wins vs losses from closed trades. Open trades shown by period.
          </p>
        </div>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as Timeframe)}
          className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-1.5 text-xs text-white outline-none sm:w-36"
        >
          <option value="days">Days (7)</option>
          <option value="weeks">Weeks (12)</option>
          <option value="months">Months (12)</option>
          <option value="quarters">Quarters (8)</option>
          <option value="years">Years (5)</option>
        </select>
      </div>

      <div className="mt-4 flex h-64 items-end gap-1 rounded-xl bg-black/40 px-2 py-3">
        {chartData.map((d, i) => {
          const total = d.wins + d.losses + d.breakeven;
          const scale = maxTotal > 0 ? total / maxTotal : 0;
          const winH = total ? (d.wins / maxTotal) * 100 : 0;
          const lossH = total ? (d.losses / maxTotal) * 100 : 0;
          const beH = total ? (d.breakeven / maxTotal) * 100 : 0;
          return (
            <div key={d.label + i} className="flex flex-1 flex-col items-center gap-0.5" title={`${d.label}: ${d.wins}W / ${d.losses}L${d.breakeven ? ` / ${d.breakeven}BE` : ""}${d.openCount ? ` · ${d.openCount} open` : ""}`}>
              <div className="flex w-full max-w-[24px] flex-1 flex-col justify-end rounded-t bg-slate-900/80">
                <div
                  className="w-full rounded-t bg-sky-400"
                  style={{ height: `${winH}%`, minHeight: winH > 0 ? "4px" : 0 }}
                />
                <div
                  className="w-full bg-amber-500/80"
                  style={{ height: `${beH}%`, minHeight: beH > 0 ? "2px" : 0 }}
                />
                <div
                  className="w-full rounded-b bg-red-400"
                  style={{ height: `${lossH}%`, minHeight: lossH > 0 ? "4px" : 0 }}
                />
              </div>
              <span className="truncate text-[10px] text-zinc-400">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-4 text-[10px] text-zinc-400">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          <span>Wins</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span>Losses</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>Breakeven</span>
        </div>
        {openTrades.length > 0 && (
          <span className="text-zinc-500">
            {openTrades.length} open trade{openTrades.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
