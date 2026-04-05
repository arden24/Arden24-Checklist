"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TradeForm from "@/components/trade-form";
import { useAuth } from "@/contexts/AuthContext";
import { getStrategiesKey } from "@/lib/storage-keys";
import { createClient } from "@/lib/supabase/client";
import { fetchStrategies, type Strategy, type ChecklistItem } from "@/lib/supabase/strategies";
import { logError } from "@/lib/log-error";
import { computeWeightedChecklistScore } from "@/lib/checklist-scoring";
import {
  ARDEN24_CHECKLIST_DRAFT_KEY,
  LEGACY_CHECKLIST_DRAFT_KEYS,
} from "@/lib/session-draft-keys";
import { chooseDraftSource } from "@/lib/draft-conflict";
import {
  deleteUserDraft,
  fetchUserDraft,
  upsertUserDraft,
} from "@/lib/supabase/user-drafts";

type ChecklistDraft = { activeId: string; checked: boolean[]; updatedAt?: string };

function parseChecklistDraft(raw: string | null): ChecklistDraft | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    if (typeof o.activeId !== "string") return null;
    const checked = Array.isArray(o.checked) ? o.checked.map(Boolean) : [];
    const updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : undefined;
    return { activeId: o.activeId, checked, updatedAt };
  } catch {
    return null;
  }
}

function readChecklistDraftFromSession(): ChecklistDraft | null {
  if (typeof window === "undefined") return null;
  const keys = [ARDEN24_CHECKLIST_DRAFT_KEY, ...LEGACY_CHECKLIST_DRAFT_KEYS];
  for (const key of keys) {
    const draft = parseChecklistDraft(sessionStorage.getItem(key));
    if (draft) {
      if (key !== ARDEN24_CHECKLIST_DRAFT_KEY) {
        try {
          sessionStorage.setItem(ARDEN24_CHECKLIST_DRAFT_KEY, JSON.stringify(draft));
          sessionStorage.removeItem(key);
        } catch {
          // ignore
        }
      }
      return draft;
    }
  }
  return null;
}

function writeChecklistDraftToSession(activeId: string, checked: boolean[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      ARDEN24_CHECKLIST_DRAFT_KEY,
      JSON.stringify({ activeId, checked, updatedAt: new Date().toISOString() })
    );
  } catch {
    // ignore
  }
}

export default function ChecklistPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const strategiesKey = getStrategiesKey(user?.id);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [checked, setChecked] = useState<boolean[]>([]);
  const draftBootstrapped = useRef(false);
  const lastStrategyIdRef = useRef<string | null>(null);
  /** After "Clear checklist", skip one persist pass so sessionStorage stays cleared. */
  const skipNextChecklistPersistRef = useRef(false);
  const draftHydratedRef = useRef(false);
  const persistTimerRef = useRef<number | null>(null);

  const load = useCallback(() => {
    if (supabase && user) {
      fetchStrategies(supabase)
        .then((list) => {
          setStrategies(list);
        })
        .catch((err) => {
          // If Supabase fetch fails (auth/RLS/offline), fall back to local storage
          logError(err);
          if (typeof window !== "undefined") {
            try {
              const raw = window.localStorage.getItem(strategiesKey);
              const parsed = raw ? (JSON.parse(raw) as Strategy[]) : [];
              setStrategies(parsed);
            } catch {
              // ignore
            }
          }
        });
    } else if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(strategiesKey);
        const parsed = raw ? (JSON.parse(raw) as Strategy[]) : [];
        setStrategies(parsed);
      } catch {
        // ignore
      }
    }
  }, [supabase, user, strategiesKey]);

  useEffect(() => {
    load();
  }, [load]);

  /** First time we have strategies this mount: restore server draft (signed in) or session draft. */
  useEffect(() => {
    if (strategies.length === 0) {
      draftBootstrapped.current = false;
      lastStrategyIdRef.current = null;
      return;
    }
    if (draftBootstrapped.current) return;
    draftBootstrapped.current = true;

    const sessionDraft = readChecklistDraftFromSession();

    const applyDraft = (d: ChecklistDraft | null): boolean => {
      if (d && strategies.some((s) => s.id === d.activeId)) {
        const st = strategies.find((s) => s.id === d.activeId)!;
        const len = (st.checklist ?? []).length;
        const arr =
          d.checked.length === len
            ? d.checked
            : Array.from({ length: len }, (_, i) => Boolean(d.checked[i]));
        setActiveId(d.activeId);
        setChecked(arr);
        return true;
      }
      return false;
    };

    if (supabase && user?.id) {
      fetchUserDraft(supabase, user.id, "checklist:draft")
        .then((row) => {
          const serverPayload = row?.payload as any;
          const serverDraft: ChecklistDraft | null =
            serverPayload && typeof serverPayload === "object"
              ? {
                  activeId: typeof serverPayload.activeId === "string" ? serverPayload.activeId : "",
                  checked: Array.isArray(serverPayload.checked)
                    ? serverPayload.checked.map(Boolean)
                    : [],
                  updatedAt: row?.updatedAt,
                }
              : null;

          const which = chooseDraftSource({
            localUpdatedAt: sessionDraft?.updatedAt ?? null,
            serverUpdatedAt: row?.updatedAt ?? null,
          });

          if (which === "server") {
            if (applyDraft(serverDraft)) return;
          } else if (which === "local") {
            if (applyDraft(sessionDraft)) return;
          }

          if (applyDraft(serverDraft)) return;
          if (applyDraft(sessionDraft)) return;

          const first = strategies[0];
          setActiveId(first.id);
          setChecked(new Array((first.checklist ?? []).length).fill(false));
        })
        .catch((err) => {
          logError(err);
          if (applyDraft(sessionDraft)) return;
          const first = strategies[0];
          setActiveId(first.id);
          setChecked(new Array((first.checklist ?? []).length).fill(false));
        })
        .finally(() => {
          draftHydratedRef.current = true;
        });
      return;
    }

    if (applyDraft(sessionDraft)) {
      draftHydratedRef.current = true;
      return;
    }
    const first = strategies[0];
    setActiveId(first.id);
    setChecked(new Array((first.checklist ?? []).length).fill(false));
    draftHydratedRef.current = true;
  }, [strategies, supabase, user?.id]);

  /** Persist checklist draft (session tab only). */
  useEffect(() => {
    if (strategies.length === 0 || !activeId || typeof window === "undefined") return;
    if (skipNextChecklistPersistRef.current) {
      skipNextChecklistPersistRef.current = false;
      return;
    }
    if (!draftHydratedRef.current) return;
    writeChecklistDraftToSession(activeId, checked);

    if (supabase && user?.id) {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = window.setTimeout(() => {
        upsertUserDraft(supabase, user.id, "checklist:draft", { activeId, checked }).catch(
          logError
        );
      }, 500);
    }
  }, [activeId, checked, strategies.length]);

  const activeStrategy = useMemo(
    () => strategies.find((s) => s.id === activeId) ?? null,
    [strategies, activeId]
  );

  const checklistItems: ChecklistItem[] = useMemo(() => {
    if (!activeStrategy) return [];
    return (activeStrategy.checklist ?? []).map((item: any) =>
      typeof item === "string"
        ? {
            text: item,
            timeframe: "",
            image: undefined,
            weight: 1,
            critical: false,
          }
        : {
            text: item.text ?? "",
            timeframe: item.timeframe ?? "",
            image: item.image,
            weight: Number.isFinite(Number(item.weight)) ? Number(item.weight) : 1,
            critical: Boolean(item.critical),
          }
    );
  }, [activeStrategy]);

  /** Resize or reset checkboxes when switching strategy (not on first bind after session restore). */
  useEffect(() => {
    if (!activeStrategy) return;
    const id = activeStrategy.id;
    const len = checklistItems.length;
    const prev = lastStrategyIdRef.current;

    if (prev === id) {
      setChecked((p) => {
        if (p.length === len) return p;
        return Array.from({ length: len }, (_, i) => p[i] ?? false);
      });
      return;
    }

    lastStrategyIdRef.current = id;
    if (prev !== null) {
      setChecked(new Array(len).fill(false));
    } else {
      setChecked((p) => {
        if (p.length === len) return p;
        return Array.from({ length: len }, (_, i) => p[i] ?? false);
      });
    }
  }, [activeStrategy?.id, checklistItems.length]);

  const scorableItems = useMemo(
    () =>
      checklistItems.map((item, idx) => ({
        ...item,
        checked: checked[idx] ?? false,
      })),
    [checklistItems, checked]
  );

  const score = useMemo(
    () => computeWeightedChecklistScore(scorableItems),
    [scorableItems]
  );

  function toggleItem(index: number) {
    setChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      if (activeId) writeChecklistDraftToSession(activeId, next);
      return next;
    });
  }

  function handleClearChecklistDraft() {
    if (!activeStrategy) return;
    const len = checklistItems.length;
    skipNextChecklistPersistRef.current = true;
    setChecked(new Array(len).fill(false));
    try {
      sessionStorage.removeItem(ARDEN24_CHECKLIST_DRAFT_KEY);
      for (const k of LEGACY_CHECKLIST_DRAFT_KEYS) {
        sessionStorage.removeItem(k);
      }
    } catch {
      // ignore
    }
    if (supabase && user?.id) {
      deleteUserDraft(supabase, user.id, "checklist:draft").catch(logError);
    }
  }

  return (
    <main className="min-h-screen min-w-0 bg-slate-950 px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pre‑trade Checklist</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Run through your strategy rules, tick each condition, and then
              log the trade from here.
            </p>
          </div>

          <div className="w-full md:w-auto">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.9)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                    Weighted Score
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-sky-400">
                    {score.weightedScorePercent}%
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {score.checkedCount} / {score.totalCount} checked
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                    Setup Status
                  </p>
                  <p
                    className={`mt-2 text-sm font-semibold ${
                      score.status === "A+ Setup"
                        ? "text-sky-300"
                        : score.status === "Valid Setup"
                        ? "text-emerald-300"
                        : score.status === "Risky"
                        ? "text-amber-300"
                        : "text-red-300"
                    }`}
                  >
                    {score.status}
                  </p>
                </div>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-sky-400 transition-[width] duration-500 ease-out"
                  style={{ width: `${score.weightedScorePercent}%` }}
                />
              </div>

              {score.missingCritical && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-200">
                    !
                  </span>
                  Missing critical condition
                </div>
              )}
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
              className="mt-4 inline-flex items-center rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-black"
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Strategy Checklist
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Tick the conditions. Some are critical and will gate your
                    final setup status.
                  </p>
                </div>
                {activeStrategy && checklistItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearChecklistDraft}
                    className="shrink-0 rounded-xl border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-sky-400/50 hover:text-sky-200"
                  >
                    Clear checklist
                  </button>
                )}
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
                        className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-slate-950 text-sky-500 focus:ring-0"
                      />
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{item.text}</span>
                            {item.critical && (
                              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                                Critical
                              </span>
                            )}
                          </div>
                          {item.timeframe && (
                            <div className="flex items-center gap-2 text-[11px] text-zinc-300">
                              <span className="rounded-full bg-zinc-800 px-2 py-0.5">
                                Timeframe: {item.timeframe}
                              </span>
                              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-200">
                                {item.weight} pts
                              </span>
                            </div>
                          )}
                          {!item.timeframe && (
                            <div className="flex items-center gap-2 text-[11px] text-zinc-300">
                              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-200">
                                {item.weight} pts
                              </span>
                            </div>
                          )}
                        </div>
                        {item.image && (
                          <div className="w-full h-48 flex items-center justify-center rounded-lg border border-white/10 bg-black/5 cursor-pointer transition hover:scale-[1.02]">
                            <img
                              src={item.image}
                              alt="Checklist rule example"
                              className="max-h-full max-w-full object-contain"
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
                    Weighted Score:{" "}
                    <span className="font-semibold text-sky-400">
                      {score.weightedScorePercent}%
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

