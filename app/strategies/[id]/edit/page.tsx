"use client";

import { useCallback, useEffect, useRef, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getStrategiesKey } from "@/lib/storage-keys";
import { createClient } from "@/lib/supabase/client";
import { logError } from "@/lib/log-error";
import {
  clearStrategyDraftFromSession,
  readStrategyDraftForEditPage,
  writeStrategyDraftToSession,
  type StrategyFormFields,
} from "@/lib/strategy-session-draft";
import {
  fetchStrategyById,
  updateStrategy,
  type Strategy,
  type ChecklistItem,
} from "@/lib/supabase/strategies";
import { uploadChecklistImage } from "@/lib/supabase/checklist-images";
import { chooseDraftSource } from "@/lib/draft-conflict";
import { fetchUserDraft, upsertUserDraft, deleteUserDraft } from "@/lib/supabase/user-drafts";
import { resolveChecklistImageRefs } from "@/lib/supabase/checklist-images";
import BackButton from "@/components/BackButton";
import PageContainer from "@/components/PageContainer";
import AppButton from "@/components/AppButton";
import ScreenshotLightbox from "@/components/ScreenshotLightbox";

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
          imageRef: item.imageRef,
          weight: Number.isFinite(Number(item.weight)) ? Number(item.weight) : 1,
          critical: Boolean(item.critical),
        }
  );
}

function snapshotFromStrategy(s: Strategy): StrategyFormFields {
  return {
    name: s.name,
    description: s.description,
    market: s.market,
    timeframes: s.timeframes,
    checklistItems: normaliseChecklist(s.checklist),
  };
}

type EditStrategyFormLoadedProps = {
  strategy: Strategy;
  strategiesKey: string;
  supabase: ReturnType<typeof createClient>;
  user: ReturnType<typeof useAuth>["user"];
};

function EditStrategyFormLoaded({
  strategy,
  strategiesKey,
  supabase,
  user,
}: EditStrategyFormLoadedProps) {
  const router = useRouter();
  const [form, setForm] = useState<StrategyFormFields>(() =>
    snapshotFromStrategy(strategy)
  );
  const [hydrated, setHydrated] = useState(false);
  const skipNextStrategyPersistRef = useRef(false);
  const persistTimerRef = useRef<number | null>(null);
  const strategyRef = useRef(strategy);
  strategyRef.current = strategy;
  const { name, description, market, timeframes, checklistItems } = form;
  const [isSaving, setIsSaving] = useState(false);
  const [screenshotLightbox, setScreenshotLightbox] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  /** Once per strategy id: merge session draft only when it matches this record (never apply "new" or another id). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = strategyRef.current;
    const baseline = snapshotFromStrategy(s);
    const fromSession = readStrategyDraftForEditPage(s.id, baseline);
    if (supabase && user?.id) {
      fetchUserDraft(supabase, user.id, `strategy:edit:${s.id}:draft`)
        .then(async (row) => {
          const serverPayload = row?.payload as any;
          const server =
            serverPayload && typeof serverPayload === "object" ? serverPayload : null;

          const which = chooseDraftSource({
            localUpdatedAt: (fromSession as any)?.updatedAt ?? null,
            serverUpdatedAt: row?.updatedAt ?? null,
          });

          const candidate =
            which === "server" ? server : which === "local" ? fromSession : server ?? fromSession;

          if (candidate) {
            const next = { ...baseline, ...candidate } as StrategyFormFields;
            const refs = next.checklistItems
              .map((i: any) => i?.imageRef)
              .filter(Boolean) as string[];
            if (refs.length > 0) {
              try {
                const byRef = await resolveChecklistImageRefs(supabase, refs);
                next.checklistItems = next.checklistItems.map((i: any) => ({
                  ...i,
                  image: i.imageRef ? byRef[i.imageRef] ?? i.image : i.image,
                }));
              } catch {
                // ignore
              }
            }
            setForm(next);
          }
        })
        .catch(logError)
        .finally(() => setHydrated(true));
      return;
    }

    if (fromSession) setForm(fromSession);
    setHydrated(true);
  }, [strategy.id]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    if (skipNextStrategyPersistRef.current) {
      skipNextStrategyPersistRef.current = false;
      return;
    }
    writeStrategyDraftToSession({
      mode: "edit",
      strategyId: strategy.id,
      ...form,
    });

    if (supabase && user?.id) {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = window.setTimeout(() => {
        const payload = {
          ...form,
          checklistItems: form.checklistItems.map((i: any) => ({
            ...i,
            image: i.imageRef ? undefined : i.image,
          })),
        };
        upsertUserDraft(supabase, user.id, `strategy:edit:${strategy.id}:draft`, payload).catch(
          logError
        );
      }, 600);
    }
  }, [hydrated, form, strategy.id]);

  const resetFormDraft = useCallback(() => {
    skipNextStrategyPersistRef.current = true;
    setForm(snapshotFromStrategy(strategy));
    clearStrategyDraftFromSession({ editStrategyId: strategy.id });
    if (supabase && user?.id) {
      deleteUserDraft(supabase, user.id, `strategy:edit:${strategy.id}:draft`).catch(logError);
    }
  }, [strategy]);

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
          ? { ...item, weight: Number.isFinite(nextWeight) ? nextWeight : 1 }
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

  async function handleChecklistImageChange(
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (supabase && user) {
        const uploaded = await uploadChecklistImage(supabase, user.id, file);
        setForm((f) => ({
          ...f,
          checklistItems: f.checklistItems.map((item, i) =>
            i === index
              ? { ...item, image: uploaded.signedUrl, imageRef: uploaded.imageRef }
              : item
          ),
        }));
        return;
      }
    } catch (err) {
      logError(err);
      alert("Failed to upload screenshot. Try again.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setForm((f) => ({
        ...f,
        checklistItems: f.checklistItems.map((item, i) =>
          i === index ? { ...item, image: result, imageRef: undefined } : item
        ),
      }));
    };
    reader.readAsDataURL(file);
  }

  function removeChecklistScreenshot(index: number) {
    setForm((f) => ({
      ...f,
      checklistItems: f.checklistItems.map((item, i) =>
        i === index ? { ...item, image: undefined, imageRef: undefined } : item
      ),
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please add a strategy name.");
      return;
    }

    setIsSaving(true);
    try {
      const serverChecklist = checklistItems
        .map((item) => ({
          text: item.text.trim(),
          timeframe: item.timeframe.trim(),
          image: item.imageRef ?? item.image,
          imageRef: item.imageRef,
          weight: item.weight,
          critical: item.critical,
        }))
        .filter((item) => item.text.length > 0);
      const localChecklist = checklistItems
        .map((item) => ({
          text: item.text.trim(),
          timeframe: item.timeframe.trim(),
          image: item.image,
          imageRef: item.imageRef,
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
          checklist: serverChecklist,
        });
      } else {
        const updatedStrategy: Strategy = {
          ...strategy,
          name: name.trim(),
          description: description.trim(),
          market: market.trim(),
          timeframes: timeframes.trim(),
          checklist: localChecklist,
        };
        const raw = window.localStorage.getItem(strategiesKey);
        const all = raw ? (JSON.parse(raw) as Strategy[]) : [];
        const next = all.map((s) => (s.id === strategy.id ? updatedStrategy : s));
        window.localStorage.setItem(strategiesKey, JSON.stringify(next));
      }

      resetFormDraft();
      router.push("/strategies");
    } catch (err) {
      logError(err);
      alert("Failed to save strategy. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
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
            <div
              key={index}
              className="min-w-0 space-y-3 rounded-xl border border-white/5 bg-zinc-900/60 p-3"
            >
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

              <div className="min-w-0 space-y-2">
                {item.image ? (
                  <button
                    type="button"
                    onClick={() =>
                      setScreenshotLightbox({
                        src: item.image!,
                        alt: `Checklist item ${index + 1} screenshot`,
                      })
                    }
                    className="group relative w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-white/10 bg-black/50 outline-none ring-sky-400/0 transition hover:border-sky-500/40 hover:ring-2 hover:ring-sky-400/30 focus-visible:ring-2 focus-visible:ring-sky-400/50"
                    aria-label={`View screenshot for checklist item ${index + 1} full size`}
                  >
                    <img
                      src={item.image}
                      alt=""
                      className="max-h-48 w-full max-w-full object-contain object-center"
                    />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 text-center text-[10px] font-medium text-zinc-200 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                      Tap to enlarge
                    </span>
                  </button>
                ) : null}

                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                      <span className="rounded-lg border border-sky-500/60 bg-sky-500/10 px-2 py-1.5 text-[11px] font-semibold text-sky-300">
                        {item.image ? "Change screenshot" : "Add screenshot"}
                      </span>
                      <input
                        key={item.image ? `img-${index}` : `noimg-${index}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleChecklistImageChange(index, e)}
                      />
                    </label>
                    {item.image ? (
                      <button
                        type="button"
                        onClick={() => removeChecklistScreenshot(index)}
                        className="rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[11px] font-semibold text-red-200/90 hover:bg-red-500/20"
                      >
                        Remove screenshot
                      </button>
                    ) : null}
                  </div>
                  {item.timeframe ? (
                    <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300">
                      TF: {item.timeframe}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-white/5 pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
        <AppButton
          type="button"
          variant="secondary"
          onClick={resetFormDraft}
          className="w-full border-white/20 sm:w-auto"
        >
          Reset draft
        </AppButton>
        <AppButton type="submit" variant="primary" disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? "Saving..." : "Save changes"}
        </AppButton>
      </div>
    </form>
    {screenshotLightbox ? (
      <ScreenshotLightbox
        src={screenshotLightbox.src}
        alt={screenshotLightbox.alt}
        onClose={() => setScreenshotLightbox(null)}
      />
    ) : null}
    </>
  );
}

export default function EditStrategyPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const supabase = createClient();
  const strategiesKey = getStrategiesKey(user?.id);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
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
          if (s) setStrategy(s);
        })
        .catch(logError)
        .finally(() => setLoading(false));
    } else if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(strategiesKey);
        const parsed = raw ? (JSON.parse(raw) as Strategy[]) : [];
        const found = parsed.find((s) => s.id === id);
        if (found) setStrategy(found);
      } catch {
        // ignore
      }
      setLoading(false);
    }
  }, [params.id, strategiesKey, supabase, user]);

  if (loading || !strategy) {
    return (
      <main className="min-h-screen min-w-0 bg-black py-8 text-white sm:py-10">
        <PageContainer maxWidthClass="max-w-3xl">
          <p className="text-sm text-zinc-400">
            {loading ? "Loading strategy…" : "Strategy not found."}
          </p>
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="min-h-screen min-w-0 bg-black py-8 text-white sm:py-10">
      <PageContainer maxWidthClass="max-w-3xl">
        <BackButton fallbackHref="/strategies" label="Back" />

        <header className="mt-4 space-y-2">
          <h1 className="text-2xl font-bold sm:text-3xl">Edit strategy</h1>
          <p className="text-sm text-zinc-400">
            Update the rules and checklist for this strategy.
          </p>
        </header>

        <EditStrategyFormLoaded
          key={strategy.id}
          strategy={strategy}
          strategiesKey={strategiesKey}
          supabase={supabase}
          user={user}
        />
      </PageContainer>
    </main>
  );
}
