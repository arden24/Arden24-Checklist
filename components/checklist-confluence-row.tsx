"use client";

import { memo, useCallback } from "react";
import {
  ConfluenceCard,
  ConfluenceCriticalReadOnly,
  ConfluenceScreenshotFrame,
  ConfluenceScoreReadOnly,
  ConfluenceTimeframeReadOnly,
  confluenceScreenshotMaxHeightClass,
  confluenceScreenshotSizesAttr,
} from "@/components/confluence-card-layout";
import type { ChecklistItem } from "@/lib/supabase/strategies";

export type ChecklistConfluenceRowProps = {
  index: number;
  stepNumber: number;
  item: ChecklistItem;
  checked: boolean;
  imageLoading: "eager" | "lazy";
  onToggle: (index: number) => void;
  onOpenLightbox: (src: string, alt: string) => void;
};

function ChecklistConfluenceRowInner({
  stepNumber,
  item,
  checked,
  index,
  imageLoading,
  onToggle,
  onOpenLightbox,
}: ChecklistConfluenceRowProps) {
  const handleToggle = useCallback(() => onToggle(index), [index, onToggle]);

  return (
    <ConfluenceCard
      stepNumber={stepNumber}
      headerTrailing={
        <label className="flex min-h-10 max-w-full cursor-pointer items-center gap-2.5 rounded-lg border border-white/12 bg-zinc-950/70 px-3 py-2 sm:min-h-9">
          <input
            type="checkbox"
            checked={checked}
            onChange={handleToggle}
            className="h-4 w-4 shrink-0 rounded border-zinc-600 bg-slate-950 text-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:ring-offset-0"
          />
          <span className="text-xs font-medium text-zinc-200">
            {checked ? "Passed" : "Mark passed"}
          </span>
        </label>
      }
      screenshotColumn={
        <ConfluenceScreenshotFrame>
          {item.image ? (
            <button
              type="button"
              onClick={() =>
                onOpenLightbox(item.image!, `Step ${stepNumber} screenshot`)
              }
              className={`flex ${confluenceScreenshotMaxHeightClass} w-full min-w-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-black/30`}
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
            <div className="flex min-h-[90px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-white/12 bg-zinc-950/60 px-3 py-4 text-center md:min-h-[100px]">
              <span className="text-[10px] font-medium text-zinc-500">
                No screenshot
              </span>
              <span className="mt-1 text-[10px] text-zinc-600">
                Add one in the strategy editor
              </span>
            </div>
          )}
        </ConfluenceScreenshotFrame>
      }
      rule={
        <p className="text-sm leading-relaxed text-zinc-100">
          {item.text || <span className="text-zinc-500">(Empty rule)</span>}
        </p>
      }
      metadata={
        <>
          <ConfluenceScoreReadOnly weight={item.weight} />
          <ConfluenceTimeframeReadOnly value={item.timeframe} />
          <ConfluenceCriticalReadOnly critical={item.critical} />
        </>
      }
    />
  );
}

function rowPropsEqual(
  a: ChecklistConfluenceRowProps,
  b: ChecklistConfluenceRowProps,
): boolean {
  return (
    a.stepNumber === b.stepNumber &&
    a.item === b.item &&
    a.checked === b.checked &&
    a.index === b.index &&
    a.imageLoading === b.imageLoading &&
    a.onToggle === b.onToggle &&
    a.onOpenLightbox === b.onOpenLightbox
  );
}

export const ChecklistConfluenceRow = memo(
  ChecklistConfluenceRowInner,
  rowPropsEqual,
);
