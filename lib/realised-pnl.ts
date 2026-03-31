/**
 * Canonical realised P/L for closed trades: normalisation on close + safe display
 * when historical rows have mismatched `result` vs `pnl` sign.
 */

export type TradeResultField = "win" | "loss" | "breakeven" | string | undefined;

export type TradeOutcomeKind = "win" | "loss" | "breakeven";

export type TradeWithPnl = {
  pnl: number;
  result?: TradeResultField;
};

/** Strip currency symbols, commas, whitespace; parse a finite number. */
export function parseMoneyAmountInput(raw: string): number | null {
  if (raw == null) return null;
  const cleaned = String(raw)
    .replace(/\u2212|–/g, "-")
    .replace(/[£$€,\s]/g, "")
    .trim();
  if (cleaned === "" || cleaned === "+" || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Apply result to the user-entered magnitude at close time.
 * - win → +|amount|
 * - loss → -|amount|
 * - breakeven → 0
 */
export function normaliseRealisedPnLForClose(
  result: "win" | "loss" | "breakeven",
  parsedMagnitude: number
): number {
  if (result === "breakeven") return 0;
  if (result === "win") return Math.abs(parsedMagnitude);
  return -Math.abs(parsedMagnitude);
}

/**
 * Stored `pnl` aligned with `result` when present; otherwise raw `pnl`.
 * Fixes legacy rows where e.g. result was "loss" but pnl was typed positive.
 */
export function canonicalRealisedPnl(t: TradeWithPnl): number {
  const raw = typeof t.pnl === "number" && Number.isFinite(t.pnl) ? t.pnl : 0;
  if (t.result === "breakeven") return 0;
  if (t.result === "win") return Math.abs(raw);
  if (t.result === "loss") return -Math.abs(raw);
  return raw;
}

/** Outcome used for streaks and win/loss counts — derived from canonical P/L. */
export function tradeOutcomeKind(t: TradeWithPnl): TradeOutcomeKind {
  const p = canonicalRealisedPnl(t);
  if (p === 0) return "breakeven";
  if (p > 0) return "win";
  return "loss";
}
