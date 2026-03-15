import type { Trade } from "@/lib/supabase/trades";

export type Insight = {
  id: string;
  text: string;
  type: "positive" | "neutral" | "negative";
};

const STOPWORDS = new Set(
  "the a an and or but in on at to for of with by from as is was are were been be have has had do does did will would could should may might must can this that these those it its".split(
    " "
  )
);

function getWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

function extractMistakeKeywords(trades: Trade[]): string[] {
  const lossTrades = trades.filter((t) => t.result === "loss" || t.pnl < 0);
  const combined =
    lossTrades
      .flatMap((t) => [t.notes ?? "", t.thoughts ?? "", t.description ?? ""])
      .filter(Boolean)
      .join(" ") || "";
  if (!combined.trim()) return [];
  const words = getWords(combined);
  const count: Record<string, number> = {};
  words.forEach((w) => {
    count[w] = (count[w] ?? 0) + 1;
  });
  const sorted = Object.entries(count)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => w);
  return sorted;
}

/**
 * Computes human-readable performance insights from trade data.
 * Designed to be swappable with an AI API later: same input (trades), same output (Insight[]).
 */
export function computeInsights(trades: Trade[]): Insight[] {
  const insights: Insight[] = [];
  if (trades.length === 0) {
    insights.push({
      id: "no-data",
      text: "Log and close more trades to see performance insights here.",
      type: "neutral",
    });
    return insights;
  }

  const wins = trades.filter((t) => t.result === "win" || t.pnl > 0);
  const losses = trades.filter((t) => t.result === "loss" || t.pnl < 0);

  // --- Best / worst market (by total P/L) ---
  const byMarket: Record<string, { pnl: number; count: number }> = {};
  trades.forEach((t) => {
    const m = t.market?.trim() || "—";
    if (!byMarket[m]) byMarket[m] = { pnl: 0, count: 0 };
    byMarket[m].pnl += t.pnl;
    byMarket[m].count += 1;
  });
  const marketEntries = Object.entries(byMarket).filter(([, v]) => v.count >= 1);
  if (marketEntries.length >= 2) {
    const best = marketEntries.reduce((a, b) => (a[1].pnl > b[1].pnl ? a : b));
    const worst = marketEntries.reduce((a, b) => (a[1].pnl < b[1].pnl ? a : b));
    if (best[1].pnl > 0) {
      insights.push({
        id: "best-market",
        text: `${best[0]} is your best performing market so far.`,
        type: "positive",
      });
    }
    if (worst[1].pnl < 0 && worst[0] !== best[0]) {
      insights.push({
        id: "worst-market",
        text: `${worst[0]} is underperforming compared to your other markets.`,
        type: "negative",
      });
    }
  }

  // --- Best / worst session ---
  const bySession: Record<string, { pnl: number; wins: number; count: number }> = {};
  trades.forEach((t) => {
    const s = t.session?.trim() || "—";
    if (!bySession[s]) bySession[s] = { pnl: 0, wins: 0, count: 0 };
    bySession[s].pnl += t.pnl;
    bySession[s].count += 1;
    if (t.result === "win" || t.pnl > 0) bySession[s].wins += 1;
  });
  const sessionEntries = Object.entries(bySession).filter(([k]) => k !== "—");
  if (sessionEntries.length >= 1) {
    const bestSession = sessionEntries.reduce((a, b) => (a[1].pnl > b[1].pnl ? a : b));
    if (bestSession[1].count >= 2 && bestSession[1].pnl > 0) {
      insights.push({
        id: "best-session",
        text: `Your ${bestSession[0]} session trades are performing best.`,
        type: "positive",
      });
    }
    if (sessionEntries.length >= 2) {
      const worstSession = sessionEntries.reduce((a, b) => (a[1].pnl < b[1].pnl ? a : b));
      if (worstSession[1].pnl < 0 && worstSession[0] !== bestSession[0]) {
        insights.push({
          id: "worst-session",
          text: `${worstSession[0]} session is underperforming.`,
          type: "negative",
        });
      }
    }
  }

  // --- Win rate by session (one line per session with enough trades) ---
  const sessionWinRates = sessionEntries
    .filter(([, v]) => v.count >= 2)
    .map(([name, v]) => ({ name, rate: Math.round((v.wins / v.count) * 100) }))
    .sort((a, b) => b.rate - a.rate);
  if (sessionWinRates.length >= 1) {
    const top = sessionWinRates[0];
    insights.push({
      id: "session-winrate",
      text: `Win rate in ${top.name} session is ${top.rate}%.`,
      type: top.rate >= 50 ? "positive" : "neutral",
    });
  }

  // --- Average confidence: winning vs losing trades ---
  const winConf = wins.map((t) => t.confidence).filter((c): c is number => typeof c === "number");
  const lossConf = losses.map((t) => t.confidence).filter((c): c is number => typeof c === "number");
  if (winConf.length >= 2 && lossConf.length >= 2) {
    const avgWin = winConf.reduce((a, b) => a + b, 0) / winConf.length;
    const avgLoss = lossConf.reduce((a, b) => a + b, 0) / lossConf.length;
    if (avgWin > avgLoss + 5) {
      insights.push({
        id: "confidence-wins",
        text: "Your highest confidence trades have the strongest results.",
        type: "positive",
      });
    } else if (avgLoss > avgWin + 5) {
      insights.push({
        id: "confidence-losses",
        text: "Lower-confidence trades are tending to win more than high-confidence ones — worth reviewing setup criteria.",
        type: "neutral",
      });
    }
  }

  // --- Best performing strategy (by P/L) ---
  const byStrategy: Record<string, { pnl: number; count: number }> = {};
  trades.forEach((t) => {
    const s = t.strategy?.trim() || "—";
    if (!byStrategy[s]) byStrategy[s] = { pnl: 0, count: 0 };
    byStrategy[s].pnl += t.pnl;
    byStrategy[s].count += 1;
  });
  const strategyEntries = Object.entries(byStrategy).filter(([k]) => k !== "—" && k !== "");
  if (strategyEntries.length >= 1) {
    const bestStrategy = strategyEntries.reduce((a, b) => (a[1].pnl > b[1].pnl ? a : b));
    if (bestStrategy[1].count >= 2 && bestStrategy[1].pnl > 0) {
      insights.push({
        id: "best-strategy",
        text: `"${bestStrategy[0]}" is your best performing strategy so far.`,
        type: "positive",
      });
    }
  }

  // --- Most common result trend ---
  const winCount = wins.length;
  const lossCount = losses.length;
  const total = trades.length;
  if (total >= 3) {
    if (winCount >= total * 0.6) {
      insights.push({
        id: "trend-wins",
        text: "Most of your recent trades have been wins — strong consistency.",
        type: "positive",
      });
    } else if (lossCount >= total * 0.6) {
      insights.push({
        id: "trend-losses",
        text: "Most of your recent trades have been losses — consider tightening entry rules or reducing size.",
        type: "negative",
      });
    }
  }

  // --- Repeated mistake keywords from notes ---
  const mistakeWords = extractMistakeKeywords(trades);
  if (mistakeWords.length >= 1) {
    const phrase = mistakeWords.slice(0, 3).join(", ");
    insights.push({
      id: "mistake-keywords",
      text: `A repeated theme in your loss notes: ${phrase}.`,
      type: "neutral",
    });
  }

  // Dedupe by id and return 3–5 insights, prioritising positive then neutral then negative
  const seen = new Set<string>();
  const ordered = insights.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
  const priority: Record<Insight["type"], number> = { positive: 0, neutral: 1, negative: 2 };
  ordered.sort((a, b) => priority[a.type] - priority[b.type]);
  return ordered.slice(0, 5);
}
