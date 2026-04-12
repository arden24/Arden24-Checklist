"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchOpenTrades, deleteOpenTrade } from "@/lib/supabase/open-trades";
import {
  loadOpenTrades,
  closeTrade,
  removeOpenTrade,
  type OpenTrade,
} from "@/lib/journal";
import { useSessionFormState } from "@/lib/hooks/useSessionFormState";
import { logError } from "@/lib/log-error";
import { parseMoneyAmountInput } from "@/lib/realised-pnl";
import ScreenshotLightbox from "@/components/ScreenshotLightbox";
import { AppSelect, type AppSelectOption } from "@/components/AppSelect";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAppToast } from "@/contexts/AppToastContext";

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
  closingScreenshot: string | null;
  rating: number | null;
};

/** Persisted in sessionStorage (screenshots kept in memory only — can be large). */
type CloseFormDraftPersisted = Omit<CloseFormState, "closingScreenshot">;

const CLOSE_DRAFT_INITIAL: CloseFormDraftPersisted = {
  openId: null,
  result: "win",
  pnl: "",
  currency: "GBP",
  thoughts: "",
  rr: "",
  rating: null,
};

const RESULT_OPTIONS: AppSelectOption<CloseFormState["result"]>[] = [
  { value: "win", label: "Win" },
  { value: "loss", label: "Loss" },
  { value: "breakeven", label: "Breakeven" },
];

const CURRENCY_OPTIONS: AppSelectOption<CloseFormState["currency"]>[] = [
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
  { value: "EUR", label: "EUR" },
];

export default function OpenTradesPage() {
  const { user } = useAuth();
  const { pushToast } = useAppToast();
  const supabase = useMemo(() => createClient(), []);
  const [openTrades, setOpenTrades] = useState<OpenTrade[]>([]);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);
  const [draft, setDraft, resetCloseDraft] = useSessionFormState<CloseFormDraftPersisted>(
    "page:open-trades-close",
    CLOSE_DRAFT_INITIAL
  );
  const [closingScreenshot, setClosingScreenshot] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);

  const closeForm = useMemo<CloseFormState>(
    () => ({ ...draft, closingScreenshot }),
    [draft, closingScreenshot]
  );

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
    const parsed = parseMoneyAmountInput(closeForm.pnl.trim());
    if (closeForm.result !== "breakeven" && parsed === null) {
      pushToast("Enter a valid P/L amount (you can include £ or commas).", "error");
      return;
    }
    if (!user?.id || !supabase) {
      pushToast("You must be signed in to close a trade.", "error");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        pushToast("Your session has expired. Please sign in again and try closing the trade.", "error");
        return;
      }
      await closeTrade(
        open,
        {
          result: closeForm.result,
          pnl: parsed ?? 0,
          currency: closeForm.currency,
          thoughts: closeForm.thoughts.trim() || undefined,
          rr: closeForm.rr.trim() || undefined,
          closingScreenshot: closeForm.closingScreenshot ?? undefined,
          rating: closeForm.rating ?? undefined,
        },
        user.id,
        supabase
      );
      loadOpenTradesList();
      resetCloseDraft();
      setClosingScreenshot(null);
      pushToast("Trade closed and saved to your journal.", "success");
    } catch (err: unknown) {
      logError(err);
      const message = err instanceof Error ? err.message : String(err);
      const details = err && typeof err === "object" && "message" in err ? String((err as { message?: string }).message) : message;
      pushToast(`Failed to save trade. ${details || "Please try again."}`, "error");
    }
  };

  const handleCancelClose = () => {
    resetCloseDraft();
    setClosingScreenshot(null);
  };

  const requestRemoveOpenTrade = (id: string) => {
    setPendingRemoveId(id);
  };

  const confirmRemoveOpenTrade = async () => {
    if (!pendingRemoveId) return;
    const id = pendingRemoveId;
    setRemoveSubmitting(true);
    try {
      if (supabase && user) {
        await deleteOpenTrade(supabase, id);
        loadOpenTradesList();
      } else {
        removeOpenTrade(id, user?.id);
        setOpenTrades(loadOpenTrades(user?.id));
      }
      pushToast("Open trade removed.", "success");
    } catch (err) {
      logError(err);
      pushToast("Failed to remove open trade. Please try again.", "error");
    } finally {
      setRemoveSubmitting(false);
      setPendingRemoveId(null);
    }
  };

  return (
    <main className="min-h-screen min-w-0 bg-slate-950 px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Live Trades</h1>
          <p className="mt-2 text-sm text-zinc-400">
            When a trade is closed, journal the outcome here. It will appear on the Dashboard and in the Journal.
          </p>
        </header>

        {openTrades.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/60 p-8 text-center text-sm text-zinc-400 shadow-[0_18px_60px_rgba(15,23,42,0.9)]">
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
                className="rounded-2xl border border-slate-800/90 bg-slate-950/70 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.9)]"
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
                      onClick={() => {
                        setDraft({ ...CLOSE_DRAFT_INITIAL, openId: open.id });
                        setClosingScreenshot(null);
                      }}
                      className="rounded-xl bg-sky-500/20 px-3 py-1.5 text-sm font-medium text-sky-300 hover:bg-sky-500/30"
                    >
                      Journal outcome
                    </button>
                    <button
                      type="button"
                      onClick={() => requestRemoveOpenTrade(open.id)}
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

                {(open.openingScreenshot || closeForm.closingScreenshot) && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {open.openingScreenshot && (
                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                          Before / Open Trade
                        </p>
                        <div
                          className="w-full h-40 flex cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-black/5 transition hover:scale-[1.02]"
                          onClick={() =>
                            setPreview({
                              src: open.openingScreenshot as string,
                              alt: "Before / Open trade screenshot",
                            })
                          }
                        >
                          <img
                            src={open.openingScreenshot}
                            alt="Before / Open trade screenshot"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      </div>
                    )}
                    {closeForm.closingScreenshot && (
                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                          After / Close Trade
                        </p>
                        <div
                          className="w-full h-40 flex cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-black/5 transition hover:scale-[1.02]"
                          onClick={() =>
                            setPreview({
                              src: closeForm.closingScreenshot as string,
                              alt: "After / Close trade screenshot",
                            })
                          }
                        >
                          <img
                            src={closeForm.closingScreenshot}
                            alt="After / Close trade screenshot"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>
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
                        <AppSelect
                          label="Result"
                          aria-label="Trade result"
                          value={closeForm.result}
                          onChange={(v) =>
                            setDraft((f) => ({
                              ...f,
                              result: v,
                            }))
                          }
                          options={RESULT_OPTIONS}
                        />
                        <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
                          {closeForm.result === "win" && "This will be saved as profit (positive P/L)."}
                          {closeForm.result === "loss" && "This will be saved as a loss (negative P/L)."}
                          {closeForm.result === "breakeven" && "This will be saved as £0 — P/L field is optional."}
                        </p>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-zinc-500">
                          P/L
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={closeForm.pnl}
                          onChange={(e) =>
                            setDraft((f) => ({ ...f, pnl: e.target.value }))
                          }
                          placeholder={
                            closeForm.result === "breakeven"
                              ? "Optional (saved as 0)"
                              : "e.g. 100 or £100"
                          }
                          className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"
                          required={closeForm.result !== "breakeven"}
                        />
                        <p className="mt-1 text-[11px] text-zinc-600">
                          Amount only — win/loss above sets the sign automatically.
                        </p>
                      </div>
                      <div>
                        <AppSelect
                          label="Currency"
                          aria-label="P/L currency"
                          value={closeForm.currency}
                          onChange={(v) =>
                            setDraft((f) => ({
                              ...f,
                              currency: v,
                            }))
                          }
                          options={CURRENCY_OPTIONS}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-zinc-500">
                          R:R (optional)
                        </label>
                        <input
                          type="text"
                          value={closeForm.rr}
                          onChange={(e) =>
                            setDraft((f) => ({ ...f, rr: e.target.value }))
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
                          setDraft((f) => ({ ...f, thoughts: e.target.value }))
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
                              setDraft((f) => ({
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
                        Closing screenshot (After)
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="cursor-pointer rounded-lg border border-sky-500/50 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-300 hover:bg-sky-500/20">
                          {closeForm.closingScreenshot ? "Change screenshot" : "Add screenshot"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () =>
                                setClosingScreenshot(reader.result as string);
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        {closeForm.closingScreenshot && (
                          <div className="relative">
                            <div
                              className="w-full h-24 flex cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-black/5"
                              onClick={() =>
                                setPreview({
                                  src: closeForm.closingScreenshot as string,
                                  alt: "After / Close trade screenshot",
                                })
                              }
                            >
                              <img
                                src={closeForm.closingScreenshot}
                                alt="After / Close trade screenshot"
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setClosingScreenshot(null)}
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
      {preview && (
        <ScreenshotLightbox src={preview.src} alt={preview.alt} onClose={() => setPreview(null)} />
      )}

      <ConfirmDialog
        open={pendingRemoveId !== null}
        onClose={() => !removeSubmitting && setPendingRemoveId(null)}
        title="Remove this open trade?"
        description="This removes the live position without journaling a close. Use only if you logged it by mistake."
        confirmLabel="Remove"
        cancelLabel="Keep trade"
        confirmVariant="destructive"
        isLoading={removeSubmitting}
        onConfirm={() => void confirmRemoveOpenTrade()}
      />
    </main>
  );
}
