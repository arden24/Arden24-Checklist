import type { PlanKey } from "@/lib/subscriptions/plans";

export type PlanDetail = {
  key: PlanKey;
  label: string;
  tagline: string;
  features: string[];
};

export const PLAN_DETAILS: Record<PlanKey, PlanDetail> = {
  basic: {
    key: "basic",
    label: "Basic",
    tagline: "Track your trades and use the core workflow",
    features: [
      "Trade logging, live trades, and close trades (win / loss / breakeven)",
      "Dashboard stats: trade count, live trades, net P/L, win rate",
      "Lot size calculator and log trade entry",
      "High-level performance overview",
      "Up to 2 strategies",
      "Up to 5 confluences per strategy (scoring enabled)",
      "Critical confluences, screenshots, and timeframe tagging (locked)",
      "Basic pre-trade checklist",
      "Basic journal history",
      "Notes, calendar views, goals, account tracking, and AI tools (locked)",
    ],
  },
  pro: {
    key: "pro",
    label: "Pro",
    tagline: "Build and run your complete trading system",
    features: [
      "Everything in Basic",
      "Unlimited strategies and confluences",
      "Strategy screenshots, critical confluences, and timeframe tagging",
      "Strategy switching across saved setups",
      "Full pre-trade checklist",
      "Advanced dashboard stats (best / worst day, best asset, most traded market)",
      "Live trade ratings and R:R tracking when closing",
      "Journal calendar and daily trade breakdown",
      "Goals, milestones, and account tracking",
      "Notes and full journaling workflow",
      "Performance insights from your own logged data (observational only)",
      "AI-assisted tools (locked until Elite)",
    ],
  },
  elite: {
    key: "elite",
    label: "Elite",
    tagline: "Analyse your performance deeply and personalise your workspace",
    features: [
      "Everything in Pro",
      "AI strategy summary (from your saved context — not advice)",
      "Advanced performance insights and breakdowns by session, market, asset, and strategy",
      "Higher-score setup patterns from your logged data (observational)",
      "Elite-only workspace theme presets",
    ],
  },
};

export const PLAN_ORDER: PlanKey[] = ["basic", "pro", "elite"];
