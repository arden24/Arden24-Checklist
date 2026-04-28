import test from "node:test";
import assert from "node:assert/strict";
import { calculatePositionSize, getPresetSpec } from "./lot-size";

// Helper: approximate equality.
function close(a: number, b: number, tol = 0.01) {
  assert.ok(Number.isFinite(a) && Number.isFinite(b), `Expected finite numbers, got ${a} and ${b}`);
  assert.ok(Math.abs(a - b) <= tol, `Expected ${a} ≈ ${b} (tol=${tol})`);
}

test("EURUSD preset: GBP account sizing uses tick model", () => {
  const spec = getPresetSpec("EURUSD", "GBP");
  const r = calculatePositionSize({
    spec,
    riskAmount: 160,
    stopDistance: 20,
    exchangeRate: 0.79, // USD -> GBP
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.roundedPositionSize, 1.01);
  close(r.actualRisk, r.roundedPositionSize * r.riskPerPositionUnit, 0.0001);
});

test("GBPUSD preset: GBP account", () => {
  const spec = getPresetSpec("GBPUSD", "GBP");
  const r = calculatePositionSize({
    spec,
    riskAmount: 158,
    stopDistance: 40,
    exchangeRate: 0.79,
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.roundedPositionSize, 0.5);
});

test("GBPJPY preset: GBP account", () => {
  const spec = getPresetSpec("GBPJPY", "GBP");
  const r = calculatePositionSize({
    spec,
    riskAmount: 160,
    stopDistance: 50,
    exchangeRate: 0.0052, // JPY -> GBP
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.roundedPositionSize, 0.61);
});

test("USDJPY preset: GBP account", () => {
  const spec = getPresetSpec("USDJPY", "GBP");
  const r = calculatePositionSize({
    spec,
    riskAmount: 160,
    stopDistance: 25,
    exchangeRate: 0.0052,
  });
  assert.equal(r.ok, true);
});

test("EURJPY preset: GBP account", () => {
  const spec = getPresetSpec("EURJPY", "GBP");
  const r = calculatePositionSize({
    spec,
    riskAmount: 160,
    stopDistance: 30,
    exchangeRate: 0.0052,
  });
  assert.equal(r.ok, true);
});

test("XAUUSD preset: GBP account", () => {
  const spec = getPresetSpec("XAUUSD", "GBP");
  const r = calculatePositionSize({
    spec,
    riskAmount: 160,
    stopDistance: 5,
    exchangeRate: 0.8,
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.roundedPositionSize, 0.4);
});

test("NAS100 preset sizing (requires exchange rate when account not USD)", () => {
  const spec = getPresetSpec("NAS100", "GBP");
  const missing = calculatePositionSize({ spec, riskAmount: 160, stopDistance: 100 });
  assert.equal(missing.ok, false);
  const ok = calculatePositionSize({ spec, riskAmount: 158, stopDistance: 100, exchangeRate: 0.79 });
  assert.equal(ok.ok, true);
});

test("USOIL preset sizing", () => {
  const spec = getPresetSpec("USOIL", "GBP");
  const r = calculatePositionSize({ spec, riskAmount: 160, stopDistance: 1, exchangeRate: 0.79 });
  assert.equal(r.ok, true);
});

test("BTCUSD preset sizing", () => {
  const spec = getPresetSpec("BTCUSD", "GBP");
  const r = calculatePositionSize({ spec, riskAmount: 160, stopDistance: 500, exchangeRate: 0.79 });
  assert.equal(r.ok, true);
});

test("AAPL share sizing (stop in $ per share)", () => {
  const spec = getPresetSpec("AAPL", "USD");
  const r = calculatePositionSize({ spec, riskAmount: 160, stopDistance: 2 });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  // risk per share = $2.00; expected 80 shares
  assert.equal(r.roundedPositionSize, 80);
});

test("SPY ETF sizing", () => {
  const spec = getPresetSpec("SPY", "USD");
  const r = calculatePositionSize({ spec, riskAmount: 200, stopDistance: 1 });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.roundedPositionSize, 200);
});

test("Futures contract sizing (advanced spec)", () => {
  const spec = {
    assetClass: "future" as const,
    symbol: "ES",
    accountCurrency: "USD" as const,
    instrumentCurrency: "USD",
    tickValueCurrency: "USD",
    contractSize: 1,
    tickSize: 0.25,
    tickValue: 12.5,
    positionStep: 1,
    minPositionSize: 1,
    maxPositionSize: 1000,
    stopDistanceUnit: "ticks" as const,
    outputLabel: "contracts" as const,
  };
  const r = calculatePositionSize({ spec, riskAmount: 500, stopDistance: 10 }); // exact with step=1
  assert.equal(r.ok, true);
});

test("Options premium sizing (advanced spec)", () => {
  const spec = {
    assetClass: "option" as const,
    symbol: "AAPL_CALL",
    accountCurrency: "USD" as const,
    instrumentCurrency: "USD",
    tickValueCurrency: "USD",
    contractSize: 100,
    tickSize: 0.01,
    tickValue: 1, // $0.01 premium move * 100 = $1 per tick per contract
    positionStep: 1,
    minPositionSize: 1,
    maxPositionSize: 10000,
    stopDistanceUnit: "premium" as const,
    outputLabel: "contracts" as const,
  };
  const r = calculatePositionSize({ spec, riskAmount: 200, stopDistance: 0.5 }); // $0.50 premium move
  assert.equal(r.ok, true);
});

test("Custom CFD: missing exchange rate when required blocks", () => {
  const spec = {
    assetClass: "cfd" as const,
    symbol: "CFD_X",
    accountCurrency: "GBP" as const,
    instrumentCurrency: "USD",
    tickValueCurrency: "USD",
    contractSize: 1,
    tickSize: 1,
    tickValue: 1,
    positionStep: 0.1,
    minPositionSize: 0.1,
    maxPositionSize: 1000,
    stopDistanceUnit: "custom" as const,
    outputLabel: "position_size" as const,
  };
  const r = calculatePositionSize({ spec, riskAmount: 100, stopDistance: 50 });
  assert.equal(r.ok, false);
});

test("Exchange rate not required when currencies match", () => {
  const spec = getPresetSpec("UK100", "GBP");
  const r = calculatePositionSize({ spec, riskAmount: 100, stopDistance: 50 });
  assert.equal(r.ok, true);
});

test("Invalid tick size blocks", () => {
  const spec = { ...getPresetSpec("EURUSD", "GBP"), tickSize: 0 };
  const r = calculatePositionSize({ spec, riskAmount: 100, stopDistance: 20, exchangeRate: 0.79 });
  assert.equal(r.ok, false);
});

test("Invalid tick value blocks", () => {
  const spec = { ...getPresetSpec("EURUSD", "GBP"), tickValue: -1 };
  const r = calculatePositionSize({ spec, riskAmount: 100, stopDistance: 20, exchangeRate: 0.79 });
  assert.equal(r.ok, false);
});

test("Rounding down to positionStep", () => {
  const spec = { ...getPresetSpec("EURUSD", "GBP"), positionStep: 0.1 };
  const r = calculatePositionSize({ spec, riskAmount: 160, stopDistance: 20, exchangeRate: 0.79 });
  assert.equal(r.ok, false); // will likely breach 1% variance once forced to 0.1 steps
});

test("Below min position size blocks", () => {
  const spec = { ...getPresetSpec("EURUSD", "GBP"), minPositionSize: 5 };
  const r = calculatePositionSize({ spec, riskAmount: 160, stopDistance: 20, exchangeRate: 0.79 });
  assert.equal(r.ok, false);
});

test("Above max position size blocks", () => {
  const spec = { ...getPresetSpec("EURUSD", "GBP"), maxPositionSize: 0.5 };
  const r = calculatePositionSize({ spec, riskAmount: 160, stopDistance: 20, exchangeRate: 0.79 });
  assert.equal(r.ok, false);
});

test("Variance above 1% blocks", () => {
  const spec = { ...getPresetSpec("EURUSD", "GBP"), positionStep: 0.5 };
  const r = calculatePositionSize({ spec, riskAmount: 160, stopDistance: 20, exchangeRate: 0.79 });
  assert.equal(r.ok, false);
});

test("Leverage does not affect position size; only margin", () => {
  const spec = getPresetSpec("AAPL", "USD");
  const base = calculatePositionSize({ spec, riskAmount: 160, stopDistance: 2 });
  const withLev = calculatePositionSize({ spec, riskAmount: 160, stopDistance: 2, leverage: 10, currentPrice: 200, availableMargin: 1000 });
  assert.equal(base.ok, true);
  assert.equal(withLev.ok, true);
  if (base.ok && withLev.ok) {
    assert.equal(base.roundedPositionSize, withLev.roundedPositionSize);
    assert.ok(withLev.margin);
  }
});

test("Margin required calculation (simple)", () => {
  const spec = getPresetSpec("AAPL", "USD");
  const r = calculatePositionSize({ spec, riskAmount: 160, stopDistance: 2, leverage: 10, currentPrice: 200, availableMargin: 1000 });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.ok(r.margin);
  if (!r.margin) return;
  // 80 shares * $200 = $16000 notional; /10 = $1600 margin
  assert.equal(Math.round(r.margin.marginRequiredAccountCurrency), 1600);
});

test("Edge: zero stop loss blocks output", () => {
  const spec = getPresetSpec("EURUSD", "GBP");
  const r = calculatePositionSize({ spec, riskAmount: 160, stopDistance: 0, exchangeRate: 0.79 });
  assert.equal(r.ok, false);
});

test("Edge: invalid symbol blocks output", () => {
  const spec = {
    ...getPresetSpec("EURUSD", "GBP"),
    symbol: "INVALID",
  };
  const r = calculatePositionSize({ spec, riskAmount: 160, stopDistance: 20, exchangeRate: 0.79 });
  assert.equal(r.ok, false);
});

