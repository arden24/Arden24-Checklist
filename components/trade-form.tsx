"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { insertOpenTrade } from "@/lib/supabase/open-trades";
import { addOpenTrade, type OpenTrade } from "@/lib/journal";
import { useArden24SessionDraft } from "@/lib/hooks/useArden24SessionDraft";
import {
  ARDEN24_TRADE_ENTRY_DRAFT_KEY,
  LEGACY_TRADE_ENTRY_DRAFT_KEYS,
} from "@/lib/session-draft-keys";
import { logError } from "@/lib/log-error";
import { AppSelect, type AppSelectOption } from "@/components/AppSelect";
import { useAppToast } from "@/contexts/AppToastContext";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeRiskReward(entry: number, stopLoss: number, takeProfit: number): string | null {
  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);
  if (risk <= 0) return null;
  const ratio = reward / risk;
  return `1:${ratio.toFixed(1)}`;
}

/** One shared draft for all “Log trade” instances (checklist + dashboard). */
type TradeFormFields = {
  market: string;
  pair: string;
  lotSize: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  session: string;
  direction: "" | "Buy" | "Sell";
  notes: string;
};

const TRADE_FORM_INITIAL: TradeFormFields = {
  market: "",
  pair: "",
  lotSize: "",
  entryPrice: "",
  stopLoss: "",
  takeProfit: "",
  session: "",
  direction: "",
  notes: "",
};

const MARKET_OPTIONS: AppSelectOption<string>[] = [
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

const SESSION_OPTIONS: AppSelectOption<string>[] = [
  { value: "", label: "Session" },
  { value: "Tokyo", label: "Tokyo" },
  { value: "London", label: "London" },
  { value: "New York", label: "New York" },
];

const DIRECTION_OPTIONS: AppSelectOption<"" | "Buy" | "Sell">[] = [
  { value: "", label: "Direction" },
  { value: "Buy", label: "Buy" },
  { value: "Sell", label: "Sell" },
];

export default function TradeForm() {
  const { user } = useAuth();
  const { pushToast } = useAppToast();
  const supabase = createClient();
  const [form, setForm, resetForm] = useArden24SessionDraft<TradeFormFields>(
    ARDEN24_TRADE_ENTRY_DRAFT_KEY,
    TRADE_FORM_INITIAL,
    LEGACY_TRADE_ENTRY_DRAFT_KEYS
  );
  const [submitting, setSubmitting] = useState(false);
  const [openingScreenshot, setOpeningScreenshot] = useState<string | null>(null);

  const { market, pair, lotSize, entryPrice, stopLoss, takeProfit, session, direction, notes } = form;

  const entryNum = parseFloat(entryPrice);
  const slNum = parseFloat(stopLoss);
  const tpNum = parseFloat(takeProfit);
  const rrLabel =
    !Number.isNaN(entryNum) && !Number.isNaN(slNum) && !Number.isNaN(tpNum)
      ? computeRiskReward(entryNum, slNum, tpNum)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pair.trim()) {
      pushToast("Please enter a pair or instrument.", "error");
      return;
    }
    const open: Omit<OpenTrade, "id" | "createdAt"> = {
      date: todayKey(),
      pair: pair.trim(),
      market: market.trim(),
      session: session.trim() || undefined,
      direction: direction || undefined,
      lotSize: lotSize.trim() || undefined,
      notes: notes.trim() || undefined,
      openingScreenshot: openingScreenshot ?? undefined,
    };
    setSubmitting(true);
    try {
      if (supabase && user) {
        await insertOpenTrade(supabase, user.id, open);
      } else {
        addOpenTrade(
          { ...open, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          user?.id
        );
      }
      resetForm();
      setOpeningScreenshot(null);
      pushToast("Trade opened. Close it from the Live Trades tab when done.", "success");
    } catch (err) {
      logError(err);
      pushToast("Failed to save open trade. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 w-full min-w-0 max-w-full rounded-xl bg-zinc-900 p-4 sm:p-6"
    >
      <h2 className="mb-4 text-xl font-bold">Log trade (open)</h2>
      <p className="mb-4 text-xs text-zinc-400">
        Log the trade when you enter. Add the outcome later from Live Trades.
      </p>

      <div className="mb-3">
        <AppSelect
          aria-label="Market type"
          value={market}
          onChange={(v) => setForm((f) => ({ ...f, market: v }))}
          options={MARKET_OPTIONS}
        />
      </div>

      <input
        placeholder="Pair / instrument (e.g. EURUSD, XAUUSD)"
        value={pair}
        onChange={(e) => setForm((f) => ({ ...f, pair: e.target.value }))}
        className="mb-3 w-full rounded bg-zinc-800 p-3"
      />

      <input
        placeholder="Lot size"
        value={lotSize}
        onChange={(e) => setForm((f) => ({ ...f, lotSize: e.target.value }))}
        className="mb-3 w-full rounded bg-zinc-800 p-3"
      />

      <div className="mb-3">
        <p className="mb-2 text-xs font-medium text-zinc-400">Entry, stop loss & take profit</p>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            type="number"
            step="any"
            placeholder="Entry"
            value={entryPrice}
            onChange={(e) => setForm((f) => ({ ...f, entryPrice: e.target.value }))}
            className="min-w-0 w-full rounded bg-zinc-800 p-3 text-sm text-white"
          />
          <input
            type="number"
            step="any"
            placeholder="Stop loss"
            value={stopLoss}
            onChange={(e) => setForm((f) => ({ ...f, stopLoss: e.target.value }))}
            className="min-w-0 w-full rounded bg-zinc-800 p-3 text-sm text-white"
          />
          <input
            type="number"
            step="any"
            placeholder="Take profit"
            value={takeProfit}
            onChange={(e) => setForm((f) => ({ ...f, takeProfit: e.target.value }))}
            className="min-w-0 w-full rounded bg-zinc-800 p-3 text-sm text-white"
          />
        </div>
        {rrLabel && (
          <p className="mt-2 text-xs text-sky-400">
            Risk:reward = {rrLabel}
          </p>
        )}
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AppSelect
          aria-label="Trading session"
          value={session}
          onChange={(v) => setForm((f) => ({ ...f, session: v }))}
          options={SESSION_OPTIONS}
        />
        <AppSelect
          aria-label="Trade direction"
          value={direction}
          onChange={(v) => setForm((f) => ({ ...f, direction: v }))}
          options={DIRECTION_OPTIONS}
        />
      </div>

      <textarea
        placeholder="Entry notes (optional)"
        value={notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        className="mb-4 w-full resize-none rounded bg-zinc-800 p-3 text-sm"
        rows={2}
      />

      <div className="mb-4">
        <p className="mb-1 text-xs text-zinc-500">Opening screenshot (Before)</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg border border-sky-500/50 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-300 hover:bg-sky-500/20">
            {openingScreenshot ? "Change screenshot" : "Add screenshot"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setOpeningScreenshot(reader.result as string);
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {openingScreenshot && (
            <button
              type="button"
              onClick={() => setOpeningScreenshot(null)}
              className="rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
            >
              Remove
            </button>
          )}
        </div>
        {openingScreenshot && (
          <div className="mt-2 w-full h-40 flex items-center justify-center rounded-lg border border-white/10 bg-black/5">
            <img
              src={openingScreenshot}
              alt="Opening trade screenshot"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={submitting} className="rounded bg-sky-500 px-4 py-3 font-bold disabled:opacity-50">
          Open trade
        </button>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setOpeningScreenshot(null);
          }}
          className="rounded border border-white/20 px-4 py-3 font-medium text-zinc-200 hover:border-sky-400/60 hover:text-sky-300"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
