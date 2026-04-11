"use client";

import { memo, useCallback } from "react";
import type { ChangeEvent } from "react";
import {
  ConfluenceCard,
  ConfluenceScreenshotFrame,
  confluenceMetadataLabelClass,
  confluenceMetadataShellBase,
  confluenceScreenshotMaxHeightClass,
  confluenceScreenshotSizesAttr,
  confluenceScoreStyles,
} from "@/components/confluence-card-layout";
import { TimeframeTagsEditor } from "@/components/TimeframeTagsEditor";
import type { ChecklistItem } from "@/lib/supabase/strategies";

const confluenceActionBtnClass =
  "inline-flex min-h-9 min-w-0 shrink-0 items-center justify-center rounded-md border border-white/10 bg-zinc-950/60 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:border-white/20 hover:bg-zinc-900 hover:text-white disabled:pointer-events-none disabled:opacity-35 sm:min-h-8";

export type StrategyConfluenceEditRowProps = {
  item: ChecklistItem;
  index: number;
  rowKey: string;
  isFirst: boolean;
  isLast: boolean;
  inputClass: string;
  imageLoading: "eager" | "lazy";
  onOpenLightbox: (src: string, alt: string) => void;
  onImageChange: (index: number, e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveScreenshot: (index: number) => void;
  onUpdateText: (index: number, value: string) => void;
  onBumpWeight: (index: number, delta: number) => void;
  onWeightInput: (index: number, value: string) => void;
  onTimeframeChange: (index: number, value: string) => void;
  onCriticalChange: (index: number, value: boolean) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onInsertAbove: (index: number) => void;
  onInsertBelow: (index: number) => void;
  onRemove: (index: number) => void;
};

function StrategyConfluenceEditRowInner(props: StrategyConfluenceEditRowProps) {
  const {
    item,
    index,
    rowKey,
    isFirst,
    isLast,
    inputClass,
    imageLoading,
    onOpenLightbox,
    onImageChange,
    onRemoveScreenshot,
    onUpdateText,
    onBumpWeight,
    onWeightInput,
    onTimeframeChange,
    onCriticalChange,
    onMoveUp,
    onMoveDown,
    onInsertAbove,
    onInsertBelow,
    onRemove,
  } = props;

  const score = confluenceScoreStyles(item.weight);

  const handleTimeframe = useCallback(
    (next: string) => onTimeframeChange(index, next),
    [index, onTimeframeChange],
  );

  const step = index + 1;

  return (
    <ConfluenceCard
      stepNumber={step}
      screenshotColumn={
        <>
          <ConfluenceScreenshotFrame>
            {item.image ? (
              <button
                type="button"
                onClick={() =>
                  onOpenLightbox(
                    item.image!,
                    `Confluence ${step} — preview; close when done`,
                  )
                }
                className={`flex ${confluenceScreenshotMaxHeightClass} w-full max-w-full min-w-0 cursor-zoom-in items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/30`}
                aria-label="Open chart screenshot preview"
              >
                <img
                  src={item.image}
                  alt=""
                  className={`${confluenceScreenshotMaxHeightClass} max-w-full object-contain`}
                  loading={imageLoading}
                  decoding="async"
                  sizes={confluenceScreenshotSizesAttr}
                  fetchPriority={imageLoading === "eager" ? "high" : undefined}
                />
              </button>
            ) : (
              <label
                className={`flex ${confluenceScreenshotMaxHeightClass} min-h-[96px] w-full max-w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-sky-500/25 bg-zinc-950/70 p-3 text-center transition hover:border-sky-400/40 hover:bg-zinc-900/80`}
              >
                <span className="text-[11px] font-semibold leading-tight text-sky-200/95">
                  Add chart screenshot
                </span>
                <span className="max-w-[14rem] text-[10px] leading-snug text-zinc-500">
                  Upload an example chart for this confluence (tap to choose a
                  file).
                </span>
                <input
                  key={`n-${rowKey}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onImageChange(index, e)}
                />
              </label>
            )}
          </ConfluenceScreenshotFrame>
          {item.image ? (
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 gap-y-1">
              <label className="min-w-0 cursor-pointer text-[10px] text-sky-300/90">
                <span className="inline-block rounded border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 font-medium">
                  Replace screenshot
                </span>
                <input
                  key={`img-${rowKey}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onImageChange(index, e)}
                />
              </label>
              <button
                type="button"
                onClick={() => onRemoveScreenshot(index)}
                className="shrink-0 text-[10px] text-red-300/80 hover:text-red-200"
              >
                Remove
              </button>
            </div>
          ) : null}
        </>
      }
      rule={
        <textarea
          value={item.text}
          onChange={(e) => onUpdateText(index, e.target.value)}
          placeholder="Critical confluence rule — e.g. Liquidity sweep confirmed"
          rows={2}
          className={`${inputClass} min-h-[90px] min-w-0 max-h-[140px] w-full max-w-full resize-y border-0 bg-transparent p-0 focus:ring-0 sm:max-h-[160px] lg:max-h-[180px]`}
        />
      }
      metadata={
        <>
          <div
            className={`${confluenceMetadataShellBase} flex w-full min-w-0 shrink-0 flex-col items-stretch lg:w-[12.5rem] lg:max-w-[13.5rem] ${score.shellClass}`}
          >
            <span className={`${confluenceMetadataLabelClass} text-center`}>
              Score
            </span>
            <div className="flex min-w-0 items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => onBumpWeight(index, -1)}
                className="flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-md border border-white/10 bg-zinc-950/80 text-lg font-semibold leading-none text-zinc-300 hover:border-white/20 hover:bg-zinc-900 hover:text-white sm:h-10 sm:min-h-0 sm:w-10 sm:min-w-0"
                aria-label="Decrease score"
              >
                -
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={score.w}
                onChange={(e) => onWeightInput(index, e.target.value)}
                className={`h-11 min-h-[44px] min-w-0 flex-1 rounded-md border border-white/10 bg-zinc-950/90 py-2 text-center text-lg font-semibold tabular-nums outline-none [appearance:textfield] [-moz-appearance:textfield] focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 sm:h-10 sm:min-h-0 sm:w-[4.5rem] sm:flex-none sm:text-base [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${score.valueClass}`}
                aria-label={`Checklist score for confluence ${step}`}
              />
              <button
                type="button"
                onClick={() => onBumpWeight(index, 1)}
                className="flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-md border border-white/10 bg-zinc-950/80 text-lg font-semibold leading-none text-zinc-300 hover:border-white/20 hover:bg-zinc-900 hover:text-white sm:h-10 sm:min-h-0 sm:w-10 sm:min-w-0"
                aria-label="Increase score"
              >
                +
              </button>
            </div>
            <span className="mt-2 text-center text-[10px] font-medium text-zinc-500">
              Checklist points
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <TimeframeTagsEditor
              value={item.timeframe}
              onChange={handleTimeframe}
            />
          </div>

          <div
            className={`${confluenceMetadataShellBase} flex w-full min-w-0 shrink-0 flex-col border-white/10 bg-black/40 lg:w-[12.75rem] lg:max-w-[14rem] ${
              item.critical
                ? "border-amber-400/30 bg-amber-500/[0.07] shadow-[0_0_0_1px_rgba(251,191,36,0.06)]"
                : ""
            }`}
          >
            <span className={`${confluenceMetadataLabelClass} text-center`}>
              Critical rule
            </span>
            <div className="flex rounded-lg border border-white/10 bg-zinc-950/95 p-1">
              <button
                type="button"
                onClick={() => onCriticalChange(index, false)}
                className={`min-h-11 flex-1 rounded-md py-2.5 text-xs font-semibold transition sm:min-h-0 sm:py-2 ${
                  !item.critical
                    ? "bg-white/12 text-white shadow-[0_1px_0_0_rgba(255,255,255,0.06)]"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => onCriticalChange(index, true)}
                className={`min-h-11 flex-1 rounded-md py-2.5 text-xs font-semibold transition sm:min-h-0 sm:py-2 ${
                  item.critical
                    ? "border border-amber-500/35 bg-amber-500/20 text-amber-100 shadow-sm"
                    : "text-zinc-500 hover:bg-amber-500/10 hover:text-amber-200/90"
                }`}
              >
                Critical
              </button>
            </div>
            <span className="mt-2 text-center text-[10px] leading-snug text-zinc-600">
              Critical confluences must pass on the checklist
            </span>
          </div>
        </>
      }
      footer={
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 gap-y-2">
            <button
              type="button"
              onClick={() => onMoveUp(index)}
              disabled={isFirst}
              className={confluenceActionBtnClass}
              aria-label="Move this confluence up in the checklist"
            >
              Move up
            </button>
            <button
              type="button"
              onClick={() => onMoveDown(index)}
              disabled={isLast}
              className={confluenceActionBtnClass}
              aria-label="Move this confluence down in the checklist"
            >
              Move down
            </button>
            <button
              type="button"
              onClick={() => onInsertAbove(index)}
              className={confluenceActionBtnClass}
              aria-label="Insert a new confluence row above this one"
            >
              Row above
            </button>
            <button
              type="button"
              onClick={() => onInsertBelow(index)}
              className={confluenceActionBtnClass}
              aria-label="Insert a new confluence row below this one"
            >
              Row below
            </button>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className={`${confluenceActionBtnClass} border-red-500/20 text-red-300/90 hover:border-red-500/35 hover:bg-red-950/40 hover:text-red-200`}
              aria-label="Remove this confluence"
            >
              Remove
            </button>
        </div>
      }
    />
  );
}

function propsEqual(
  a: StrategyConfluenceEditRowProps,
  b: StrategyConfluenceEditRowProps,
): boolean {
  return (
    a.item === b.item &&
    a.index === b.index &&
    a.rowKey === b.rowKey &&
    a.isFirst === b.isFirst &&
    a.isLast === b.isLast &&
    a.inputClass === b.inputClass &&
    a.imageLoading === b.imageLoading &&
    a.onOpenLightbox === b.onOpenLightbox &&
    a.onImageChange === b.onImageChange &&
    a.onRemoveScreenshot === b.onRemoveScreenshot &&
    a.onUpdateText === b.onUpdateText &&
    a.onBumpWeight === b.onBumpWeight &&
    a.onWeightInput === b.onWeightInput &&
    a.onTimeframeChange === b.onTimeframeChange &&
    a.onCriticalChange === b.onCriticalChange &&
    a.onMoveUp === b.onMoveUp &&
    a.onMoveDown === b.onMoveDown &&
    a.onInsertAbove === b.onInsertAbove &&
    a.onInsertBelow === b.onInsertBelow &&
    a.onRemove === b.onRemove
  );
}

export const StrategyConfluenceEditRow = memo(
  StrategyConfluenceEditRowInner,
  propsEqual,
);
