"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getStrategiesKey } from "@/lib/storage-keys";
import { createClient } from "@/lib/supabase/client";
import { logError } from "@/lib/log-error";
import {
  fetchStrategyById,
  updateStrategy,
  type Strategy,
  type ChecklistItem,
} from "@/lib/supabase/strategies";

function normaliseChecklist(
  checklist: Strategy["checklist"]
): ChecklistItem[] {
  if (!checklist || checklist.length === 0)
    return [{ text: "", timeframe: "", image: undefined, weight: 1, critical: false }];
  return checklist.map((item) =>
    typeof item === "string"
      ? { text: item, timeframe: "", image: undefined, weight: 1, critical: false }
      : {
          text: item.text ?? "",
          timeframe: item.timeframe ?? "",
          image: item.image,
          weight: Number.isFinite(Number(item.weight)) ? Number(item.weight) : 1,
          critical: Boolean(item.critical),
        }
  );
}

export default function EditStrategyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const strategiesKey = getStrategiesKey(user?.id);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [market, setMarket] = useState("");
  const [timeframes, setTimeframes] = useState("");
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id;
    if (!id) {
      setLoading(false);
      return;
    }
    if (supabase && user) {
      fetchStrategyById(supabase, id)
        .then((s) => {
          if (s) {
            setStrategy(s);
            setName(s.name);
            setDescription(s.description);
            setMarket(s.market);
            setTimeframes(s.timeframes);
            setChecklistItems(normaliseChecklist(s.checklist));
          }
        })
        .catch(logError)
        .finally(() => setLoading(false));
    } else if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(strategiesKey);
        const parsed = raw ? (JSON.parse(raw) as Strategy[]) : [];
        const found = parsed.find((s) => s.id === id);
        if (found) {
          setStrategy(found);
          setName(found.name);
          setDescription(found.description);
          setMarket(found.market);
          setTimeframes(found.timeframes);
          setChecklistItems(normaliseChecklist(found.checklist));
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
  }, [params.id, strategiesKey, supabase, user]);

  function updateChecklistItem(index: number, value: string) {
    setChecklistItems((items) =>
      items.map((item, i) =>
        i === index ? { ...item, text: value } : item
      )
    );
  }

  function addChecklistItem() {
    setChecklistItems((items) => [
      ...items,
      { text: "", timeframe: "", image: undefined, weight: 1, critical: false },
    ]);
  }

  function removeChecklistItem(index: number) {
    setChecklistItems((items) =>
      items.length === 1 ? items : items.filter((_, i) => i !== index)
    );
  }

  function updateChecklistTimeframe(index: number, value: string) {
    setChecklistItems((items) =>
      items.map((item, i) =>
        i === index ? { ...item, timeframe: value } : item
      )
    );
  }

  function updateChecklistWeight(index: number, value: string) {
    const nextWeight = Number(value);
    setChecklistItems((items) =>
      items.map((item, i) =>
        i === index
          ? { ...item, weight: Number.isFinite(nextWeight) ? nextWeight : 1 }
          : item
      )
    );
  }

  function updateChecklistCritical(index: number, value: boolean) {
    setChecklistItems((items) =>
      items.map((item, i) => (i === index ? { ...item, critical: value } : item))
    );
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
      setChecklistItems((items) =>
        items.map((item, i) =>
          i === index ? { ...item, image: result } : item
        )
      );
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!strategy) return;
    if (!name.trim()) {
      alert("Please add a strategy name.");
      return;
    }

    setIsSaving(true);
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

      if (supabase && user) {
        await updateStrategy(supabase, strategy.id, {
          name: name.trim(),
          description: description.trim(),
          market: market.trim(),
          timeframes: timeframes.trim(),
          checklist: trimmedChecklist,
        });
      } else {
        const updatedStrategy: Strategy = {
          ...strategy,
          name: name.trim(),
          description: description.trim(),
          market: market.trim(),
          timeframes: timeframes.trim(),
          checklist: trimmedChecklist,
        };
        const raw = window.localStorage.getItem(strategiesKey);
        const all = raw ? (JSON.parse(raw) as Strategy[]) : [];
        const next = all.map((s) => (s.id === strategy.id ? updatedStrategy : s));
        window.localStorage.setItem(strategiesKey, JSON.stringify(next));
      }

      router.push("/strategies");
    } catch (err) {
      logError(err);
      alert("Failed to save strategy. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading || !strategy) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-zinc-400">
            {loading ? "Loading strategy…" : "Strategy not found."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← Back
        </button>

        <header className="mt-4 space-y-2">
          <h1 className="text-3xl font-bold">Edit strategy</h1>
          <p className="text-sm text-zinc-400">
            Update the rules and checklist for this strategy.
          </p>
        </header>

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
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-200">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-200">
                Market
              </label>
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value)}
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
                onChange={(e) => setTimeframes(e.target.value)}
                placeholder="e.g. 1H, 15M, 5M"
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
                  Update the exact conditions you want to see before taking a
                  trade.
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
                      onChange={(e) =>
                        updateChecklistItem(index, e.target.value)
                      }
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
                      onChange={(e) =>
                        updateChecklistWeight(index, e.target.value)
                      }
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

          <div className="flex justify-end border-t border-white/5 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-black disabled:opacity-70"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

