"use client";

import { useMemo } from "react";
import {
  computeEliteInsights,
  computeInsights,
  type Insight,
} from "@/lib/performance-insights";
import type { Trade } from "@/lib/supabase/trades";
import type { PlanKey } from "@/lib/subscriptions/plans";
import {
  canUseEliteAdvancedInsights,
  canUseProPerformanceInsights,
} from "@/lib/subscriptions/tier-gates";
import FeatureLockCard from "@/components/subscriptions/FeatureLockCard";

const DISCLAIMER =
  "This analysis is based on your own logged trading data and is provided for informational and self-review purposes only. It does not constitute financial advice.";

type PerformanceInsightsProps = {
  trades: Trade[];
  subscriptionPlan: PlanKey | null;
  planLoading: boolean;
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

export default function PerformanceInsights({
  trades,
  subscriptionPlan,
  planLoading,
}: PerformanceInsightsProps) {
  const proInsights = useMemo(() => computeInsights(trades), [trades]);
  const eliteInsights = useMemo(() => computeEliteInsights(trades), [trades]);

  const showPro = !planLoading && canUseProPerformanceInsights(subscriptionPlan);
  const showElite = !planLoading && canUseEliteAdvancedInsights(subscriptionPlan);

  if (planLoading) {
    return (
      <section className="space-y-4" aria-labelledby="performance-insights-heading">
        <h2 id="performance-insights-heading" className="text-sm font-semibold text-white">
          Performance Insights
        </h2>
        <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-zinc-500">
          Loading insights…
        </div>
      </section>
    );
  }

  if (!showPro) {
    return (
      <FeatureLockCard
        requiredPlan="pro"
        title="Performance insights"
        description="Unlock observational highlights from your closed trades — patterns in markets, sessions, and confidence."
      />
    );
  }

  return (
    <section className="space-y-4" aria-labelledby="performance-insights-heading">
      <div className="flex items-center justify-between gap-2">
        <h2 id="performance-insights-heading" className="text-sm font-semibold text-white">
          Performance Insights
        </h2>
        <span className="text-[10px] uppercase tracking-[0.16em] text-sky-400/80">
          From your journal
        </span>
      </div>
      <div className="space-y-2">
        {proInsights.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-6 text-center text-sm leading-relaxed text-zinc-400">
            <span className="font-medium text-zinc-300">No highlights yet.</span> Close a few trades first —
            patterns show up here as your journal grows.
          </div>
        ) : (
          proInsights.map((insight) => <InsightCard key={insight.id} insight={insight} />)
        )}
      </div>

      {showElite ? (
        eliteInsights.length > 0 ? (
          <div className="space-y-2 border-t border-white/10 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200/90">
              Elite breakdown
            </h3>
            {eliteInsights.map((insight) => (
              <InsightCard key={`elite-${insight.id}`} insight={insight} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            Elite breakdowns appear here once you have enough closed trades for a stable view.
          </p>
        )
      ) : (
        <FeatureLockCard
          requiredPlan="elite"
          title="Elite performance breakdown"
          description="See deeper session, strategy, and score-quality views from your own logged performance."
        />
      )}

      <p className="text-[10px] leading-relaxed text-zinc-500">{DISCLAIMER}</p>
    </section>
  );
}
