"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TradeForm from "@/components/trade-form";
import { useAuth } from "@/contexts/AuthContext";
import { getStrategiesKey } from "@/lib/storage-keys";
import { createClient } from "@/lib/supabase/client";
import { fetchStrategies, type Strategy, type ChecklistItem } from "@/lib/supabase/strategies";

export default function ChecklistPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const strategiesKey = getStrategiesKey(user?.id);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [checked, setChecked] = useState<boolean[]>([]);

  const load = useCallback(() => {
    if (supabase && user) {
      fetchStrategies(supabase)
        .then((list) => {
          setStrategies(list);
          if (list.length > 0) {
            setActiveId(list[0].id);
            setChecked(new Array(list[0].checklist.length).fill(false));
          }
        })
        .catch(console.error);
    } else if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(strategiesKey);
        const parsed = raw ? (JSON.parse(raw) as Strategy[]) : [];
        setStrategies(parsed);
        if (parsed.length > 0) {
          setActiveId(parsed[0].id);
          setChecked(new Array(parsed[0].checklist.length).fill(false));
        }
      } catch {
        // ignore
      }
    }
  }, [supabase, user, strategiesKey]);

  useEffect(() => {
    load();
  }, [load]);

  const activeStrategy = useMemo(
    () => strategies.find((s) => s.id === activeId) ?? null,
    [strategies, activeId]
  );

  const checklistItems: ChecklistItem[] = useMemo(() => {
    if (!activeStrategy) return [];
    return (activeStrategy.checklist ?? []).map((item: any) =>
      typeof item === "string"
        ? { text: item, timeframe: "", image: undefined }
        : {
            text: item.text ?? "",
            timeframe: item.timeframe ?? "",
            image: item.image,
          }
    );
  }, [activeStrategy]);

  useEffect(() => {
    if (!activeStrategy) return;
    setChecked(new Array(checklistItems.length).fill(false));
  }, [activeStrategy?.id, checklistItems.length]);

  const totalItems = checklistItems.length;
  const completed = checked.filter(Boolean).length;
  const confluence =
    totalItems === 0 ? 0 : Math.round((completed / totalItems) * 100);

  function toggleItem(index: number) {
    setChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pre‑trade Checklist</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Run through your strategy rules, tick each confluence, and then
              log the trade from here.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-baseline gap-2">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                Confluence
              </p>
              <p className="text-2xl font-semibold text-emerald-400">
                {confluence}%
              </p>
            </div>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400"
                style={{ width: `${confluence}%` }}
              />
            </div>
          </div>
        </header>

        {strategies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/70 p-6 text-sm text-zinc-300">
            <p className="font-medium text-zinc-100">
              No strategies found for checklist.
            </p>
            <p className="mt-2">
              Create a strategy first so your checklist can be built from its
              rules.
            </p>
            <a
              href="/strategies/new"
              className="mt-4 inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-black"
            >
              Create a strategy
            </a>
          </div>
        ) : (
          <>
            <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                    Strategy
                  </p>
                  <div className="text-sm text-zinc-100">
                    <p className="text-base font-semibold">
                      {activeStrategy?.name}
                    </p>
                    {activeStrategy && (
                      <p className="mt-1 text-xs text-zinc-400">
                        {[activeStrategy.market, activeStrategy.timeframes]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                </div>

                {strategies.length > 1 && (
                  <div className="space-y-1 text-right text-xs">
                    <p className="text-zinc-500">Switch strategy</p>
                    <select
                      value={activeId ?? ""}
                      onChange={(e) => setActiveId(e.target.value)}
                      className="w-52 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white outline-none"
                    >
                      {strategies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {activeStrategy?.description && (
                <p className="mt-2 text-xs text-zinc-400">
                  {activeStrategy.description}
                </p>
              )}
            </section>

            <section className="space-y-6 rounded-2xl border border-white/10 bg-slate-950/80 p-5">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Strategy Checklist
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  The only thing you can do here is tick boxes. Once you are
                  satisfied with the confluence, log the trade below.
                </p>
              </div>

              <div className="space-y-3 text-sm text-zinc-100">
                {activeStrategy &&
                  checklistItems.map((item, index) => (
                    <label
                      key={index}
                      className="flex cursor-pointer items-start gap-3 rounded-xl bg-black/40 px-3 py-2.5"
                    >
                      <input
                        type="checkbox"
                        checked={checked[index] ?? false}
                        onChange={() => toggleItem(index)}
                        className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-slate-950 text-emerald-500 focus:ring-0"
                      />
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-1">
                          <span>{item.text}</span>
                          {item.timeframe && (
                            <div className="flex items-center gap-2 text-[11px] text-zinc-300">
                              <span className="rounded-full bg-zinc-800 px-2 py-0.5">
                                Timeframe: {item.timeframe}
                              </span>
                            </div>
                          )}
                        </div>
                        {item.image && (
                          <div className="overflow-hidden rounded-lg border border-white/10 bg-black/60">
                            <img
                              src={item.image}
                              alt="Checklist rule example"
                              className="max-h-40 w-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                {activeStrategy && checklistItems.length === 0 && (
                  <p className="text-xs text-zinc-500">
                    This strategy has no checklist items yet. Edit it in the
                    strategy builder to add rules.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Log trade
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Complete your checklist, then record the trade details
                      here.
                    </p>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Confluence:{" "}
                    <span className="font-semibold text-emerald-400">
                      {confluence}%
                    </span>
                  </p>
                </div>
                <div className="mt-3">
                  <TradeForm />
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

