"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { insertOpenTrade } from "@/lib/supabase/open-trades";
import { addOpenTrade, type OpenTrade } from "@/lib/journal";
import { logError } from "@/lib/log-error";

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

export default function TradeForm() {
  const { user } = useAuth();
  const supabase = createClient();
  const [market, setMarket] = useState("");
  const [pair, setPair] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [session, setSession] = useState("");
  const [direction, setDirection] = useState<"Buy" | "Sell" | "">("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      alert("Please enter a pair or instrument.");
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
      handleReset();
      alert("Trade opened. Close it from the Live Trades tab when done.");
    } catch (err) {
      logError(err);
      alert("Failed to save open trade. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setMarket("");
    setPair("");
    setLotSize("");
    setEntryPrice("");
    setStopLoss("");
    setTakeProfit("");
    setSession("");
    setDirection("");
    setNotes("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 rounded-xl bg-zinc-900 p-6">
      <h2 className="mb-4 text-xl font-bold">Log trade (open)</h2>
      <p className="mb-4 text-xs text-zinc-400">
        Log the trade when you enter. Add the outcome later from Live Trades.
      </p>

      <select
        value={market}
        onChange={(e) => setMarket(e.target.value)}
        className="mb-3 w-full rounded bg-zinc-800 p-3 text-sm text-white"
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

      <input
        placeholder="Pair / instrument (e.g. EURUSD, XAUUSD)"
        value={pair}
        onChange={(e) => setPair(e.target.value)}
        className="mb-3 w-full rounded bg-zinc-800 p-3"
      />

      <input
        placeholder="Lot size"
        value={lotSize}
        onChange={(e) => setLotSize(e.target.value)}
        className="mb-3 w-full rounded bg-zinc-800 p-3"
      />

      <div className="mb-3">
        <p className="mb-2 text-xs font-medium text-zinc-400">Entry, stop loss & take profit</p>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            step="any"
            placeholder="Entry"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className="w-full rounded bg-zinc-800 p-3 text-sm text-white"
          />
          <input
            type="number"
            step="any"
            placeholder="Stop loss"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="w-full rounded bg-zinc-800 p-3 text-sm text-white"
          />
          <input
            type="number"
            step="any"
            placeholder="Take profit"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            className="w-full rounded bg-zinc-800 p-3 text-sm text-white"
          />
        </div>
        {rrLabel && (
          <p className="mt-2 text-xs text-sky-400">
            Risk:reward = {rrLabel}
          </p>
        )}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <select
          value={session}
          onChange={(e) => setSession(e.target.value)}
          className="w-full rounded bg-zinc-800 p-3 text-sm text-white"
        >
          <option value="">Session</option>
          <option value="Tokyo">Tokyo</option>
          <option value="London">London</option>
          <option value="New York">New York</option>
        </select>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as "Buy" | "Sell" | "")}
          className="w-full rounded bg-zinc-800 p-3 text-sm text-white"
        >
          <option value="">Direction</option>
          <option value="Buy">Buy</option>
          <option value="Sell">Sell</option>
        </select>
      </div>

      <textarea
        placeholder="Entry notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="mb-4 w-full resize-none rounded bg-zinc-800 p-3 text-sm"
        rows={2}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={submitting} className="rounded bg-sky-500 px-4 py-3 font-bold disabled:opacity-50">
          Open trade
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded border border-white/20 px-4 py-3 font-medium text-zinc-200 hover:border-sky-400/60 hover:text-sky-300"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
