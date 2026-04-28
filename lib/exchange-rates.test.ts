import test from "node:test";
import assert from "node:assert/strict";
import { getExchangeRate, isExchangeRateRequired } from "./exchange-rates";
import { calculatePositionSize, getPresetSpec } from "./lot-size";

test("exchange rate not required when currencies match", () => {
  assert.equal(isExchangeRateRequired("GBP", "GBP"), false);
});

test("USD -> GBP fallback", () => {
  assert.equal(getExchangeRate("USD", "GBP"), 0.79);
});

test("EUR -> GBP fallback", () => {
  assert.equal(getExchangeRate("EUR", "GBP"), 0.85);
});

test("JPY -> GBP fallback", () => {
  assert.equal(getExchangeRate("JPY", "GBP"), 0.0052);
});

test("GBP -> USD fallback", () => {
  assert.equal(getExchangeRate("GBP", "USD"), 1.27);
});

test("USD -> EUR fallback", () => {
  assert.equal(getExchangeRate("USD", "EUR"), 0.92);
});

test("unsupported conversion returns null", () => {
  assert.equal(getExchangeRate("SEK", "GBP"), null);
});

test("manual exchange rate overrides fallback", () => {
  const spec = getPresetSpec("EURUSD", "GBP");
  const fallback = getExchangeRate("USD", "GBP");
  assert.equal(typeof fallback, "number");
  const auto = calculatePositionSize({
    spec,
    riskAmount: 160,
    stopDistance: 20,
    exchangeRate: fallback as number,
  });
  const manual = calculatePositionSize({
    spec,
    riskAmount: 160,
    stopDistance: 20,
    exchangeRate: 0.75,
  });
  assert.equal(auto.ok, true);
  assert.equal(manual.ok, true);
  if (!auto.ok || !manual.ok) return;
  assert.notEqual(auto.roundedPositionSize, manual.roundedPositionSize);
});

test("calculation blocks when exchange rate required but missing", () => {
  const spec = getPresetSpec("EURUSD", "GBP");
  const r = calculatePositionSize({
    spec,
    riskAmount: 160,
    stopDistance: 20,
  });
  assert.equal(r.ok, false);
});

