"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSET_CLASSES = void 0;
exports.calculateRiskAmount = calculateRiskAmount;
exports.calculatePositionSize = calculatePositionSize;
exports.getPresetSpec = getPresetSpec;
function calculateRiskAmount(accountSize, riskPercent) {
    return (accountSize * riskPercent) / 100;
}
function isFinitePositive(n) {
    return typeof n === "number" && Number.isFinite(n) && n > 0;
}
exports.ASSET_CLASSES = [
    "forex",
    "stock",
    "index",
    "commodity",
    "crypto",
    "bond",
    "future",
    "option",
    "etf",
    "cfd",
    "custom",
];
function floorToStep(value, step) {
    if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0)
        return 0;
    const k = Math.floor(value / step);
    const out = k * step;
    // Avoid float noise.
    return Number(out.toFixed(10));
}
function calculatePositionSize(input) {
    const spec = input.spec;
    const warnings = [];
    const symbol = String(spec.symbol ?? "").trim().toUpperCase();
    if (symbol.length === 0) {
        return {
            ok: false,
            spec,
            reason: "Symbol is required.",
            exchangeRateRequired: false,
            warnings,
        };
    }
    if (spec.assetClass === "forex" && !/^[A-Z]{6}$/.test(symbol)) {
        return {
            ok: false,
            spec,
            reason: "Invalid forex symbol. Expected 6-letter pair like EURUSD.",
            exchangeRateRequired: false,
            warnings,
        };
    }
    const riskAmount = input.riskAmount;
    const stopDistance = input.stopDistance;
    if (!isFinitePositive(riskAmount)) {
        return { ok: false, spec, reason: "Enter a valid risk amount.", exchangeRateRequired: false, warnings };
    }
    if (!isFinitePositive(stopDistance)) {
        return { ok: false, spec, reason: "Enter a valid stop loss distance.", exchangeRateRequired: false, warnings };
    }
    if (!isFinitePositive(spec.tickSize)) {
        return { ok: false, spec, reason: "Tick size must be a positive number.", exchangeRateRequired: false, warnings };
    }
    if (!isFinitePositive(spec.tickValue)) {
        return { ok: false, spec, reason: "Tick value must be a positive number.", exchangeRateRequired: false, warnings };
    }
    if (!isFinitePositive(spec.positionStep)) {
        return {
            ok: false,
            spec,
            reason: "Position step must be a positive number.",
            exchangeRateRequired: false,
            warnings,
        };
    }
    if (!isFinitePositive(spec.contractSize)) {
        return {
            ok: false,
            spec,
            reason: "Contract size must be a positive number.",
            exchangeRateRequired: false,
            warnings,
        };
    }
    const exchangeRateRequired = spec.tickValueCurrency !== spec.accountCurrency;
    const exchangeRateUsed = exchangeRateRequired ? input.exchangeRate ?? NaN : 1;
    if (exchangeRateRequired && !isFinitePositive(exchangeRateUsed)) {
        return {
            ok: false,
            spec,
            reason: `Exchange rate required (${spec.tickValueCurrency} → ${spec.accountCurrency}).`,
            exchangeRateRequired: true,
            warnings,
        };
    }
    const tickValueInAccountCurrency = spec.tickValue * exchangeRateUsed;
    if (!isFinitePositive(tickValueInAccountCurrency)) {
        return {
            ok: false,
            spec,
            reason: "Tick value could not be converted safely.",
            exchangeRateRequired,
            warnings,
        };
    }
    // Core model:
    // riskPerPositionUnit = (stopDistance / tickSize) * tickValueInAccountCurrency
    const riskPerPositionUnit = (stopDistance / spec.tickSize) * tickValueInAccountCurrency;
    if (!isFinitePositive(riskPerPositionUnit)) {
        return { ok: false, spec, reason: "Risk per unit could not be computed safely.", exchangeRateRequired, warnings };
    }
    const rawPositionSize = riskAmount / riskPerPositionUnit;
    if (!Number.isFinite(rawPositionSize) || rawPositionSize <= 0) {
        return { ok: false, spec, reason: "Position size could not be computed safely.", exchangeRateRequired, warnings };
    }
    const roundedPositionSize = floorToStep(rawPositionSize, spec.positionStep);
    if (!isFinitePositive(roundedPositionSize)) {
        return {
            ok: false,
            spec,
            reason: "Rounded position size is below the minimum step. Increase risk or reduce stop distance.",
            exchangeRateRequired,
            warnings,
            debug: { rawPositionSize, roundedPositionSize },
        };
    }
    if (roundedPositionSize < spec.minPositionSize) {
        return {
            ok: false,
            spec,
            reason: "Calculated position size is below your broker’s minimum position size.",
            exchangeRateRequired,
            warnings,
            debug: { rawPositionSize, roundedPositionSize },
        };
    }
    if (roundedPositionSize > spec.maxPositionSize) {
        return {
            ok: false,
            spec,
            reason: "Calculated position size exceeds your broker’s maximum position size.",
            exchangeRateRequired,
            warnings,
            debug: { rawPositionSize, roundedPositionSize },
        };
    }
    const actualRisk = roundedPositionSize * riskPerPositionUnit;
    const varianceRatio = Math.abs(actualRisk - riskAmount) / riskAmount;
    // Critical safety: block if rounding creates >1% variance.
    if (varianceRatio > 0.01) {
        return {
            ok: false,
            spec,
            reason: "Calculation blocked because rounded position size creates more than 1% variance from intended risk.",
            exchangeRateRequired,
            warnings,
            debug: { rawPositionSize, roundedPositionSize, actualRisk, varianceRatio, riskPerPositionUnit, tickValueInAccountCurrency, exchangeRateUsed },
        };
    }
    // Margin check (does NOT affect sizing).
    let margin;
    const leverage = input.leverage;
    const currentPrice = input.currentPrice;
    const availableMargin = input.availableMargin;
    if (leverage != null && currentPrice != null && isFinitePositive(leverage) && isFinitePositive(currentPrice)) {
        // notionalValue = position * contractSize * currentPrice
        // marginRequired = notionalValue / leverage
        const notionalInstrument = roundedPositionSize * spec.contractSize * currentPrice;
        let notionalAccount = null;
        if (spec.instrumentCurrency === spec.accountCurrency) {
            notionalAccount = notionalInstrument;
        }
        else if (spec.instrumentCurrency === spec.tickValueCurrency) {
            // If instrument currency matches tick value currency, reuse the same exchange rate.
            notionalAccount = notionalInstrument * exchangeRateUsed;
            warnings.push("Margin conversion uses the same exchange rate as tick value conversion.");
        }
        else {
            warnings.push("Margin could not be converted to account currency (instrument currency differs).");
        }
        if (notionalAccount != null) {
            const marginRequired = notionalAccount / leverage;
            const status = availableMargin != null && Number.isFinite(availableMargin)
                ? marginRequired <= availableMargin
                    ? "ok"
                    : "insufficient"
                : "unknown";
            margin = {
                notionalValueAccountCurrency: notionalAccount,
                marginRequiredAccountCurrency: marginRequired,
                availableMarginAccountCurrency: availableMargin != null && Number.isFinite(availableMargin) ? availableMargin : null,
                status,
            };
        }
    }
    return {
        ok: true,
        spec,
        exchangeRateUsed,
        tickValueInAccountCurrency,
        riskPerPositionUnit,
        rawPositionSize,
        roundedPositionSize,
        actualRisk,
        varianceRatio,
        margin,
        warnings,
    };
}
function getPresetSpec(id, accountCurrency) {
    // Note: These are sensible defaults, NOT broker-authoritative.
    // Users must confirm against their broker (UI checkbox gate).
    const upper = String(id).toUpperCase();
    // Helper for forex: stopDistance in pips, tickSize=1 pip, tickValue = pip value per 1.00 lot.
    function fx(symbol, quote, pipValuePerLotQuote) {
        return {
            assetClass: "forex",
            symbol,
            accountCurrency,
            instrumentCurrency: quote,
            tickValueCurrency: quote,
            contractSize: 100_000,
            tickSize: 1,
            tickValue: pipValuePerLotQuote,
            positionStep: 0.01,
            minPositionSize: 0.01,
            maxPositionSize: 100,
            stopDistanceUnit: "pips",
            outputLabel: "lot_size",
        };
    }
    // Helper for stocks/etfs: stopDistance in account currency per share, tickSize=0.01, tickValue=$0.01 per share.
    function equity(symbol, currency) {
        return {
            assetClass: currency === "USD" ? "stock" : "stock",
            symbol,
            accountCurrency,
            instrumentCurrency: currency,
            tickValueCurrency: currency,
            contractSize: 1,
            tickSize: 0.01,
            tickValue: 0.01,
            positionStep: 1,
            minPositionSize: 1,
            maxPositionSize: 1_000_000,
            stopDistanceUnit: "price",
            outputLabel: "shares_units",
        };
    }
    if (upper === "EURUSD")
        return fx("EURUSD", "USD", 10);
    if (upper === "GBPUSD")
        return fx("GBPUSD", "USD", 10);
    if (upper === "USDJPY")
        return fx("USDJPY", "JPY", 1000);
    if (upper === "GBPJPY")
        return fx("GBPJPY", "JPY", 1000);
    if (upper === "EURJPY")
        return fx("EURJPY", "JPY", 1000);
    if (upper === "XAUUSD") {
        return {
            assetClass: "commodity",
            symbol: "XAUUSD",
            accountCurrency,
            instrumentCurrency: "USD",
            tickValueCurrency: "USD",
            contractSize: 100, // 100 oz per lot (common CFD convention; broker-specific)
            tickSize: 1, // $1 move
            tickValue: 100, // $100 per $1 move per 1 lot
            positionStep: 0.01,
            minPositionSize: 0.01,
            maxPositionSize: 100,
            stopDistanceUnit: "price",
            outputLabel: "lot_size",
        };
    }
    // Indices / CFDs are broker-specific; we provide common CFD-style tick defaults (must confirm).
    function indexCfd(symbol) {
        return {
            assetClass: "index",
            symbol,
            accountCurrency,
            instrumentCurrency: "USD",
            tickValueCurrency: "USD",
            contractSize: 1,
            tickSize: 1,
            tickValue: 1,
            positionStep: 0.1,
            minPositionSize: 0.1,
            maxPositionSize: 1000,
            stopDistanceUnit: "points",
            outputLabel: "contracts",
        };
    }
    if (upper === "NAS100")
        return indexCfd("NAS100");
    if (upper === "US30")
        return indexCfd("US30");
    if (upper === "SPX500")
        return indexCfd("SPX500");
    if (upper === "UK100")
        return { ...indexCfd("UK100"), instrumentCurrency: "GBP", tickValueCurrency: "GBP", tickValue: 1 };
    if (upper === "GER40")
        return { ...indexCfd("GER40"), instrumentCurrency: "EUR", tickValueCurrency: "EUR", tickValue: 1 };
    if (upper === "USOIL") {
        return {
            assetClass: "commodity",
            symbol: "USOIL",
            accountCurrency,
            instrumentCurrency: "USD",
            tickValueCurrency: "USD",
            contractSize: 1,
            tickSize: 0.01,
            tickValue: 0.01,
            positionStep: 0.01,
            minPositionSize: 0.01,
            maxPositionSize: 10000,
            stopDistanceUnit: "price",
            outputLabel: "contracts",
        };
    }
    // Crypto CFDs: unit sizing in coins, tick = $1 move per 1 coin (simplified).
    function crypto(symbol) {
        return {
            assetClass: "crypto",
            symbol,
            accountCurrency,
            instrumentCurrency: "USD",
            tickValueCurrency: "USD",
            contractSize: 1,
            tickSize: 1,
            tickValue: 1,
            positionStep: 0.0001,
            minPositionSize: 0.0001,
            maxPositionSize: 1_000_000,
            stopDistanceUnit: "price",
            outputLabel: "units",
        };
    }
    if (upper === "BTCUSD")
        return crypto("BTCUSD");
    if (upper === "ETHUSD")
        return crypto("ETHUSD");
    if (upper === "AAPL")
        return equity("AAPL", "USD");
    if (upper === "TSLA")
        return equity("TSLA", "USD");
    if (upper === "SPY")
        return { ...equity("SPY", "USD"), assetClass: "etf" };
    if (upper === "TLT")
        return { ...equity("TLT", "USD"), assetClass: "etf" };
    // Fallback should never happen for PresetId.
    return fx(String(upper), "USD", 10);
}
