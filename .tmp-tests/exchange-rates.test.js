"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const exchange_rates_1 = require("./exchange-rates");
const lot_size_1 = require("./lot-size");
(0, node_test_1.default)("exchange rate not required when currencies match", () => {
    strict_1.default.equal((0, exchange_rates_1.isExchangeRateRequired)("GBP", "GBP"), false);
});
(0, node_test_1.default)("USD -> GBP fallback", () => {
    strict_1.default.equal((0, exchange_rates_1.getExchangeRate)("USD", "GBP"), 0.79);
});
(0, node_test_1.default)("EUR -> GBP fallback", () => {
    strict_1.default.equal((0, exchange_rates_1.getExchangeRate)("EUR", "GBP"), 0.85);
});
(0, node_test_1.default)("JPY -> GBP fallback", () => {
    strict_1.default.equal((0, exchange_rates_1.getExchangeRate)("JPY", "GBP"), 0.0052);
});
(0, node_test_1.default)("GBP -> USD fallback", () => {
    strict_1.default.equal((0, exchange_rates_1.getExchangeRate)("GBP", "USD"), 1.27);
});
(0, node_test_1.default)("USD -> EUR fallback", () => {
    strict_1.default.equal((0, exchange_rates_1.getExchangeRate)("USD", "EUR"), 0.92);
});
(0, node_test_1.default)("unsupported conversion returns null", () => {
    strict_1.default.equal((0, exchange_rates_1.getExchangeRate)("SEK", "GBP"), null);
});
(0, node_test_1.default)("manual exchange rate overrides fallback", () => {
    const spec = (0, lot_size_1.getPresetSpec)("EURUSD", "GBP");
    const fallback = (0, exchange_rates_1.getExchangeRate)("USD", "GBP");
    strict_1.default.equal(typeof fallback, "number");
    const auto = (0, lot_size_1.calculatePositionSize)({
        spec,
        riskAmount: 160,
        stopDistance: 20,
        exchangeRate: fallback,
    });
    const manual = (0, lot_size_1.calculatePositionSize)({
        spec,
        riskAmount: 160,
        stopDistance: 20,
        exchangeRate: 0.75,
    });
    strict_1.default.equal(auto.ok, true);
    strict_1.default.equal(manual.ok, true);
    if (!auto.ok || !manual.ok)
        return;
    strict_1.default.notEqual(auto.roundedPositionSize, manual.roundedPositionSize);
});
(0, node_test_1.default)("calculation blocks when exchange rate required but missing", () => {
    const spec = (0, lot_size_1.getPresetSpec)("EURUSD", "GBP");
    const r = (0, lot_size_1.calculatePositionSize)({
        spec,
        riskAmount: 160,
        stopDistance: 20,
    });
    strict_1.default.equal(r.ok, false);
});
