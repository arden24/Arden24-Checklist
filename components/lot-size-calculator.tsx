"use client";

import { useMemo } from "react";
import { AppSelect, type AppSelectOption } from "@/components/AppSelect";
import { ASSET_CLASSES, calculatePositionSize, calculateRiskAmount, getPresetSpec, type AccountCurrency, type AssetClass, type PositionSizeLabel, type PresetId } from "@/lib/lot-size";
import { getExchangeRate, isExchangeRateRequired } from "@/lib/exchange-rates";
import { useArden24SessionDraft } from "@/lib/hooks/useArden24SessionDraft";
import {
  ARDEN24_LOT_SIZE_DRAFT_KEY,
  LEGACY_LOT_SIZE_DRAFT_KEYS,
} from "@/lib/session-draft-keys";

const CURRENCIES = [
  { value: "GBP", symbol: "£", label: "GBP" },
  { value: "USD", symbol: "$", label: "USD" },
  { value: "EUR", symbol: "€", label: "EUR" },
] as const;

const ASSET_CLASS_OPTIONS: AppSelectOption<AssetClass>[] = ASSET_CLASSES.map((v) => ({
  value: v,
  label:
    v === "forex"
      ? "Forex"
      : v === "stock"
        ? "Stock"
        : v === "etf"
          ? "ETF"
          : v === "index"
            ? "Index"
            : v === "commodity"
              ? "Commodity"
              : v === "crypto"
                ? "Crypto"
                : v === "bond"
                  ? "Bond"
                  : v === "future"
                    ? "Future"
                    : v === "option"
                      ? "Option"
                      : v === "cfd"
                        ? "CFD"
                        : "Custom",
}));

const ACCOUNT_CURRENCY_OPTIONS: AppSelectOption<"GBP" | "USD" | "EUR">[] =
  CURRENCIES.map((c) => ({
    value: c.value,
    label: `${c.label} (${c.symbol})`,
  }));

type RiskInputMode = "percent" | "amount";

type CalcMode = "simple" | "advanced";

type LotCalcSessionState = {
  mode: CalcMode;
  presetId: PresetId;
  accountCurrency: AccountCurrency;
  accountSize: number;
  riskInputMode: RiskInputMode;
  riskPercent: number;
  riskAmountInput: number;

  // Shared / advanced specs
  assetClass: AssetClass;
  symbol: string;
  instrumentCurrency: string;
  tickValueCurrency: string;
  contractSize: number;
  tickSize: number;
  tickValue: number;
  positionStep: number;
  minPositionSize: number;
  maxPositionSize: number;

  // Inputs
  stopDistance: number;
  exchangeRate: number;
  exchangeRateMode: "manual" | "auto";

  // Margin feasibility (optional)
  currentPrice: number;
  leverage: number;
  availableMargin: number;

  confirmedSpecs: boolean;
};

const LOT_CALC_INITIAL: LotCalcSessionState = {
  mode: "simple",
  presetId: "EURUSD",
  accountCurrency: "GBP",
  accountSize: 10000,
  riskInputMode: "percent",
  riskPercent: 1,
  riskAmountInput: 100,

  assetClass: "forex",
  symbol: "EURUSD",
  instrumentCurrency: "USD",
  tickValueCurrency: "USD",
  contractSize: 100000,
  tickSize: 1,
  tickValue: 10,
  positionStep: 0.01,
  minPositionSize: 0.01,
  maxPositionSize: 100,

  stopDistance: 20,
  exchangeRate: 1,
  exchangeRateMode: "manual",

  currentPrice: 0,
  leverage: 0,
  availableMargin: 0,

  confirmedSpecs: false,
};

type LotSizeCalculatorProps = {
  /**
   * When true (e.g. dashboard next to TradeForm), omit the inner title and match the
   * trade form’s outer shell (`mt-8 rounded-xl bg-zinc-900 …`) so grey panels align.
   */
  embedded?: boolean;
};

export default function LotSizeCalculator({ embedded = false }: LotSizeCalculatorProps) {
  const [calc, setCalc, resetCalc] = useArden24SessionDraft<LotCalcSessionState>(
    ARDEN24_LOT_SIZE_DRAFT_KEY,
    LOT_CALC_INITIAL,
    LEGACY_LOT_SIZE_DRAFT_KEYS
  );

  const {
    mode,
    presetId,
    accountCurrency,
    accountSize,
    riskInputMode,
    riskPercent,
    riskAmountInput,
    assetClass,
    symbol,
    instrumentCurrency,
    tickValueCurrency,
    contractSize,
    tickSize,
    tickValue,
    positionStep,
    minPositionSize,
    maxPositionSize,
    stopDistance,
    exchangeRate,
    exchangeRateMode,
    currentPrice,
    leverage,
    availableMargin,
    confirmedSpecs,
  } = calc;

  const currency = CURRENCIES.find((c) => c.value === accountCurrency) ?? CURRENCIES[0];

  const presetOptions: AppSelectOption<PresetId>[] = useMemo(
    () => [
      { value: "EURUSD", label: "EURUSD" },
      { value: "GBPUSD", label: "GBPUSD" },
      { value: "GBPJPY", label: "GBPJPY" },
      { value: "USDJPY", label: "USDJPY" },
      { value: "EURJPY", label: "EURJPY" },
      { value: "XAUUSD", label: "XAUUSD" },
      { value: "NAS100", label: "NAS100" },
      { value: "US30", label: "US30" },
      { value: "SPX500", label: "SPX500" },
      { value: "UK100", label: "UK100" },
      { value: "GER40", label: "GER40" },
      { value: "USOIL", label: "USOIL" },
      { value: "BTCUSD", label: "BTCUSD" },
      { value: "ETHUSD", label: "ETHUSD" },
      { value: "AAPL", label: "AAPL" },
      { value: "TSLA", label: "TSLA" },
      { value: "SPY", label: "SPY" },
      { value: "TLT", label: "TLT" },
    ],
    [],
  );

  const riskAmount = useMemo(() => {
    if (riskInputMode === "percent") {
      return calculateRiskAmount(accountSize, riskPercent);
    }
    return riskAmountInput;
  }, [riskInputMode, accountSize, riskPercent, riskAmountInput]);

  const effectiveRiskPercent = useMemo(
    () => (accountSize > 0 ? (riskAmount / accountSize) * 100 : 0),
    [riskAmount, accountSize]
  );

  const resolvedSpec = useMemo(() => {
    if (mode === "simple") {
      return getPresetSpec(presetId, accountCurrency);
    }
    return {
      assetClass,
      symbol: symbol.trim().toUpperCase() || "CUSTOM",
      accountCurrency,
      instrumentCurrency: instrumentCurrency.trim().toUpperCase() || accountCurrency,
      tickValueCurrency: tickValueCurrency.trim().toUpperCase() || accountCurrency,
      contractSize,
      tickSize,
      tickValue,
      positionStep,
      minPositionSize,
      maxPositionSize,
      stopDistanceUnit: "custom" as const,
      outputLabel: "position_size" as PositionSizeLabel,
    };
  }, [
    mode,
    presetId,
    accountCurrency,
    assetClass,
    symbol,
    instrumentCurrency,
    tickValueCurrency,
    contractSize,
    tickSize,
    tickValue,
    positionStep,
    minPositionSize,
    maxPositionSize,
  ]);

  const exchangeRateRequired = isExchangeRateRequired(
    resolvedSpec.tickValueCurrency,
    resolvedSpec.accountCurrency
  );
  const estimatedExchangeRate = exchangeRateRequired
    ? getExchangeRate(resolvedSpec.tickValueCurrency, resolvedSpec.accountCurrency)
    : 1;

  const calcResult = useMemo(() => {
    return calculatePositionSize({
      spec: resolvedSpec,
      riskAmount,
      stopDistance,
      exchangeRate: exchangeRateRequired ? exchangeRate : 1,
      currentPrice: currentPrice > 0 ? currentPrice : undefined,
      leverage: leverage > 0 ? leverage : undefined,
      availableMargin: availableMargin > 0 ? availableMargin : undefined,
    });
  }, [resolvedSpec, riskAmount, stopDistance, exchangeRateRequired, exchangeRate, currentPrice, leverage, availableMargin]);

  const intendedRisk = riskAmount;
  const estimatedActualRisk = calcResult.ok
    ? calcResult.actualRisk
    : calcResult.debug?.actualRisk ?? null;

  const variancePct =
    calcResult.ok
      ? calcResult.varianceRatio * 100
      : calcResult.debug?.varianceRatio != null
        ? calcResult.debug.varianceRatio * 100
        : null;

  const suggestedPositionSize = calcResult.ok ? calcResult.roundedPositionSize : null;

  const outputLabel = useMemo(() => {
    const l = resolvedSpec.outputLabel;
    if (l === "lot_size") return "Suggested lot size";
    if (l === "shares_units") return "Suggested shares/units";
    if (l === "contracts") return "Suggested contracts";
    if (l === "units") return "Suggested units";
    return "Suggested position size";
  }, [resolvedSpec.outputLabel]);

  const stopLabel = useMemo(() => {
    if (mode === "simple") {
      if (resolvedSpec.assetClass === "forex") return "Stop loss (pips)";
      if (resolvedSpec.assetClass === "stock" || resolvedSpec.assetClass === "etf") return `Stop loss (${currency.symbol} per share)`;
      if (resolvedSpec.assetClass === "index") return "Stop loss (points)";
      if (resolvedSpec.assetClass === "commodity") return "Stop loss (points / price move)";
      if (resolvedSpec.assetClass === "crypto") return "Stop loss (price move)";
      if (resolvedSpec.assetClass === "future") return "Stop loss (ticks / points)";
      if (resolvedSpec.assetClass === "option") return "Stop loss (premium move)";
      if (resolvedSpec.assetClass === "cfd") return "Stop loss (points / pips)";
      return "Stop loss distance";
    }
    // Advanced mode: user-defined (show generic).
    return "Stop loss distance";
  }, [mode, resolvedSpec.assetClass, currency.symbol]);

  function handleReset() {
    resetCalc();
  }

  function toggleRiskInputMode() {
    if (riskInputMode === "percent") {
      setCalc((c) => ({
        ...c,
        riskAmountInput: riskAmount,
        riskInputMode: "amount",
      }));
    } else {
      setCalc((c) => ({
        ...c,
        riskPercent: effectiveRiskPercent,
        riskInputMode: "percent",
      }));
    }
  }

  const inputClass = "rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white outline-none w-full";
  const labelClass = "text-sm text-zinc-300";

  const shellClass = embedded
    ? "mt-8 w-full min-w-0 max-w-full rounded-xl bg-zinc-900 p-4 sm:p-6"
    : "w-full min-w-0 max-w-full rounded-2xl border border-white/10 bg-zinc-900 p-4 shadow-lg sm:p-6";

  return (
    <div className={shellClass}>
      {!embedded ? (
        <h2 className="mb-4 text-2xl font-semibold text-white">Position Size Calculator</h2>
      ) : null}

      <div className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
        <p className="font-semibold">
          Different brokers use different contract sizes, tick values, spreads, commissions and minimum trade sizes.
          Confirm these settings with your broker before placing any trade.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCalc((c) => ({ ...c, mode: "simple" }))}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
            mode === "simple" ? "border-sky-400/60 bg-sky-500/20 text-sky-100" : "border-white/10 bg-black/30 text-zinc-300 hover:border-white/20"
          }`}
        >
          Simple Mode
        </button>
        <button
          type="button"
          onClick={() => setCalc((c) => ({ ...c, mode: "advanced" }))}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
            mode === "advanced" ? "border-sky-400/60 bg-sky-500/20 text-sky-100" : "border-white/10 bg-black/30 text-zinc-300 hover:border-white/20"
          }`}
        >
          Advanced Broker Specs Mode
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AppSelect<"GBP" | "USD" | "EUR">
          label="Account currency"
          value={accountCurrency}
          onChange={(v) => setCalc((c) => ({ ...c, accountCurrency: v }))}
          options={ACCOUNT_CURRENCY_OPTIONS}
        />

        <label className="flex flex-col gap-2">
          <span className={labelClass}>Account size ({currency.symbol})</span>
          <input
            type="number"
            value={accountSize}
            onChange={(e) => setCalc((c) => ({ ...c, accountSize: Number(e.target.value) }))}
            className={inputClass}
          />
        </label>

        <div className="flex flex-col gap-2 md:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <span className={labelClass}>
              {riskInputMode === "percent" ? "Risk %" : `Risk amount (${currency.symbol})`}
            </span>
            <button
              type="button"
              onClick={toggleRiskInputMode}
              className="rounded-lg border border-white/20 px-2 py-1 text-xs font-medium text-zinc-300 hover:border-sky-400/50 hover:text-sky-300"
            >
              Use {riskInputMode === "percent" ? "amount" : "%"}
            </button>
          </div>
          {riskInputMode === "percent" ? (
            <input
              type="number"
              step="0.1"
              value={riskPercent}
              onChange={(e) => setCalc((c) => ({ ...c, riskPercent: Number(e.target.value) }))}
              className={inputClass}
            />
          ) : (
            <input
              type="number"
              step="0.01"
              value={riskAmountInput}
              onChange={(e) =>
                setCalc((c) => ({ ...c, riskAmountInput: Number(e.target.value) }))
              }
              className={inputClass}
            />
          )}
        </div>

        {mode === "simple" ? (
          <AppSelect<PresetId>
            label="Instrument preset"
            value={presetId}
            onChange={(v) => {
              const spec = getPresetSpec(v, accountCurrency);
              setCalc((c) => ({
                ...c,
                presetId: v,
                assetClass: spec.assetClass,
                symbol: spec.symbol,
                instrumentCurrency: String(spec.instrumentCurrency),
                tickValueCurrency: String(spec.tickValueCurrency),
                contractSize: spec.contractSize,
                tickSize: spec.tickSize,
                tickValue: spec.tickValue,
                positionStep: spec.positionStep,
                minPositionSize: spec.minPositionSize,
                maxPositionSize: spec.maxPositionSize,
                exchangeRateMode: "manual",
                confirmedSpecs: false,
              }));
            }}
            options={presetOptions}
          />
        ) : (
          <AppSelect<AssetClass>
            label="Asset class"
            value={assetClass}
            onChange={(v) => setCalc((c) => ({ ...c, assetClass: v }))}
            options={ASSET_CLASS_OPTIONS}
          />
        )}

        <label className="flex flex-col gap-2">
          <span className={labelClass}>{stopLabel}</span>
          <input
            type="number"
            step="0.1"
            value={stopDistance}
            onChange={(e) => setCalc((c) => ({ ...c, stopDistance: Number(e.target.value) }))}
            className={inputClass}
          />
        </label>

        {exchangeRateRequired ? (
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className={labelClass}>Exchange rate ({resolvedSpec.tickValueCurrency} → {accountCurrency})</span>
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-100/95">
              Exchange rate required: {resolvedSpec.tickValueCurrency} → {accountCurrency}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (estimatedExchangeRate == null) return;
                  setCalc((c) => ({
                    ...c,
                    exchangeRate: estimatedExchangeRate,
                    exchangeRateMode: "auto",
                  }));
                }}
                className="rounded-lg border border-sky-400/50 bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={estimatedExchangeRate == null}
              >
                Auto-fill rate
              </button>
              <button
                type="button"
                onClick={() => setCalc((c) => ({ ...c, exchangeRateMode: "manual" }))}
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:border-white/35"
              >
                Manual override
              </button>
            </div>
            <input
              type="number"
              step="0.0001"
              value={exchangeRate}
              onChange={(e) =>
                setCalc((c) => ({
                  ...c,
                  exchangeRate: Number(e.target.value),
                  exchangeRateMode: "manual",
                }))
              }
              className={inputClass}
            />
            {estimatedExchangeRate != null ? (
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                <p>
                  Estimated rate: <span className="font-semibold text-white">{estimatedExchangeRate}</span>
                </p>
                <p className="mt-1 text-zinc-500">Last checked: static fallback</p>
                <p className="mt-1 text-zinc-500">Confirm with your broker before placing a trade.</p>
                <p className="mt-1 text-zinc-500">Mode: {exchangeRateMode === "auto" ? "Auto-filled (editable)" : "Manual override"}</p>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/95">
                No estimated rate available. Enter your broker’s conversion rate manually.
              </div>
            )}
            <p className="text-xs text-zinc-500">
              Exchange rates vary by broker, spread and execution time. Use your broker’s rate for final confirmation.
            </p>
          </label>
        ) : null}

        {mode === "advanced" ? (
          <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Symbol</span>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setCalc((c) => ({ ...c, symbol: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Instrument currency</span>
              <input
                type="text"
                value={instrumentCurrency}
                onChange={(e) => setCalc((c) => ({ ...c, instrumentCurrency: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Tick value currency</span>
              <input
                type="text"
                value={tickValueCurrency}
                onChange={(e) => setCalc((c) => ({ ...c, tickValueCurrency: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Contract size</span>
              <input
                type="number"
                step="any"
                value={contractSize}
                onChange={(e) => setCalc((c) => ({ ...c, contractSize: Number(e.target.value) }))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Tick size</span>
              <input
                type="number"
                step="any"
                value={tickSize}
                onChange={(e) => setCalc((c) => ({ ...c, tickSize: Number(e.target.value) }))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Tick value</span>
              <input
                type="number"
                step="any"
                value={tickValue}
                onChange={(e) => setCalc((c) => ({ ...c, tickValue: Number(e.target.value) }))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Position step</span>
              <input
                type="number"
                step="any"
                value={positionStep}
                onChange={(e) => setCalc((c) => ({ ...c, positionStep: Number(e.target.value) }))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Min position size</span>
              <input
                type="number"
                step="any"
                value={minPositionSize}
                onChange={(e) => setCalc((c) => ({ ...c, minPositionSize: Number(e.target.value) }))}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelClass}>Max position size</span>
              <input
                type="number"
                step="any"
                value={maxPositionSize}
                onChange={(e) => setCalc((c) => ({ ...c, maxPositionSize: Number(e.target.value) }))}
                className={inputClass}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-zinc-800 p-4">
          <p className="text-sm text-zinc-400">
            Risk amount {riskInputMode === "amount" ? "" : `(${effectiveRiskPercent.toFixed(1)}%)`}
          </p>
          <p className="text-2xl font-bold text-white">
            {currency.symbol}
            {riskAmount.toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl bg-zinc-800 p-4">
          <p className="text-sm text-zinc-400">{outputLabel}</p>
          <p className="text-2xl font-bold text-sky-400">
            {calcResult.ok && confirmedSpecs ? calcResult.roundedPositionSize : "—"}
          </p>
          {!calcResult.ok ? (
            <p className="mt-2 text-xs font-medium text-red-300/95">
              {calcResult.reason}
            </p>
          ) : !confirmedSpecs ? (
            <p className="mt-2 text-xs font-medium text-amber-200/95">
              Tick the confirmation below to reveal the suggested position size.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Calculated risk check</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-zinc-500">Intended risk</p>
            <p className="mt-1 font-semibold text-white">
              {currency.symbol}
              {intendedRisk.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Estimated actual risk</p>
            <p className="mt-1 font-semibold text-white">
              {estimatedActualRisk != null ? `${currency.symbol}${estimatedActualRisk.toFixed(2)}` : "—"}
            </p>
          </div>
        </div>

        {variancePct != null ? (
          <p className={`mt-2 text-xs font-medium ${variancePct > 1 ? "text-red-300/95" : "text-zinc-500"}`}>
            Variance: {variancePct.toFixed(2)}%
            {variancePct > 1 ? " (blocked)" : ""}
          </p>
        ) : null}

        {calcResult.ok ? (
          <p className="mt-3 text-xs text-zinc-500">
            Core formula: riskPerUnit = (stopDistance / tickSize) × tickValue(account currency). Position size = risk / riskPerUnit.
          </p>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
        <label className="flex items-start gap-3 text-sm text-zinc-200">
          <input
            type="checkbox"
            checked={confirmedSpecs}
            onChange={(e) => setCalc((c) => ({ ...c, confirmedSpecs: e.target.checked }))}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-zinc-900"
          />
          <span>
            <span className="font-semibold text-white">
              I have checked these instrument specifications against my broker.
            </span>
            <span className="mt-1 block text-xs text-zinc-500">
              Until you confirm, the suggested position size is hidden as a safety measure.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Margin check (optional)</p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className={labelClass}>Current price</span>
            <input
              type="number"
              step="any"
              value={currentPrice}
              onChange={(e) => setCalc((c) => ({ ...c, currentPrice: Number(e.target.value) }))}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className={labelClass}>Leverage (e.g. 100 for 1:100)</span>
            <input
              type="number"
              step="any"
              value={leverage}
              onChange={(e) => setCalc((c) => ({ ...c, leverage: Number(e.target.value) }))}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className={labelClass}>Available margin ({currency.symbol})</span>
            <input
              type="number"
              step="any"
              value={availableMargin}
              onChange={(e) => setCalc((c) => ({ ...c, availableMargin: Number(e.target.value) }))}
              className={inputClass}
            />
          </label>
        </div>

        {calcResult.ok && calcResult.margin ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 text-sm">
            <p className="text-xs text-zinc-500">Margin required</p>
            <p className="mt-1 font-semibold text-white">
              {currency.symbol}
              {calcResult.margin.marginRequiredAccountCurrency.toFixed(2)}
            </p>
            {calcResult.margin.status === "insufficient" ? (
              <p className="mt-2 text-xs font-semibold text-red-300/95">
                Trade may not be possible — insufficient margin at current leverage.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-sky-400/60 hover:text-sky-300"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
