"use client";

import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import type { ChangeEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import AppButton from "@/components/AppButton";
import ScreenshotLightbox from "@/components/ScreenshotLightbox";
import { confluenceCardListClass } from "@/components/confluence-card-layout";
import { StrategyConfluenceEditRow } from "@/components/strategy-confluence-edit-row";
import { uploadChecklistImage } from "@/lib/supabase/checklist-images";
import type { StrategyFormFields } from "@/lib/strategy-session-draft";
import { logError } from "@/lib/log-error";
import { useAppToast } from "@/contexts/AppToastContext";
import { AppSelect, type AppSelectOption } from "@/components/AppSelect";
import { blankConfluence } from "@/lib/strategy-form-helpers";
import {
  hasMaterialForKeyPointGenerate,
  mockGenerateStrategyKeyPoints,
} from "@/lib/strategy-key-points-mock";

export const STRATEGY_BUILDER_INPUT_CLASS =
  "w-full min-w-0 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-sky-500/40";

const MARKET_OPTIONS: AppSelectOption<string>[] = [
  { value: "", label: "—" },
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

const hintClass = "text-[11px] text-zinc-500";

const generateBtnClass =
  "shrink-0 rounded-lg border border-violet-400/35 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/20 disabled:opacity-40 sm:px-4";

const keyPointsSecondaryBtnClass =
  "shrink-0 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-xs font-medium text-zinc-400 hover:border-white/20 hover:text-zinc-200 disabled:opacity-40 sm:px-4";

export type StrategyBuilderFormProps = {
  form: StrategyFormFields;
  setForm: Dispatch<SetStateAction<StrategyFormFields>>;
  scratchNotes: string;
  setScratchNotes: (value: string) => void;
  supabase: SupabaseClient | null;
  user: { id: string } | null;
  saveAttempted: boolean;
  setSaveAttempted: (value: boolean) => void;
  onSubmit: (e: FormEvent) => void | Promise<void>;
  submitLabel: string;
  isSubmitting: boolean;
  onResetDraft: () => void;
  resetDraftLabel?: string;
};

export function StrategyBuilderForm({
  form,
  setForm,
  scratchNotes,
  setScratchNotes,
  supabase,
  user,
  saveAttempted,
  setSaveAttempted,
  onSubmit,
  submitLabel,
  isSubmitting,
  onResetDraft,
  resetDraftLabel = "Reset draft",
}: StrategyBuilderFormProps) {
  const { pushToast } = useAppToast();
  const { name, description, market, timeframes, checklistItems } = form;

  const [generatedKeyPoints, setGeneratedKeyPoints] = useState<string[]>([]);
  const [generateFeedback, setGenerateFeedback] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [screenshotLightbox, setScreenshotLightbox] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  const missingName = !name.trim();
  const canAttemptGenerate = useMemo(
    () =>
      hasMaterialForKeyPointGenerate(
        description,
        scratchNotes,
        market,
        timeframes,
        checklistItems,
      ),
    [description, scratchNotes, market, timeframes, checklistItems],
  );

  const openScreenshotLightbox = useCallback((src: string, alt: string) => {
    setScreenshotLightbox({ src, alt });
  }, []);

  const closeScreenshotLightbox = useCallback(() => {
    setScreenshotLightbox(null);
  }, []);

  function runGenerate() {
    if (!canAttemptGenerate) {
      setGenerateFeedback(
        "Add a strategy summary (about 20+ characters), optional scratch notes, and/or at least one confluence with text — then generate key points.",
      );
      return;
    }
    setGenerateFeedback(null);
    setIsGenerating(true);
    window.setTimeout(() => {
      const { keyPoints } = mockGenerateStrategyKeyPoints({
        summary: description,
        scratchNotes,
        market,
        timeframes,
        checklistItems,
      });
      setGeneratedKeyPoints(keyPoints.length > 0 ? keyPoints : []);
      if (keyPoints.length === 0) {
        setGenerateFeedback(
          "Could not distill key points from the current text. Add more detail and try again.",
        );
      }
      setIsGenerating(false);
    }, 380);
  }

  function clearKeyPoints() {
    setGeneratedKeyPoints([]);
    setGenerateFeedback(null);
  }

  const updateChecklistItem = useCallback((index: number, value: string) => {
    setForm((f) => ({
      ...f,
      checklistItems: f.checklistItems.map((item, i) =>
        i === index ? { ...item, text: value } : item,
      ),
    }));
  }, [setForm]);

  const addConfluence = useCallback(() => {
    setForm((f) => ({
      ...f,
      checklistItems: [...f.checklistItems, blankConfluence()],
    }));
  }, [setForm]);

  const removeConfluence = useCallback(
    (index: number) => {
      setForm((f) => ({
        ...f,
        checklistItems:
          f.checklistItems.length === 1
            ? f.checklistItems
            : f.checklistItems.filter((_, i) => i !== index),
      }));
    },
    [setForm],
  );

  const moveConfluenceUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      setForm((f) => {
        const items = [...f.checklistItems];
        [items[index - 1], items[index]] = [items[index], items[index - 1]];
        return { ...f, checklistItems: items };
      });
    },
    [setForm],
  );

  const moveConfluenceDown = useCallback(
    (index: number) => {
      setForm((f) => {
        if (index >= f.checklistItems.length - 1) return f;
        const items = [...f.checklistItems];
        [items[index], items[index + 1]] = [items[index + 1], items[index]];
        return { ...f, checklistItems: items };
      });
    },
    [setForm],
  );

  const insertConfluenceAt = useCallback(
    (index: number) => {
      setForm((f) => ({
        ...f,
        checklistItems: [
          ...f.checklistItems.slice(0, index),
          blankConfluence(),
          ...f.checklistItems.slice(index),
        ],
      }));
    },
    [setForm],
  );

  const insertConfluenceBelow = useCallback(
    (index: number) => {
      setForm((f) => ({
        ...f,
        checklistItems: [
          ...f.checklistItems.slice(0, index + 1),
          blankConfluence(),
          ...f.checklistItems.slice(index + 1),
        ],
      }));
    },
    [setForm],
  );

  const updateTimeframe = useCallback(
    (index: number, value: string) => {
      setForm((f) => ({
        ...f,
        checklistItems: f.checklistItems.map((item, i) =>
          i === index ? { ...item, timeframe: value } : item,
        ),
      }));
    },
    [setForm],
  );

  const updateCriticalRule = useCallback(
    (index: number, value: boolean) => {
      setForm((f) => ({
        ...f,
        checklistItems: f.checklistItems.map((item, i) =>
          i === index ? { ...item, critical: value } : item,
        ),
      }));
    },
    [setForm],
  );

  const updateConfluenceWeight = useCallback(
    (index: number, value: string) => {
      const nextWeight = Number(value);
      setForm((f) => ({
        ...f,
        checklistItems: f.checklistItems.map((item, i) =>
          i === index
            ? {
                ...item,
                weight: Number.isFinite(nextWeight) ? nextWeight : 1,
              }
            : item,
        ),
      }));
    },
    [setForm],
  );

  const bumpConfluenceWeight = useCallback(
    (index: number, delta: number) => {
      setForm((f) => ({
        ...f,
        checklistItems: f.checklistItems.map((item, i) => {
          if (i !== index) return item;
          const w = Number.isFinite(Number(item.weight))
            ? Number(item.weight)
            : 1;
          return { ...item, weight: Math.max(0, w + delta) };
        }),
      }));
    },
    [setForm],
  );

  const handleChecklistImageChange = useCallback(
    async (index: number, event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        if (supabase && user) {
          const uploaded = await uploadChecklistImage(supabase, user.id, file);
          setForm((f) => ({
            ...f,
            checklistItems: f.checklistItems.map((item, i) =>
              i === index
                ? {
                    ...item,
                    image: uploaded.signedUrl,
                    imageRef: uploaded.imageRef,
                  }
                : item,
            ),
          }));
          return;
        }
      } catch (err) {
        logError(err);
        pushToast("Failed to upload screenshot. Try again.", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setForm((f) => ({
          ...f,
          checklistItems: f.checklistItems.map((item, i) =>
            i === index ? { ...item, image: result, imageRef: undefined } : item,
          ),
        }));
      };
      reader.readAsDataURL(file);
    },
    [supabase, user, setForm],
  );

  const removeChecklistScreenshot = useCallback(
    (index: number) => {
      setForm((f) => ({
        ...f,
        checklistItems: f.checklistItems.map((item, i) =>
          i === index
            ? { ...item, image: undefined, imageRef: undefined }
            : item,
        ),
      }));
    },
    [setForm],
  );

  const ringName =
    saveAttempted && missingName ? "ring-1 ring-amber-500/30" : "";

  const filledConfluences = useMemo(
    () => checklistItems.filter((i) => i.text.trim()).length,
    [checklistItems],
  );

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="mt-8 min-w-0 max-w-full space-y-8 overflow-x-hidden sm:mt-10 sm:space-y-10"
      >
        <div className="min-w-0 max-w-full space-y-2">
          <label
            className={`${hintClass} block font-medium uppercase tracking-[0.12em] text-zinc-400`}
          >
            Strategy name
          </label>
          <input
            value={name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={`${STRATEGY_BUILDER_INPUT_CLASS} max-w-full text-[15px] ${ringName}`}
            placeholder="e.g. AOI × ICC"
            autoComplete="off"
          />
          {saveAttempted && missingName ? (
            <p className="text-[11px] text-amber-200/80">
              Name is required to save.
            </p>
          ) : null}
        </div>

        <div className="min-w-0 max-w-full space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Strategy summary
          </h2>
          <textarea
            value={description}
            onChange={(e) => {
              setForm((f) => ({ ...f, description: e.target.value }));
              if (generateFeedback) setGenerateFeedback(null);
            }}
            rows={5}
            className={`${STRATEGY_BUILDER_INPUT_CLASS} resize-y text-[15px] leading-relaxed`}
            placeholder="High-level playbook: bias, what you wait for, how you execute — saved with this strategy."
          />
        </div>

        <div className="min-w-0 max-w-full space-y-2">
          <div className="flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Key points
            </h2>
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={runGenerate}
                disabled={isGenerating}
                className={generateBtnClass}
              >
                {isGenerating
                  ? "Generating…"
                  : generatedKeyPoints.length > 0
                    ? "Regenerate"
                    : "Generate"}
              </button>
              <button
                type="button"
                onClick={clearKeyPoints}
                disabled={generatedKeyPoints.length === 0 || isGenerating}
                className={keyPointsSecondaryBtnClass}
              >
                Remove
              </button>
            </div>
          </div>
          <p className={hintClass}>
            Mock helper: builds 4–8 execution-focused bullets from your summary,
            Notes & saved details (scratch notes, market, timeframes), and
            confluence rows. Regenerate refreshes the list; Remove clears it.
            Not saved to the server.
          </p>
          {generateFeedback ? (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-100/90">
              {generateFeedback}
            </p>
          ) : null}
          {generatedKeyPoints.length > 0 ? (
            <ul className="space-y-1.5 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 sm:px-3.5 sm:py-3">
              {generatedKeyPoints.map((line, i) => (
                <li
                  key={`${i}-${line.slice(0, 24)}`}
                  className="flex min-w-0 max-w-full gap-2 text-[13px] leading-snug text-zinc-200"
                >
                  <span
                    className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400/70"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">{line}</span>
                </li>
              ))}
            </ul>
          ) : !generateFeedback ? (
            <p className="text-[11px] text-zinc-600">
              No key points yet — use Generate after you write a short summary
              and/or confluences.
            </p>
          ) : null}
        </div>

        <p className="text-xs text-zinc-500">
          {filledConfluences > 0
            ? `${filledConfluences} confluence${filledConfluences === 1 ? "" : "s"} in your checklist.`
            : "Add confluences below — they save as your checklist."}
        </p>

        <div className="min-w-0 space-y-3">
          <div className="rounded-lg border border-white/[0.08] bg-zinc-950/35 px-3 py-2.5 sm:px-4 sm:py-3">
            <p className="text-[11px] leading-relaxed text-zinc-400">
              <span className="font-semibold text-zinc-300">
                Checklist order:{" "}
              </span>
              Order your confluences in the sequence you want to check them
              before entry. On each card use{" "}
              <span className="text-zinc-300">Move up / Move down</span> to
              reorder, or{" "}
              <span className="text-zinc-300">Row above / Row below</span> to
              insert a blank step.{" "}
              <span className="text-zinc-500">
                + Add confluence adds one at the bottom.
              </span>
            </p>
          </div>

          <div className="flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
            <div className="min-w-0 max-w-full">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Confluences
              </h2>
              <p className={`${hintClass} mt-1 max-w-xl`}>
                Each step can include an example chart, score, timeframe tags, and
                whether it is a critical rule. Screenshots and order are saved with
                the strategy.
              </p>
            </div>
            <button
              type="button"
              onClick={addConfluence}
              className="shrink-0 self-start rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-500/15 sm:self-auto"
            >
              + Add confluence
            </button>
          </div>

          <ul className={confluenceCardListClass}>
            {checklistItems.map((item, index) => {
              const rowKey = item._rowKey ?? `idx-${index}`;
              return (
                <StrategyConfluenceEditRow
                  key={rowKey}
                  item={item}
                  index={index}
                  rowKey={rowKey}
                  isFirst={index === 0}
                  isLast={index === checklistItems.length - 1}
                  inputClass={STRATEGY_BUILDER_INPUT_CLASS}
                  imageLoading={index < 2 ? "eager" : "lazy"}
                  onOpenLightbox={openScreenshotLightbox}
                  onImageChange={handleChecklistImageChange}
                  onRemoveScreenshot={removeChecklistScreenshot}
                  onUpdateText={updateChecklistItem}
                  onBumpWeight={bumpConfluenceWeight}
                  onWeightInput={updateConfluenceWeight}
                  onTimeframeChange={updateTimeframe}
                  onCriticalChange={updateCriticalRule}
                  onMoveUp={moveConfluenceUp}
                  onMoveDown={moveConfluenceDown}
                  onInsertAbove={insertConfluenceAt}
                  onInsertBelow={insertConfluenceBelow}
                  onRemove={removeConfluence}
                />
              );
            })}
          </ul>
        </div>

        <details className="min-w-0 rounded-lg border border-white/[0.06] bg-zinc-950/30 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
          <summary className="px-4 py-3 text-sm text-zinc-400 hover:text-zinc-200">
            Notes & saved details
          </summary>
          <div className="space-y-4 border-t border-white/[0.06] px-4 py-4">
            <div>
              <label className={`${hintClass} mb-1 block`}>
                Scratch notes (local only — fed into Key points with market &
                timeframes)
              </label>
              <textarea
                value={scratchNotes}
                onChange={(e) => setScratchNotes(e.target.value)}
                rows={3}
                className={`${STRATEGY_BUILDER_INPUT_CLASS} resize-none`}
                placeholder="Optional extra context for key point generation…"
              />
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <div>
                <AppSelect
                  label="Market"
                  value={market}
                  onChange={(v) => setForm((f) => ({ ...f, market: v }))}
                  options={MARKET_OPTIONS}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={`${hintClass} mb-1 block`}>
                  Timeframes (summary)
                </label>
                <input
                  value={timeframes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, timeframes: e.target.value }))
                  }
                  className={STRATEGY_BUILDER_INPUT_CLASS}
                  placeholder="e.g. Daily bias, 15m execution"
                />
              </div>
            </div>
          </div>
        </details>

        <div className="flex min-w-0 flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <AppButton
            type="button"
            variant="secondary"
            onClick={onResetDraft}
            className="w-full border-white/15 sm:w-auto"
          >
            {resetDraftLabel}
          </AppButton>
          <AppButton
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Saving…" : submitLabel}
          </AppButton>
        </div>
      </form>
      {screenshotLightbox ? (
        <ScreenshotLightbox
          src={screenshotLightbox.src}
          alt={screenshotLightbox.alt}
          onClose={closeScreenshotLightbox}
        />
      ) : null}
    </>
  );
}
