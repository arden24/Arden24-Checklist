"use client";

import { useMemo } from "react";
import { AppSelect, type AppSelectOption } from "@/components/AppSelect";
import { calculateLotSize, calculateRiskAmount } from "@/lib/lot-size";
import { useArden24SessionDraft } from "@/lib/hooks/useArden24SessionDraft";
import {
  ARDEN24_LOT_SIZE_DRAFT_KEY,
  LEGACY_LOT_SIZE_DRAFT_KEYS,
} from "@/lib/session-draft-keys";

const pipValues: Record<string, number> = {
  EURUSD: 10,
  GBPUSD: 10,
  XAUUSD: 10,
  USDJPY: 9.13,
  GBPJPY: 9.13,
  NAS100: 1,
  US30: 1,
};

const CURRENCIES = [
  { value: "GBP", symbol: "£", label: "GBP" },
  { value: "USD", symbol: "$", label: "USD" },
  { value: "EUR", symbol: "€", label: "EUR" },
] as const;

const LOT_MARKET_OPTIONS: AppSelectOption<string>[] = [
  { value: "", label: "Select market type" },
  { value: "Forex", label: "Forex" },
  { value: "Stocks", label: "Stocks" },
  { value: "Indices", label: "Indices" },
  { value: "Commodities", label: "Commodities" },
  { value: "Cryptocurrencies", label: "Cryptocurrencies" },
  { value: "Bonds", label: "Bonds" },
  { value: "Futures", label: "Futures" },
  { value: "Options", label: "Options" },
  { value: "ETFs", label: "ETFs" },
  { value: "CFDs", label: "CFDs" },
];

const ACCOUNT_CURRENCY_OPTIONS: AppSelectOption<"GBP" | "USD" | "EUR">[] =
  CURRENCIES.map((c) => ({
    value: c.value,
    label: `${c.label} (${c.symbol})`,
  }));

type RiskInputMode = "percent" | "amount";

type LotCalcSessionState = {
  market: string;
  accountCurrency: "GBP" | "USD" | "EUR";
  accountSize: number;
  riskInputMode: RiskInputMode;
  riskPercent: number;
  riskAmountInput: number;
  asset: string;
  stopLossPips: number;
};

const LOT_CALC_INITIAL: LotCalcSessionState = {
  market: "",
  accountCurrency: "GBP",
  accountSize: 10000,
  riskInputMode: "percent",
  riskPercent: 1,
  riskAmountInput: 100,
  asset: "EURUSD",
  stopLossPips: 20,
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
    market,
    accountCurrency,
    accountSize,
    riskInputMode,
    riskPercent,
    riskAmountInput,
    asset,
    stopLossPips,
  } = calc;

  const pipValuePerStandardLot = pipValues[asset] ?? 10;
  const currency = CURRENCIES.find((c) => c.value === accountCurrency) ?? CURRENCIES[0];

  const assetOptions: AppSelectOption<string>[] = useMemo(
    () => Object.keys(pipValues).map((pair) => ({ value: pair, label: pair })),
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

  const lotSize = useMemo(
    () =>
      calculateLotSize({
        accountSize,
        riskPercent: effectiveRiskPercent,
        stopLossPips,
        pipValuePerStandardLot,
      }),
    [accountSize, effectiveRiskPercent, stopLossPips, pipValuePerStandardLot]
  );

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
        <h2 className="mb-4 text-2xl font-semibold text-white">Lot Size Calculator</h2>
      ) : null}

      <div className="mb-4">
        <AppSelect
          label="Market"
          value={market}
          onChange={(v) => setCalc((c) => ({ ...c, market: v }))}
          options={LOT_MARKET_OPTIONS}
        />
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

        <AppSelect
          label="Asset"
          value={asset}
          onChange={(v) => setCalc((c) => ({ ...c, asset: v }))}
          options={assetOptions}
        />

        <label className="flex flex-col gap-2">
          <span className={labelClass}>Stop Loss (pips)</span>
          <input
            type="number"
            step="0.1"
            value={stopLossPips}
            onChange={(e) => setCalc((c) => ({ ...c, stopLossPips: Number(e.target.value) }))}
            className={inputClass}
          />
        </label>
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
          <p className="text-sm text-zinc-400">Suggested lot size</p>
          <p className="text-2xl font-bold text-sky-400">{lotSize}</p>
        </div>
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
