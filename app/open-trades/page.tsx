"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchOpenTrades, deleteOpenTrade } from "@/lib/supabase/open-trades";
import {
  loadOpenTrades,
  closeTrade,
  removeOpenTrade,
  type OpenTrade,
} from "@/lib/journal";
import { logError } from "@/lib/log-error";

function formatDate(key: string): string {
  const [y, m, d] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function openTradeRR(open: OpenTrade): string | null {
  const e = open.entryPrice;
  const sl = open.stopLoss;
  const tp = open.takeProfit;
  if (e == null || sl == null || tp == null) return null;
  const risk = Math.abs(e - sl);
  const reward = Math.abs(tp - e);
  if (risk <= 0) return null;
  const ratio = reward / risk;
  return `1:${ratio.toFixed(1)}`;
}

type CloseFormState = {
  openId: string | null;
  result: "win" | "loss" | "breakeven";
  pnl: string;
  currency: "USD" | "GBP" | "EUR";
  thoughts: string;
  rr: string;
  screenshot: string | null;
  rating: number | null;
};

const initialCloseState: CloseFormState = {
  openId: null,
  result: "win",
  pnl: "",
  currency: "GBP",
  thoughts: "",
  rr: "",
  screenshot: null,
  rating: null,
};

export default function OpenTradesPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [openTrades, setOpenTrades] = useState<OpenTrade[]>([]);
  const [closeForm, setCloseForm] = useState<CloseFormState>(initialCloseState);

  const loadOpenTradesList = useCallback(() => {
    if (supabase && user) {
      fetchOpenTrades(supabase).then(setOpenTrades).catch(logError);
    } else {
      setOpenTrades(loadOpenTrades(user?.id));
    }
  }, [supabase, user]);

  useEffect(() => {
    loadOpenTradesList();
  }, [loadOpenTradesList]);

  const handleCloseSubmit = (open: OpenTrade) => async (e: React.FormEvent) => {
    e.preventDefault();
    const pnlNum = Number(closeForm.pnl);
    if (Number.isNaN(pnlNum)) {
      alert("Enter a valid P/L number.");
      return;
    }
    try {
      await closeTrade(
        open,
        {
          result: closeForm.result,
          pnl: pnlNum,
          currency: closeForm.currency,
          thoughts: closeForm.thoughts.trim() || undefined,
          rr: closeForm.rr.trim() || undefined,
          screenshot: closeForm.screenshot ?? undefined,
          rating: closeForm.rating ?? undefined,
        },
        user?.id,
        supabase
      );
      loadOpenTradesList();
      setCloseForm(initialCloseState);
    } catch (err) {
      logError(err);
      alert("Failed to save trade. Please try again.");
    }
  };

  const handleCancelClose = () => {
    setCloseForm(initialCloseState);
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this open trade without closing it?")) return;
    try {
      if (supabase && user) {
        await deleteOpenTrade(supabase, id);
        loadOpenTradesList();
      } else {
        removeOpenTrade(id, user?.id);
        setOpenTrades(loadOpenTrades(user?.id));
      }
    } catch (err) {
      logError(err);
      alert("Failed to remove open trade. Please try again.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Live Trades</h1>
          <p className="mt-2 text-sm text-zinc-400">
            When a trade is closed, journal the outcome here. It will appear on the Dashboard and in the Journal.
          </p>
        </header>

        {openTrades.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/50 p-8 text-center text-sm text-zinc-400">
            <p className="font-medium text-zinc-200">No live trades</p>
            <p className="mt-2">
              Log a trade from the Dashboard or Checklist to see it here. Then
              journal how it ended when you close it.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {openTrades.map((open) => (
              <div
                key={open.id}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{open.pair}</p>
                    <p className="text-xs text-zinc-400">
                      {open.market}
                      {open.session && ` · ${open.session}`}
                      {open.direction && ` · ${open.direction}`}
                      {open.lotSize && ` · ${open.lotSize}`}
                    </p>
                    {(open.entryPrice != null || open.stopLoss != null || open.takeProfit != null) && (
                      <p className="mt-1 text-xs text-zinc-500">
                        Entry {open.entryPrice ?? "—"} · SL {open.stopLoss ?? "—"} · TP {open.takeProfit ?? "—"}
                        {openTradeRR(open) && (
                          <span className="ml-2 text-sky-400">R:R {openTradeRR(open)}</span>
                        )}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-zinc-500">
                      Opened {formatDate(open.date)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCloseForm({
                          ...initialCloseState,
                          openId: open.id,
                        })
                      }
                      className="rounded-xl bg-sky-500/20 px-3 py-1.5 text-sm font-medium text-sky-300 hover:bg-sky-500/30"
                    >
                      Journal outcome
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(open.id)}
                      className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:border-red-400/40 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {open.notes && (
                  <p className="mt-2 rounded-lg bg-black/30 px-2 py-1.5 text-xs text-zinc-300">
                    {open.notes}
                  </p>
                )}

                {closeForm.openId === open.id && (
                  <form
                    onSubmit={handleCloseSubmit(open)}
                    className="mt-4 space-y-3 rounded-xl border border-sky-500/30 bg-black/40 p-4"
                  >
                    <p className="text-sm font-medium text-sky-300">
                      How did this trade end?
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-zinc-500">
                          Result
                        </label>
                        <select
                          value={closeForm.result}
                          onChange={(e) =>
                            setCloseForm((f) => ({
                              ...f,
                              result: e.target.value as "win" | "loss" | "breakeven",
                            }))
                          }
                          className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"
                        >
                          <option value="win">Win</option>
                          <option value="loss">Loss</option>
                          <option value="breakeven">Breakeven</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-zinc-500">
                          P/L
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={closeForm.pnl}
                          onChange={(e) =>
                            setCloseForm((f) => ({ ...f, pnl: e.target.value }))
                          }
                          placeholder="0.00"
                          className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-zinc-500">
                          Currency
                        </label>
                        <select
                          value={closeForm.currency}
                          onChange={(e) =>
                            setCloseForm((f) => ({
                              ...f,
                              currency: e.target.value as "USD" | "GBP" | "EUR",
                            }))
                          }
                          className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"
                        >
                          <option value="USD">USD</option>
                          <option value="GBP">GBP</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-zinc-500">
                          R:R (optional)
                        </label>
                        <input
                          type="text"
                          value={closeForm.rr}
                          onChange={(e) =>
                            setCloseForm((f) => ({ ...f, rr: e.target.value }))
                          }
                          placeholder="2:1"
                          className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-zinc-500">
                        Notes (how it ended)
                      </label>
                      <textarea
                        value={closeForm.thoughts}
                        onChange={(e) =>
                          setCloseForm((f) => ({ ...f, thoughts: e.target.value }))
                        }
                        placeholder="What happened? What did you learn?"
                        className="w-full resize-none rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-zinc-500">
                        Rate this trade (1–10)
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() =>
                              setCloseForm((f) => ({
                                ...f,
                                rating: f.rating === n ? null : n,
                              }))
                            }
                            className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                              closeForm.rating === n
                                ? "bg-sky-500 text-black"
                                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-zinc-500">
                        Screenshot (optional)
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="cursor-pointer rounded-lg border border-sky-500/50 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-300 hover:bg-sky-500/20">
                          {closeForm.screenshot ? "Change screenshot" : "Add screenshot"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () =>
                                setCloseForm((f) => ({
                                  ...f,
                                  screenshot: reader.result as string,
                                }));
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        {closeForm.screenshot && (
                          <div className="relative">
                            <img
                              src={closeForm.screenshot}
                              alt="Trade screenshot"
                              className="h-20 w-auto rounded-lg border border-white/10 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setCloseForm((f) => ({ ...f, screenshot: null }))
                              }
                              className="absolute -right-1 -top-1 rounded-full bg-red-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-black"
                      >
                        Close & save to journal
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelClose}
                        className="rounded-lg border border-white/20 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-zinc-500">
          This app is designed for trading discipline, journaling and self-review.
          It does not provide financial advice.
        </p>
      </div>
    </main>
  );
}
