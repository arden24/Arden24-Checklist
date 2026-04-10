"use client";

import { useMemo } from "react";
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

export default function LotSizeCalculator() {
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

  return (
    <div className="w-full min-w-0 max-w-full rounded-2xl border border-white/10 bg-zinc-900 p-4 shadow-lg sm:p-6">
      <h2 className="mb-4 text-2xl font-semibold text-white">Lot Size Calculator</h2>

      <div className="mb-4">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Market</span>
          <select
            value={market}
            onChange={(e) => setCalc((c) => ({ ...c, market: e.target.value }))}
            className={inputClass}
          >
            <option value="">Select market type</option>
            <option value="Forex">Forex</option>
            <option value="Stocks">Stocks</option>
            <option value="Indices">Indices</option>
            <option value="Commodities">Commodities</option>
            <option value="Cryptocurrencies">Cryptocurrencies</option>
            <option value="Bonds">Bonds</option>
            <option value="Futures">Futures</option>
            <option value="Options">Options</option>
            <option value="ETFs">ETFs</option>
            <option value="CFDs">CFDs</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Account currency</span>
          <select
            value={accountCurrency}
            onChange={(e) =>
              setCalc((c) => ({
                ...c,
                accountCurrency: e.target.value as "GBP" | "USD" | "EUR",
              }))
            }
            className={inputClass}
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label} ({c.symbol})
              </option>
            ))}
          </select>
        </label>

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

        <label className="flex flex-col gap-2">
          <span className={labelClass}>Asset</span>
          <select
            value={asset}
            onChange={(e) => setCalc((c) => ({ ...c, asset: e.target.value }))}
            className={inputClass}
          >
            {Object.keys(pipValues).map((pair) => (
              <option key={pair} value={pair}>
                {pair}
              </option>
            ))}
          </select>
        </label>

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
