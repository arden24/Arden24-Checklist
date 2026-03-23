"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getStrategiesKey } from "@/lib/storage-keys";
import { createClient } from "@/lib/supabase/client";
import { insertStrategy } from "@/lib/supabase/strategies";
import type { ChecklistItem, Strategy } from "@/lib/supabase/strategies";
import { useSessionFormState } from "@/lib/hooks/useSessionFormState";
import { logError } from "@/lib/log-error";

function loadStrategies(key: string): Strategy[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as Strategy[];
  } catch {
    return [];
  }
}

function saveStrategies(strategies: Strategy[], key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(strategies));
}

type StrategyFormSnapshot = {
  name: string;
  description: string;
  market: string;
  timeframes: string;
  checklistItems: ChecklistItem[];
};

const STRATEGY_NEW_INITIAL: StrategyFormSnapshot = {
  name: "",
  description: "",
  market: "",
  timeframes: "",
  checklistItems: [
    { text: "", timeframe: "", image: undefined, weight: 1, critical: false },
  ],
};

export default function StrategyForm() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const strategiesKey = getStrategiesKey(user?.id);

  const [form, setForm, resetFormDraft] = useSessionFormState<StrategyFormSnapshot>(
    "page:strategy-new",
    STRATEGY_NEW_INITIAL
  );
  const { name, description, market, timeframes, checklistItems } = form;
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateChecklistItem(index: number, value: string) {
    setForm((f) => ({
      ...f,
      checklistItems: f.checklistItems.map((item, i) =>
        i === index ? { ...item, text: value } : item
      ),
    }));
  }

  function addChecklistItem() {
    setForm((f) => ({
      ...f,
      checklistItems: [
        ...f.checklistItems,
        { text: "", timeframe: "", image: undefined, weight: 1, critical: false },
      ],
    }));
  }

  function removeChecklistItem(index: number) {
    setForm((f) => ({
      ...f,
      checklistItems:
        f.checklistItems.length === 1
          ? f.checklistItems
          : f.checklistItems.filter((_, i) => i !== index),
    }));
  }

  function updateChecklistTimeframe(index: number, value: string) {
    setForm((f) => ({
      ...f,
      checklistItems: f.checklistItems.map((item, i) =>
        i === index ? { ...item, timeframe: value } : item
      ),
    }));
  }

  function updateChecklistWeight(index: number, value: string) {
    const nextWeight = Number(value);
    setForm((f) => ({
      ...f,
      checklistItems: f.checklistItems.map((item, i) =>
        i === index
          ? {
              ...item,
              weight: Number.isFinite(nextWeight) ? nextWeight : 1,
            }
          : item
      ),
    }));
  }

  function updateChecklistCritical(index: number, value: boolean) {
    setForm((f) => ({
      ...f,
      checklistItems: f.checklistItems.map((item, i) =>
        i === index ? { ...item, critical: value } : item
      ),
    }));
  }

  function handleChecklistImageChange(
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setForm((f) => ({
        ...f,
        checklistItems: f.checklistItems.map((item, i) =>
          i === index ? { ...item, image: result } : item
        ),
      }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please add a strategy name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedChecklist = checklistItems
        .map((item) => ({
          text: item.text.trim(),
          timeframe: item.timeframe.trim(),
          image: item.image,
          weight: item.weight,
          critical: item.critical,
        }))
        .filter((item) => item.text.length > 0);

      let savedToSupabase = false;

      if (supabase && user) {
        try {
          await insertStrategy(supabase, user.id, {
            name: name.trim(),
            description: description.trim(),
            market: market.trim(),
            timeframes: timeframes.trim(),
            checklist: trimmedChecklist,
          });
          savedToSupabase = true;
        } catch (err) {
          // If Supabase write fails (e.g. auth / RLS issue), fall back to local storage
          logError(err);
        }
      }

      if (!savedToSupabase) {
        const nextStrategy: Strategy = {
          id: crypto.randomUUID(),
          name: name.trim(),
          description: description.trim(),
          market: market.trim(),
          timeframes: timeframes.trim(),
          checklist: trimmedChecklist,
          createdAt: new Date().toISOString(),
        };
        const existing = loadStrategies(strategiesKey);
        saveStrategies([nextStrategy, ...existing], strategiesKey);
      }

      resetFormDraft();
      router.push("/strategies");
    } catch (err) {
      logError(err);
      alert("Failed to save strategy. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-lg"
    >
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-200">
          Strategy name
        </label>
        <input
          value={name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="London breakout, NY session mean reversion..."
          className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-200">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Outline the core idea of the setup, entry logic, and what you are trying to capture."
          rows={4}
          className="w-full resize-none rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-200">Market</label>
          <select
            value={market}
            onChange={(e) => setForm((f) => ({ ...f, market: e.target.value }))}
            className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="">Select market</option>
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
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-200">
            Timeframes (summary)
          </label>
          <input
            value={timeframes}
            onChange={(e) => setForm((f) => ({ ...f, timeframes: e.target.value }))}
            placeholder="e.g. HTF: 4H / 1H · Execution: 5m / 1m"
            className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-200">
              Checklist items
            </p>
            <p className="text-xs text-zinc-400">
              Add the exact conditions you want to see before taking a trade.
            </p>
          </div>

          <button
            type="button"
            onClick={addChecklistItem}
            className="rounded-full border border-sky-500/60 px-3 py-1 text-xs font-semibold text-sky-400 hover:bg-sky-500/10"
          >
            + Add item
          </button>
        </div>

        <div className="space-y-2">
          {checklistItems.map((item, index) => (
            <div key={index} className="space-y-2 rounded-xl bg-zinc-900/60 p-3">
              <div className="flex flex-wrap gap-2">
                <input
                  value={item.text}
                  onChange={(e) => updateChecklistItem(index, e.target.value)}
                  placeholder={`Checklist item ${index + 1}`}
                  className="flex-1 rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
                />
                <input
                  value={item.timeframe}
                  onChange={(e) =>
                    updateChecklistTimeframe(index, e.target.value)
                  }
                  placeholder="TF (e.g. 1H)"
                  className="w-24 rounded-xl bg-zinc-800 px-2 py-2 text-xs text-white outline-none placeholder:text-zinc-500"
                />
                <input
                  type="number"
                  value={item.weight}
                  onChange={(e) => updateChecklistWeight(index, e.target.value)}
                  placeholder="Weight"
                  min={0}
                  step={1}
                  className="w-24 rounded-xl bg-zinc-800 px-2 py-2 text-xs text-white outline-none placeholder:text-zinc-500"
                />
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={item.critical}
                    onChange={(e) =>
                      updateChecklistCritical(index, e.target.checked)
                    }
                    className="h-4 w-4 rounded border-zinc-600 bg-slate-950 text-sky-500 focus:ring-0"
                  />
                  Critical
                </label>
                <button
                  type="button"
                  onClick={() => removeChecklistItem(index)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  aria-label="Remove checklist item"
                >
                  ×
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                  <span className="rounded-lg border border-sky-500/60 bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-300">
                    {item.image ? "Change screenshot" : "Add screenshot"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleChecklistImageChange(index, e)}
                  />
                </label>
                {item.timeframe && (
                  <span className="rounded-full bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300">
                    TF: {item.timeframe}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/5 pt-4 text-xs text-zinc-500">
        <p>
          This app is for journaling, discipline, and self-review only. Nothing
          here is financial advice or a recommendation to trade.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={resetFormDraft}
            className="rounded-xl border border-white/20 px-5 py-3 text-sm font-medium text-zinc-200 hover:border-sky-400/60 hover:text-sky-300"
          >
            Reset draft
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-black disabled:opacity-70"
          >
            {isSubmitting ? "Saving strategy..." : "Save strategy"}
          </button>
        </div>
      </div>
    </form>
  );
}
