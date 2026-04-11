import type { ChecklistItem } from "@/lib/supabase/strategies";

export type MockGenerateStrategyKeyPointsInput = {
  summary: string;
  scratchNotes: string;
  market: string;
  timeframes: string;
  checklistItems: ChecklistItem[];
};

export type MockGenerateStrategyKeyPointsResult = {
  keyPoints: string[];
  summarySuggestion?: string;
};

const GENERIC_KEY_POINT_PAD = [
  "Skip the trade if HTF bias and LTF trigger disagree.",
  "Size only after the full checklist is satisfied — no partial-stack gambles.",
  "Reassess if volatility spikes or structure invalidates before fill.",
] as const;

export function hasMaterialForKeyPointGenerate(
  description: string,
  scratchNotes: string,
  market: string,
  timeframes: string,
  checklistItems: ChecklistItem[],
): boolean {
  if (description.trim().length >= 20) return true;
  if (scratchNotes.trim().length >= 20) return true;
  if (market.trim().length > 0) return true;
  if (timeframes.trim().length >= 8) return true;
  return checklistItems.some((i) => i.text.trim().length >= 3);
}

/**
 * Rule-based mock: execution-focused key points from summary + confluences.
 * Replace with a real model when ready — local state only, not persisted.
 */
export function mockGenerateStrategyKeyPoints(
  input: MockGenerateStrategyKeyPointsInput,
): MockGenerateStrategyKeyPointsResult {
  const summary = input.summary.trim();
  const notes = input.scratchNotes.trim();
  const market = input.market.trim();
  const tfSummary = input.timeframes.trim();
  const filled = input.checklistItems.filter((i) => i.text.trim());

  const savedDetails = [
    market ? `Market: ${market}` : "",
    tfSummary ? `Timeframes (saved): ${tfSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const blob = [
    summary,
    notes,
    savedDetails,
    filled.map((c) => c.text.trim()).join(" "),
  ]
    .filter(Boolean)
    .join("\n\n");
  const lower = blob.toLowerCase();

  const points: string[] = [];
  const seen = new Set<string>();

  function push(p: string) {
    const k = p.toLowerCase().replace(/\s+/g, " ").slice(0, 160);
    if (k.length < 10 || seen.has(k)) return;
    seen.add(k);
    points.push(p);
  }

  if (market) {
    push(
      `Run this playbook on ${market} — keep sizing and session expectations appropriate for that market.`,
    );
  }
  if (tfSummary) {
    push(
      `HTF vs LTF framing from saved details: ${tfSummary} — align entries with that split.`,
    );
  }

  for (const c of filled) {
    const tag = c.critical ? "Critical" : "Confirm";
    const tf = c.timeframe.trim();
    const tfPart = tf ? ` — ${tf}` : "";
    push(`${tag}: ${c.text.trim()}${tfPart}`);
  }

  if (
    /\bbullish\b|\blong bias\b|\blongs?\b|\bbuy\b/i.test(blob) &&
    !points.some((p) => /long|bullish|buy/i.test(p))
  ) {
    push("Only take longs when higher-timeframe bias clearly supports upside.");
  }
  if (
    /\bbearish\b|\bshort bias\b|\bshorts?\b|\bsell\b/i.test(blob) &&
    !points.some((p) => /short|bearish|sell/i.test(p))
  ) {
    push(
      "Only take shorts when higher-timeframe bias clearly supports downside.",
    );
  }
  if (
    /\baoi\b|area of interest|order block|\bob\b|fvg|supply|demand|zone/i.test(
      lower,
    )
  ) {
    push("Demand a clean AOI / zone — no entries in random mid-range chop.");
  }
  if (/\bliquidity|sweep|ssl|bsl|equal\s*high|equal\s*low/i.test(lower)) {
    push(
      "Liquidity sweep or engineered high/low should precede directional commitment.",
    );
  }
  if (/\bbos\b|break of structure|choch|change of character/i.test(lower)) {
    push(
      "Require structure confirmation (BOS/CHOCH) in trade direction before entry.",
    );
  }
  if (/\bdisplacement\b|impulse|strong candle/i.test(lower)) {
    push(
      "Displacement or decisive impulse must validate the move — no fade on weak prints.",
    );
  }
  if (/\bretest|rejection|mitigation/i.test(lower)) {
    push(
      "Prefer retest or mitigation of the level after sweep/BOS when applicable.",
    );
  }
  if (/\b1\s*:\s*\d|risk.?to.?reward|risk.?reward|\brr\b|target/i.test(lower)) {
    const m = blob.match(/\b1\s*:\s*(\d+(?:\.\d+)?)\b/i);
    push(
      m
        ? `Hold out for at least ~1:${m[1]} R:R; pass if reward is fuzzy.`
        : "Define minimum R:R and targets before entry — skip marginal payoffs.",
    );
  }
  if (/\bstop\b|invalidation|below the|above the.*structure/i.test(lower)) {
    push("Stops beyond structural invalidation, not inside noise.");
  }
  if (
    /\b15m|\b5m|\b1\s*h\b|\b4h|\b1d|\bdaily|\bhtf|\bltf|timeframe/i.test(lower)
  ) {
    push("Bias on HTF; trigger and manage on the agreed execution timeframe.");
  }
  if (/\blondon\b|\bnew york\b|\bny\b|\basia\b|session/i.test(lower)) {
    push("Trade during liquid sessions that match this playbook.");
  }

  if (points.length < 4) {
    const sentences = summary
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 20 && s.length <= 140);
    for (const s of sentences) {
      if (points.length >= 4) break;
      push(`Rule: ${s}`);
    }
  }
  let padI = 0;
  while (points.length < 4 && padI < GENERIC_KEY_POINT_PAD.length) {
    push(GENERIC_KEY_POINT_PAD[padI]);
    padI += 1;
  }

  return { keyPoints: points.slice(0, 8) };
}
