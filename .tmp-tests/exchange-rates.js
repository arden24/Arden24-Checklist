"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportedCurrencies = void 0;
exports.isExchangeRateRequired = isExchangeRateRequired;
exports.getExchangeRate = getExchangeRate;
exports.supportedCurrencies = [
    "GBP",
    "USD",
    "EUR",
    "JPY",
    "CHF",
    "CAD",
    "AUD",
    "NZD",
];
const FALLBACK_RATES = {
    // GBP base
    GBP_USD: 1.27,
    GBP_EUR: 1.17,
    GBP_JPY: 191.0,
    GBP_CHF: 1.13,
    GBP_CAD: 1.73,
    GBP_AUD: 1.93,
    GBP_NZD: 2.08,
    // USD base
    USD_GBP: 0.79,
    USD_EUR: 0.92,
    USD_JPY: 150.0,
    USD_CHF: 0.89,
    USD_CAD: 1.36,
    USD_AUD: 1.52,
    USD_NZD: 1.64,
    // EUR base
    EUR_GBP: 0.85,
    EUR_USD: 1.09,
    EUR_JPY: 163.0,
    EUR_CHF: 0.97,
    EUR_CAD: 1.48,
    EUR_AUD: 1.65,
    EUR_NZD: 1.78,
    // JPY quote conversions often needed for FX pip-value conversion to account currency
    JPY_GBP: 0.0052,
    JPY_USD: 0.0067,
    JPY_EUR: 0.0061,
};
function normalize(code) {
    return String(code ?? "").trim().toUpperCase();
}
function isExchangeRateRequired(fromCurrency, toCurrency) {
    const from = normalize(fromCurrency);
    const to = normalize(toCurrency);
    return from !== "" && to !== "" && from !== to;
}
function getExchangeRate(fromCurrency, toCurrency) {
    const from = normalize(fromCurrency);
    const to = normalize(toCurrency);
    if (from === "" || to === "")
        return null;
    if (from === to)
        return 1;
    const key = `${from}_${to}`;
    return FALLBACK_RATES[key] ?? null;
}
