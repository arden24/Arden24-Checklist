"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchTrades } from "@/lib/supabase/trades";
import { cancelClosedTrade, loadTrades, type Trade } from "@/lib/journal";
import { logError } from "@/lib/log-error";
import { dispatchTradesUpdated } from "@/lib/trades-updated";
import { canonicalRealisedPnl, tradeOutcomeKind } from "@/lib/realised-pnl";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAppToast } from "@/contexts/AppToastContext";

function formatPnl(t: Trade): string {
  const pnl = canonicalRealisedPnl(t);
  const sym = t.currency === "GBP" ? "£" : t.currency === "EUR" ? "€" : "$";
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}${sym}${Math.abs(pnl).toFixed(2)}`;
}

function formatResult(t: Trade): string {
  const o = tradeOutcomeKind(t);
  if (o === "win") return "Win";
  if (o === "loss") return "Loss";
  return "Breakeven";
}

export default function JournalList() {
  const { user } = useAuth();
  const { pushToast } = useAppToast();
  const supabase = createClient();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const load = useCallback(() => {
    if (supabase && user) {
      fetchTrades(supabase).then(setTrades).catch(logError);
    } else {
      setTrades(loadTrades(user?.id));
    }
  }, [supabase, user]);

  useEffect(() => {
    load();
  }, [load]);

  const requestCancelTrade = useCallback((tradeId: string) => {
    setPendingCancelId(tradeId);
  }, []);

  const confirmCancelTrade = useCallback(async () => {
    if (!pendingCancelId) return;
    const tradeId = pendingCancelId;
    setCancelSubmitting(true);
    try {
      await cancelClosedTrade(tradeId, user?.id, supabase);
      setTrades((prev) => prev.filter((t) => t.id !== tradeId));
      dispatchTradesUpdated();
      pushToast("Trade removed from your journal.", "success");
    } catch (err) {
      logError(err);
      pushToast("Failed to cancel trade. Please try again.", "error");
    } finally {
      setCancelSubmitting(false);
      setPendingCancelId(null);
    }
  }, [pendingCancelId, supabase, user?.id, pushToast]);

  const recent = trades.slice(0, 8);

  return (
    <div className="w-full min-w-0 max-w-full rounded-2xl border border-slate-800/90 bg-slate-950/70 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.9)]">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">
            Recent closed trades
          </h2>
          <p className="text-xs text-zinc-500">
            From Live Trades → Journal outcome. These feed the Journal tab too.
          </p>
        </div>
        {trades.length > 0 && (
          <Link
            href="/journal"
            className="rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-100 hover:bg-sky-500/20"
          >
            View journal
          </Link>
        )}
      </div>

      <div className="mt-4 space-y-3 text-sm">
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700/80 bg-black/40 px-3 py-6 text-center text-xs text-zinc-500">
            No closed trades yet. Open a trade from here or the Checklist, then
            close it from the <Link href="/open-trades" className="text-sky-400 hover:underline">Live Trades</Link> tab.
          </div>
        ) : (
          recent.map((t) => (
            <div
              key={t.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-black/40 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium text-white">{t.pair}</p>
                <p className="break-words text-xs text-zinc-400">
                  {t.session ?? t.market} · {t.date}
                </p>
              </div>
              <div className="min-w-0 shrink-0 text-right">
                <p
                  className={`text-xs font-semibold ${
                    formatResult(t) === "Win"
                      ? "text-sky-400"
                      : formatResult(t) === "Loss"
                      ? "text-red-400"
                      : "text-zinc-300"
                  }`}
                >
                  {formatResult(t)} · {formatPnl(t)}
                </p>
                {t.rr && (
                  <p className="mt-0.5 text-xs text-zinc-400">R:R {t.rr}</p>
                )}
                <button
                  type="button"
                  onClick={() => requestCancelTrade(t.id)}
                  className="mt-2 inline-flex rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-200 hover:bg-red-500/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={pendingCancelId !== null}
        onClose={() => !cancelSubmitting && setPendingCancelId(null)}
        title="Remove this closed trade?"
        description="It will be removed from your journal, dashboard stats, and performance history. This cannot be undone."
        confirmLabel="Remove trade"
        cancelLabel="Keep trade"
        confirmVariant="destructive"
        isLoading={cancelSubmitting}
        onConfirm={() => void confirmCancelTrade()}
      />
    </div>
  );
}
