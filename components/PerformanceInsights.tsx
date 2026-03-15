"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchTrades } from "@/lib/supabase/trades";
import { loadTrades } from "@/lib/journal";
import { logError } from "@/lib/log-error";
import { computeInsights, type Insight } from "@/lib/performance-insights";
import type { Trade } from "@/lib/supabase/trades";

type PerformanceInsightsProps = {
  /** Optional: pass trades to avoid fetching (e.g. from dashboard/stats). */
  trades?: Trade[] | null;
};

function InsightCard({ insight }: { insight: Insight }) {
  const borderColor =
    insight.type === "positive"
      ? "border-sky-500/30"
      : insight.type === "negative"
        ? "border-red-500/20"
        : "border-white/10";
  const dotColor =
    insight.type === "positive"
      ? "bg-sky-400"
      : insight.type === "negative"
        ? "bg-red-400/80"
        : "bg-zinc-500";

  return (
    <div
      className={`flex gap-3 rounded-xl border ${borderColor} bg-slate-950/60 px-4 py-3`}
      role="listitem"
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} aria-hidden />
      <p className="text-sm leading-snug text-zinc-200">{insight.text}</p>
    </div>
  );
}

export default function PerformanceInsights({ trades: tradesProp }: PerformanceInsightsProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [trades, setTrades] = useState<Trade[] | null>(
    tradesProp !== undefined ? (tradesProp ?? null) : null
  );

  const loadTradesData = useCallback(() => {
    if (tradesProp !== undefined) {
      setTrades(tradesProp ?? null);
      return;
    }
    if (!user) {
      setTrades(null);
      return;
    }
    if (supabase) {
      fetchTrades(supabase).then(setTrades).catch(logError);
    } else {
      setTrades(loadTrades(user?.id) as Trade[]);
    }
  }, [user, supabase, tradesProp]);

  useEffect(() => {
    loadTradesData();
  }, [loadTradesData]);

  useEffect(() => {
    if (tradesProp !== undefined) setTrades(tradesProp ?? null);
  }, [tradesProp]);

  const insights = trades !== null ? computeInsights(trades) : [];

  return (
    <section className="space-y-4" aria-labelledby="performance-insights-heading">
      <div className="flex items-center justify-between gap-2">
        <h2 id="performance-insights-heading" className="text-sm font-semibold text-white">
          Performance Insights
        </h2>
        <span className="text-[10px] uppercase tracking-[0.16em] text-sky-400/80">
          Trend highlights
        </span>
      </div>
      <div className="space-y-2">
        {trades === null && tradesProp === undefined ? (
          <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-6 text-center text-sm text-zinc-500">
            Loading insights…
          </div>
        ) : (
          insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        )}
      </div>
      <p className="text-[10px] text-zinc-500">
        Based on your saved trades. For journaling and self-review only. Not financial advice.
      </p>
    </section>
  );
}
