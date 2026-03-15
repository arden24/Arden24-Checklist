"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchTrades } from "@/lib/supabase/trades";
import { loadTrades, type Trade } from "@/lib/journal";
import { logError } from "@/lib/log-error";

function formatPnl(t: Trade): string {
  const sym = t.currency === "GBP" ? "£" : t.currency === "EUR" ? "€" : "$";
  const sign = t.pnl >= 0 ? "+" : "";
  return `${sign}${sym}${Math.abs(t.pnl).toFixed(2)}`;
}

function formatResult(t: Trade): string {
  if (t.result === "win") return "Win";
  if (t.result === "loss") return "Loss";
  if (t.result === "breakeven") return "Breakeven";
  return t.pnl > 0 ? "Win" : t.pnl < 0 ? "Loss" : "Breakeven";
}

export default function JournalList() {
  const { user } = useAuth();
  const supabase = createClient();
  const [trades, setTrades] = useState<Trade[]>([]);

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

  const recent = trades.slice(0, 8);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
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
            className="rounded-lg border border-white/10 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-white/5"
          >
            View journal
          </Link>
        )}
      </div>

      <div className="mt-4 space-y-3 text-sm">
        {recent.length === 0 ? (
          <div className="rounded-xl bg-black/40 px-3 py-6 text-center text-xs text-zinc-500">
            No closed trades yet. Open a trade from here or the Checklist, then
            close it from the <Link href="/open-trades" className="text-sky-400 hover:underline">Live Trades</Link> tab.
          </div>
        ) : (
          recent.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-black/40 px-3 py-2.5"
            >
              <div>
                <p className="font-medium text-white">{t.pair}</p>
                <p className="text-xs text-zinc-400">
                  {t.session ?? t.market} · {t.date}
                </p>
              </div>
              <div className="text-right">
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
