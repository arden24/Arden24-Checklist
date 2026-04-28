export function calculateRiskAmount(accountSize: number, riskPercent: number) {
  return (accountSize * riskPercent) / 100;
}

export type LotSizeCalcAccountCurrency = "GBP" | "USD" | "EUR";

export type LotSizeSymbolKind = "forex" | "metal" | "unknown";

export type LotSizeSymbolInfo =
  | { kind: "forex"; base: string; quote: string; pipSize: number }
  | { kind: "metal"; base: "XAU"; quote: "USD" }
  | { kind: "unknown" };

const KNOWN_FX = new Set(["USD", "GBP", "EUR", "JPY", "CHF", "CAD", "AUD", "NZD"]);

export function parseLotSizeSymbol(raw: string): LotSizeSymbolInfo {
  const s = String(raw ?? "").trim().toUpperCase();
  if (s === "XAUUSD") return { kind: "metal", base: "XAU", quote: "USD" };
  if (/^[A-Z]{6}$/.test(s)) {
    const base = s.slice(0, 3);
    const quote = s.slice(3, 6);
    if (!KNOWN_FX.has(base) || !KNOWN_FX.has(quote)) return { kind: "unknown" };
    const pipSize = quote === "JPY" ? 0.01 : 0.0001;
    return { kind: "forex", base, quote, pipSize };
  }
  return { kind: "unknown" };
}

export type LotSizeCalculationInput = {
  symbol: string;
  accountCurrency: LotSizeCalcAccountCurrency;
  /** Intended risk (monetary amount) in the account currency. */
  riskAmount: number;
  /** Stop loss distance expressed in pips (forex) or $ move for XAUUSD. */
  stopLossPips: number;
  /**
   * Conversion from quote currency → account currency:
   * e.g. for quote=USD & account=GBP, `quoteToAccountRate` is USD→GBP (≈0.79).
   * Use 1 when quote === account.
   */
  quoteToAccountRate: number;
};

export type LotSizeCalculationResult =
  | {
      ok: true;
      kind: LotSizeSymbolKind;
      symbol: string;
      quoteCurrency: string;
      pipValuePerLotInAccountCurrency: number;
      lotSize: number; // rounded to 0.01
      intendedRisk: number;
      estimatedActualRisk: number;
      varianceRatio: number; // |actual-intended| / intended
      warnings: string[];
    }
  | {
      ok: false;
      reason: string;
      warnings: string[];
      // Optional debug/safety context when we can compute it (even if blocked).
      intendedRisk?: number;
      estimatedActualRisk?: number;
      varianceRatio?: number;
      suggestedLotSize?: number;
    };

function isFinitePositive(n: number): boolean {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

/**
 * Canonical base formula:
 * lotSize = riskAmount / (stopLossPips * pipValuePerLotInAccountCurrency)
 */
export function calculateLotSizeFromRiskAmount(input: LotSizeCalculationInput): LotSizeCalculationResult {
  const symbol = String(input.symbol ?? "").trim().toUpperCase();
  const info = parseLotSizeSymbol(symbol);

  const warnings: string[] = [];

  if (!isFinitePositive(input.riskAmount)) {
    return { ok: false, reason: "Enter a valid risk amount.", warnings };
  }
  if (!isFinitePositive(input.stopLossPips)) {
    return { ok: false, reason: "Enter a valid stop loss distance.", warnings };
  }
  if (info.kind === "unknown") {
    return { ok: false, reason: "Unsupported symbol. Please choose a valid asset.", warnings };
  }

  // Basic sanity ranges (defensive; avoids obviously unsafe outputs).
  if (info.kind === "forex" && input.stopLossPips > 5000) {
    return { ok: false, reason: "Stop loss looks unrealistic for forex (too large).", warnings };
  }
  if (info.kind === "metal" && input.stopLossPips > 500) {
    return { ok: false, reason: "Stop loss looks unrealistic for XAUUSD (too large).", warnings };
  }

  const quoteCurrency = info.kind === "forex" ? info.quote : info.quote;
  const needsFx = quoteCurrency !== input.accountCurrency;
  const quoteToAccountRate = needsFx ? input.quoteToAccountRate : 1;

  if (!isFinitePositive(quoteToAccountRate)) {
    return {
      ok: false,
      reason: needsFx
        ? `Enter a valid FX rate to convert ${quoteCurrency} → ${input.accountCurrency}.`
        : "Enter a valid FX rate.",
      warnings,
    };
  }

  let pipValuePerLotQuote: number;
  if (info.kind === "forex") {
    // Standard lot: 100,000 base units. Pip value in quote currency per pip.
    pipValuePerLotQuote = 100_000 * info.pipSize;
  } else {
    // XAUUSD (CFD/spot convention): 1.00 move per oz ≈ $100 per 1.00 for 1 lot (100 oz).
    // Here we interpret "stopLossPips" as $ move (e.g. 5 = $5 move).
    pipValuePerLotQuote = 100;
  }

  const pipValuePerLotInAccountCurrency = pipValuePerLotQuote * quoteToAccountRate;
  if (!isFinitePositive(pipValuePerLotInAccountCurrency)) {
    return { ok: false, reason: "Pip/point value could not be computed safely.", warnings };
  }

  const rawLotSize = input.riskAmount / (input.stopLossPips * pipValuePerLotInAccountCurrency);
  if (!Number.isFinite(rawLotSize) || rawLotSize <= 0) {
    return { ok: false, reason: "Lot size could not be computed safely.", warnings };
  }

  // Retail-friendly rounding: most brokers accept 0.01 lot steps.
  const lotSize = Number(rawLotSize.toFixed(2));

  // Guard: extremely large sizes are almost certainly wrong for this simplified model.
  if (lotSize > 100) {
    return { ok: false, reason: "Calculated lot size is unrealistically large. Check inputs and symbol.", warnings };
  }

  const estimatedActualRisk = lotSize * input.stopLossPips * pipValuePerLotInAccountCurrency;
  const varianceRatio = Math.abs(estimatedActualRisk - input.riskAmount) / input.riskAmount;

  // Hard safety gate: if rounding/model deviates by >1%, block output.
  if (varianceRatio > 0.01) {
    return {
      ok: false,
      reason:
        "Risk variance exceeds 1% (after rounding). Adjust inputs or confirm with your broker before placing a trade.",
      warnings: [
        ...warnings,
        `Variance ${(varianceRatio * 100).toFixed(2)}% between intended and estimated actual risk.`,
      ],
      intendedRisk: input.riskAmount,
      estimatedActualRisk,
      varianceRatio,
      suggestedLotSize: lotSize,
    };
  }

  if (needsFx) {
    warnings.push(`Uses FX conversion ${quoteCurrency}→${input.accountCurrency}. Confirm rate matches your broker.`);
  }
  if (info.kind === "metal") {
    warnings.push("XAUUSD uses an estimated contract value (100 oz per 1.00 move per lot). Confirm with your broker.");
  }

  return {
    ok: true,
    kind: info.kind,
    symbol,
    quoteCurrency,
    pipValuePerLotInAccountCurrency,
    lotSize,
    intendedRisk: input.riskAmount,
    estimatedActualRisk,
    varianceRatio,
    warnings,
  };
}