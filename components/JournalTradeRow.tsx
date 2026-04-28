"use client";

import { useState } from "react";
import type { Trade } from "@/lib/journal";
import { canonicalRealisedPnl, tradeOutcomeKind } from "@/lib/realised-pnl";
import ScreenshotLightbox from "@/components/ScreenshotLightbox";

type JournalTradeRowProps = {
  trade: Trade;
  onCancelTrade?: (trade: Trade) => void;
};

function formatPnl(pnl: number, currency?: string): string {
  const sym = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}${sym}${Math.abs(pnl).toFixed(2)}`;
}

export default function JournalTradeRow({
  trade,
  onCancelTrade,
}: JournalTradeRowProps) {
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  const pnl = canonicalRealisedPnl(trade);
  const outcome = tradeOutcomeKind(trade);
  const isWin = outcome === "win";
  const isLoss = outcome === "loss";
  const isBreakeven = outcome === "breakeven";

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
          {formatPnl(pnl, trade.currency)}
        </p>
      </div>

      {onCancelTrade && (
        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            onClick={() => onCancelTrade(trade)}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/20"
          >
            Cancel trade
          </button>
        </div>
      )}

      {description && (
        <div className="mt-2 rounded-lg bg-black/40 px-2.5 py-2 text-xs text-zinc-300">
          <span className="font-medium text-zinc-400">Notes: </span>
          {description}
        </div>
      )}
      {(trade.openingScreenshot || trade.closingScreenshot || trade.screenshot) && (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {trade.openingScreenshot && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Before / Open Trade
              </p>
              <div
                className="w-full h-44 flex cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-black/5 transition hover:scale-[1.02]"
                onClick={() =>
                  setPreview({
                    src: trade.openingScreenshot as string,
                    alt: "Before / Open trade screenshot",
                  })
                }
              >
                <img
                  src={trade.openingScreenshot}
                  alt="Before / Open trade screenshot"
                  loading="lazy"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          )}
          {(trade.closingScreenshot || trade.screenshot) && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                After / Close Trade
              </p>
              <div
                className="w-full h-44 flex cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-black/5 transition hover:scale-[1.02]"
                onClick={() =>
                  setPreview({
                    src: (trade.closingScreenshot ?? trade.screenshot) as string,
                    alt: "After / Close trade screenshot",
                  })
                }
              >
                <img
                  src={trade.closingScreenshot ?? trade.screenshot}
                  alt="After / Close trade screenshot"
                  loading="lazy"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          )}
        </div>
      )}
      {preview && (
        <ScreenshotLightbox src={preview.src} alt={preview.alt} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
