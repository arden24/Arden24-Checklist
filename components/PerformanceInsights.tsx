"use client";

import { useMemo } from "react";
import { computeInsights, type Insight } from "@/lib/performance-insights";
import type { Trade } from "@/lib/supabase/trades";

type PerformanceInsightsProps = {
  /** Closed trades from the parent page — no internal fetching. */
  trades: Trade[];
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

export default function PerformanceInsights({ trades }: PerformanceInsightsProps) {
  const insights = useMemo(() => computeInsights(trades), [trades]);

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
        {insights.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-6 text-center text-sm text-zinc-500">
            Not enough closed trades yet for highlights. Keep journaling — insights appear as your
            sample grows.
          </div>
        ) : (
          insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)
        )}
      </div>
      <p className="text-[10px] text-zinc-500">
        Based on your saved trades. For journaling and self-review only. Not financial advice.
      </p>
    </section>
  );
}
