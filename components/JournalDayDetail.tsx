"use client";

import type { Trade } from "@/lib/journal";
import JournalTradeRow from "./JournalTradeRow";

type JournalDayDetailProps = {
  date: Date;
  trades: Trade[];
  dayNotes?: string;
};

function formatPnl(pnl: number, currency?: string): string {
  const sym = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}${sym}${Math.abs(pnl).toFixed(2)}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function JournalDayDetail({
  date,
  trades,
  dayNotes,
}: JournalDayDetailProps) {
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const wins = trades.filter((t) => t.result === "win" || t.pnl > 0).length;
  const losses = trades.filter((t) => t.result === "loss" || t.pnl < 0).length;
  const breakeven = trades.filter(
    (t) => t.result === "breakeven" || t.pnl === 0
  ).length;

  const pnlColor =
    totalPnl > 0 ? "text-sky-400" : totalPnl < 0 ? "text-red-400" : "text-zinc-400";
  const primaryCurrency = trades[0]?.currency ?? "USD";

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-lg">
      <h3 className="text-lg font-semibold text-white">{formatDate(date)}</h3>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-slate-900/80 p-2">
          <p className="text-xs text-zinc-500">Net P/L</p>
          <p className={`font-semibold ${pnlColor}`}>
            {formatPnl(totalPnl, primaryCurrency)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-900/80 p-2">
          <p className="text-xs text-zinc-500">Trades</p>
          <p className="font-semibold text-white">{trades.length}</p>
        </div>
        <div className="rounded-lg bg-slate-900/80 p-2">
          <p className="text-xs text-zinc-500">Wins</p>
          <p className="font-semibold text-sky-400">{wins}</p>
        </div>
        <div className="rounded-lg bg-slate-900/80 p-2">
          <p className="text-xs text-zinc-500">Losses</p>
          <p className="font-semibold text-red-400">{losses}</p>
        </div>
        {breakeven > 0 && (
          <div className="col-span-2 rounded-lg bg-slate-900/80 p-2">
            <p className="text-xs text-zinc-500">Breakeven</p>
            <p className="font-semibold text-zinc-400">{breakeven}</p>
          </div>
        )}
      </div>

      {dayNotes && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Day notes
          </p>
          <p className="mt-1 text-sm text-zinc-300">{dayNotes}</p>
        </div>
      )}

      <div className="mt-4 flex-1 overflow-auto">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Trades
        </p>
        {trades.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center text-sm text-zinc-500">
            No trades logged for this day.
          </p>
        ) : (
          <div className="space-y-2">
            {trades.map((trade) => (
              <JournalTradeRow key={trade.id} trade={trade} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
