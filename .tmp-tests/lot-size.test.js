"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const lot_size_1 = require("./lot-size");
// Helper: approximate equality.
function close(a, b, tol = 0.01) {
    strict_1.default.ok(Number.isFinite(a) && Number.isFinite(b), `Expected finite numbers, got ${a} and ${b}`);
    strict_1.default.ok(Math.abs(a - b) <= tol, `Expected ${a} ≈ ${b} (tol=${tol})`);
}
(0, node_test_1.default)("EURUSD preset: GBP account sizing uses tick model", () => {
    const spec = (0, lot_size_1.getPresetSpec)("EURUSD", "GBP");
    const r = (0, lot_size_1.calculatePositionSize)({
        spec,
        riskAmount: 160,
        stopDistance: 20,
        exchangeRate: 0.79, // USD -> GBP
    });
    strict_1.default.equal(r.ok, true);
    if (!r.ok)
        return;
    strict_1.default.equal(r.roundedPositionSize, 1.01);
    close(r.actualRisk, r.roundedPositionSize * r.riskPerPositionUnit, 0.0001);
});
(0, node_test_1.default)("GBPUSD preset: GBP account", () => {
    const spec = (0, lot_size_1.getPresetSpec)("GBPUSD", "GBP");
    const r = (0, lot_size_1.calculatePositionSize)({
        spec,
        riskAmount: 158,
        stopDistance: 40,
        exchangeRate: 0.79,
    });
    strict_1.default.equal(r.ok, true);
    if (!r.ok)
        return;
    strict_1.default.equal(r.roundedPositionSize, 0.5);
});
(0, node_test_1.default)("GBPJPY preset: GBP account", () => {
    const spec = (0, lot_size_1.getPresetSpec)("GBPJPY", "GBP");
    const r = (0, lot_size_1.calculatePositionSize)({
        spec,
        riskAmount: 160,
        stopDistance: 50,
        exchangeRate: 0.0052, // JPY -> GBP
    });
    strict_1.default.equal(r.ok, true);
    if (!r.ok)
        return;
    strict_1.default.equal(r.roundedPositionSize, 0.61);
});
(0, node_test_1.default)("USDJPY preset: GBP account", () => {
    const spec = (0, lot_size_1.getPresetSpec)("USDJPY", "GBP");
    const r = (0, lot_size_1.calculatePositionSize)({
        spec,
        riskAmount: 160,
        stopDistance: 25,
        exchangeRate: 0.0052,
    });
    strict_1.default.equal(r.ok, true);
});
(0, node_test_1.default)("EURJPY preset: GBP account", () => {
    const spec = (0, lot_size_1.getPresetSpec)("EURJPY", "GBP");
    const r = (0, lot_size_1.calculatePositionSize)({
        spec,
        riskAmount: 160,
        stopDistance: 30,
        exchangeRate: 0.0052,
    });
    strict_1.default.equal(r.ok, true);
});
(0, node_test_1.default)("XAUUSD preset: GBP account", () => {
    const spec = (0, lot_size_1.getPresetSpec)("XAUUSD", "GBP");
    const r = (0, lot_size_1.calculatePositionSize)({
        spec,
        riskAmount: 160,
        stopDistance: 5,
        exchangeRate: 0.8,
    });
    strict_1.default.equal(r.ok, true);
    if (!r.ok)
        return;
    strict_1.default.equal(r.roundedPositionSize, 0.4);
});
(0, node_test_1.default)("NAS100 preset sizing (requires exchange rate when account not USD)", () => {
    const spec = (0, lot_size_1.getPresetSpec)("NAS100", "GBP");
    const missing = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 160, stopDistance: 100 });
    strict_1.default.equal(missing.ok, false);
    const ok = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 158, stopDistance: 100, exchangeRate: 0.79 });
    strict_1.default.equal(ok.ok, true);
});
(0, node_test_1.default)("USOIL preset sizing", () => {
    const spec = (0, lot_size_1.getPresetSpec)("USOIL", "GBP");
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 160, stopDistance: 1, exchangeRate: 0.79 });
    strict_1.default.equal(r.ok, true);
});
(0, node_test_1.default)("BTCUSD preset sizing", () => {
    const spec = (0, lot_size_1.getPresetSpec)("BTCUSD", "GBP");
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 160, stopDistance: 500, exchangeRate: 0.79 });
    strict_1.default.equal(r.ok, true);
});
(0, node_test_1.default)("AAPL share sizing (stop in $ per share)", () => {
    const spec = (0, lot_size_1.getPresetSpec)("AAPL", "USD");
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 160, stopDistance: 2 });
    strict_1.default.equal(r.ok, true);
    if (!r.ok)
        return;
    // risk per share = $2.00; expected 80 shares
    strict_1.default.equal(r.roundedPositionSize, 80);
});
(0, node_test_1.default)("SPY ETF sizing", () => {
    const spec = (0, lot_size_1.getPresetSpec)("SPY", "USD");
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 200, stopDistance: 1 });
    strict_1.default.equal(r.ok, true);
    if (!r.ok)
        return;
    strict_1.default.equal(r.roundedPositionSize, 200);
});
(0, node_test_1.default)("Futures contract sizing (advanced spec)", () => {
    const spec = {
        assetClass: "future",
        symbol: "ES",
        accountCurrency: "USD",
        instrumentCurrency: "USD",
        tickValueCurrency: "USD",
        contractSize: 1,
        tickSize: 0.25,
        tickValue: 12.5,
        positionStep: 1,
        minPositionSize: 1,
        maxPositionSize: 1000,
        stopDistanceUnit: "ticks",
        outputLabel: "contracts",
    };
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 500, stopDistance: 10 }); // exact with step=1
    strict_1.default.equal(r.ok, true);
});
(0, node_test_1.default)("Options premium sizing (advanced spec)", () => {
    const spec = {
        assetClass: "option",
        symbol: "AAPL_CALL",
        accountCurrency: "USD",
        instrumentCurrency: "USD",
        tickValueCurrency: "USD",
        contractSize: 100,
        tickSize: 0.01,
        tickValue: 1, // $0.01 premium move * 100 = $1 per tick per contract
        positionStep: 1,
        minPositionSize: 1,
        maxPositionSize: 10000,
        stopDistanceUnit: "premium",
        outputLabel: "contracts",
    };
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 200, stopDistance: 0.5 }); // $0.50 premium move
    strict_1.default.equal(r.ok, true);
});
(0, node_test_1.default)("Custom CFD: missing exchange rate when required blocks", () => {
    const spec = {
        assetClass: "cfd",
        symbol: "CFD_X",
        accountCurrency: "GBP",
        instrumentCurrency: "USD",
        tickValueCurrency: "USD",
        contractSize: 1,
        tickSize: 1,
        tickValue: 1,
        positionStep: 0.1,
        minPositionSize: 0.1,
        maxPositionSize: 1000,
        stopDistanceUnit: "custom",
        outputLabel: "position_size",
    };
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 100, stopDistance: 50 });
    strict_1.default.equal(r.ok, false);
});
(0, node_test_1.default)("Exchange rate not required when currencies match", () => {
    const spec = (0, lot_size_1.getPresetSpec)("UK100", "GBP");
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 100, stopDistance: 50 });
    strict_1.default.equal(r.ok, true);
});
(0, node_test_1.default)("Invalid tick size blocks", () => {
    const spec = { ...(0, lot_size_1.getPresetSpec)("EURUSD", "GBP"), tickSize: 0 };
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 100, stopDistance: 20, exchangeRate: 0.79 });
    strict_1.default.equal(r.ok, false);
});
(0, node_test_1.default)("Invalid tick value blocks", () => {
    const spec = { ...(0, lot_size_1.getPresetSpec)("EURUSD", "GBP"), tickValue: -1 };
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 100, stopDistance: 20, exchangeRate: 0.79 });
    strict_1.default.equal(r.ok, false);
});
(0, node_test_1.default)("Rounding down to positionStep", () => {
    const spec = { ...(0, lot_size_1.getPresetSpec)("EURUSD", "GBP"), positionStep: 0.1 };
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 160, stopDistance: 20, exchangeRate: 0.79 });
    strict_1.default.equal(r.ok, false); // will likely breach 1% variance once forced to 0.1 steps
});
(0, node_test_1.default)("Below min position size blocks", () => {
    const spec = { ...(0, lot_size_1.getPresetSpec)("EURUSD", "GBP"), minPositionSize: 5 };
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 160, stopDistance: 20, exchangeRate: 0.79 });
    strict_1.default.equal(r.ok, false);
});
(0, node_test_1.default)("Above max position size blocks", () => {
    const spec = { ...(0, lot_size_1.getPresetSpec)("EURUSD", "GBP"), maxPositionSize: 0.5 };
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 160, stopDistance: 20, exchangeRate: 0.79 });
    strict_1.default.equal(r.ok, false);
});
(0, node_test_1.default)("Variance above 1% blocks", () => {
    const spec = { ...(0, lot_size_1.getPresetSpec)("EURUSD", "GBP"), positionStep: 0.5 };
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 160, stopDistance: 20, exchangeRate: 0.79 });
    strict_1.default.equal(r.ok, false);
});
(0, node_test_1.default)("Leverage does not affect position size; only margin", () => {
    const spec = (0, lot_size_1.getPresetSpec)("AAPL", "USD");
    const base = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 160, stopDistance: 2 });
    const withLev = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 160, stopDistance: 2, leverage: 10, currentPrice: 200, availableMargin: 1000 });
    strict_1.default.equal(base.ok, true);
    strict_1.default.equal(withLev.ok, true);
    if (base.ok && withLev.ok) {
        strict_1.default.equal(base.roundedPositionSize, withLev.roundedPositionSize);
        strict_1.default.ok(withLev.margin);
    }
});
(0, node_test_1.default)("Margin required calculation (simple)", () => {
    const spec = (0, lot_size_1.getPresetSpec)("AAPL", "USD");
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 160, stopDistance: 2, leverage: 10, currentPrice: 200, availableMargin: 1000 });
    strict_1.default.equal(r.ok, true);
    if (!r.ok)
        return;
    strict_1.default.ok(r.margin);
    if (!r.margin)
        return;
    // 80 shares * $200 = $16000 notional; /10 = $1600 margin
    strict_1.default.equal(Math.round(r.margin.marginRequiredAccountCurrency), 1600);
});
(0, node_test_1.default)("Edge: zero stop loss blocks output", () => {
    const spec = (0, lot_size_1.getPresetSpec)("EURUSD", "GBP");
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 160, stopDistance: 0, exchangeRate: 0.79 });
    strict_1.default.equal(r.ok, false);
});
(0, node_test_1.default)("Edge: invalid symbol blocks output", () => {
    const spec = {
        ...(0, lot_size_1.getPresetSpec)("EURUSD", "GBP"),
        symbol: "INVALID",
    };
    const r = (0, lot_size_1.calculatePositionSize)({ spec, riskAmount: 160, stopDistance: 20, exchangeRate: 0.79 });
    strict_1.default.equal(r.ok, false);
});
