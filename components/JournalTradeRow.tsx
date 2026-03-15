"use client";

import type { Trade } from "@/lib/journal";

type JournalTradeRowProps = {
  trade: Trade;
};

function formatPnl(pnl: number, currency?: string): string {
  const sym = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}${sym}${Math.abs(pnl).toFixed(2)}`;
}

export default function JournalTradeRow({ trade }: JournalTradeRowProps) {
  const isWin = trade.pnl > 0;
  const isLoss = trade.pnl < 0;
  const isBreakeven = trade.pnl === 0;

  const pnlColor = isWin
    ? "text-sky-400"
    : isLoss
    ? "text-red-400"
    : "text-zinc-400";

  const description = [trade.thoughts, trade.notes, trade.description]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="font-medium text-white">
            {trade.pair}
            {trade.market && (
              <span className="ml-2 text-xs font-normal text-zinc-400">
                {trade.market}
              </span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            {trade.session && <span>{trade.session}</span>}
            {trade.direction && (
              <span
                className={
                  trade.direction === "Buy"
                    ? "text-sky-400/90"
                    : "text-red-400/90"
                }
              >
                {trade.direction}
              </span>
            )}
            {trade.time && <span>{trade.time}</span>}
            {trade.rr && <span>R:R {trade.rr}</span>}
            {trade.rating != null && (
              <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-zinc-200">
                {trade.rating}/10
              </span>
            )}
          </div>
        </div>
        <p className={`text-sm font-semibold ${pnlColor}`}>
          {formatPnl(trade.pnl, trade.currency)}
        </p>
      </div>
      {description && (
        <div className="mt-2 rounded-lg bg-black/40 px-2.5 py-2 text-xs text-zinc-300">
          <span className="font-medium text-zinc-400">Notes: </span>
          {description}
        </div>
      )}
      {trade.screenshot && (
        <div className="mt-2 overflow-hidden rounded-lg border border-white/10">
          <img
            src={trade.screenshot}
            alt="Trade screenshot"
            className="max-h-40 w-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
