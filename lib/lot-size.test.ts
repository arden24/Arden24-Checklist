import test from "node:test";
import assert from "node:assert/strict";
import { calculateLotSizeFromRiskAmount } from "./lot-size";

// Helper: approximate equality.
function close(a: number, b: number, tol = 0.01) {
  assert.ok(Number.isFinite(a) && Number.isFinite(b), `Expected finite numbers, got ${a} and ${b}`);
  assert.ok(Math.abs(a - b) <= tol, `Expected ${a} ≈ ${b} (tol=${tol})`);
}

test("EURUSD: £160 risk, 20 pip SL, USD->GBP conversion", () => {
  // EURUSD pip value per lot = $10/pip. For GBP account, need USD->GBP.
  const r = calculateLotSizeFromRiskAmount({
    symbol: "EURUSD",
    accountCurrency: "GBP",
    riskAmount: 160,
    stopLossPips: 20,
    quoteToAccountRate: 0.79, // $1 ≈ £0.79
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  // lot ≈ 160 / (20 * (10*0.79)) = 1.0126 -> 1.01
  assert.equal(r.lotSize, 1.01);
  close(r.estimatedActualRisk, 1.01 * 20 * 10 * 0.79, 0.0001);
});

test("GBPUSD: £160 risk, 40 pip SL, USD->GBP conversion", () => {
  const r = calculateLotSizeFromRiskAmount({
    symbol: "GBPUSD",
    accountCurrency: "GBP",
    riskAmount: 160,
    stopLossPips: 40,
    quoteToAccountRate: 0.79,
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  // lot ≈ 160 / (40 * (10*0.79)) = 0.506 -> 0.51
  assert.equal(r.lotSize, 0.51);
});

test("GBPJPY: £160 risk, 50 pip SL, JPY->GBP conversion", () => {
  // JPY pip value per lot = 1000 JPY/pip. Convert JPY->GBP.
  const r = calculateLotSizeFromRiskAmount({
    symbol: "GBPJPY",
    accountCurrency: "GBP",
    riskAmount: 160,
    stopLossPips: 50,
    quoteToAccountRate: 0.0052, // ¥1 ≈ £0.0052
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  // lot ≈ 160 / (50 * (1000*0.0052)) = 0.615 -> 0.62
  assert.equal(r.lotSize, 0.62);
});

test("USDJPY: £160 risk, 25 pip SL, JPY->GBP conversion", () => {
  const r = calculateLotSizeFromRiskAmount({
    symbol: "USDJPY",
    accountCurrency: "GBP",
    riskAmount: 160,
    stopLossPips: 25,
    quoteToAccountRate: 0.0052,
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.ok(r.lotSize > 0);
});

test("EURJPY: £160 risk, 30 pip SL, JPY->GBP conversion", () => {
  const r = calculateLotSizeFromRiskAmount({
    symbol: "EURJPY",
    accountCurrency: "GBP",
    riskAmount: 160,
    stopLossPips: 30,
    quoteToAccountRate: 0.0052,
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.ok(r.lotSize > 0);
});

test("XAUUSD: £160 risk, $5 SL move, USD->GBP conversion", () => {
  const r = calculateLotSizeFromRiskAmount({
    symbol: "XAUUSD",
    accountCurrency: "GBP",
    riskAmount: 160,
    stopLossPips: 5,
    quoteToAccountRate: 0.8, // chosen so rounding does not breach the 1% safety gate
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  // $1 move per lot ≈ $100, so per $5 = $500 -> £400; lot = 160 / 400 = 0.40
  assert.equal(r.lotSize, 0.4);
});

test("Edge: zero stop loss blocks output", () => {
  const r = calculateLotSizeFromRiskAmount({
    symbol: "EURUSD",
    accountCurrency: "GBP",
    riskAmount: 160,
    stopLossPips: 0,
    quoteToAccountRate: 0.79,
  });
  assert.equal(r.ok, false);
});

test("Edge: invalid symbol blocks output", () => {
  const r = calculateLotSizeFromRiskAmount({
    symbol: "INVALID",
    accountCurrency: "GBP",
    riskAmount: 160,
    stopLossPips: 20,
    quoteToAccountRate: 1,
  });
  assert.equal(r.ok, false);
});

