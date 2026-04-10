"use client";

import { memo, useState } from "react";
import {
  confluenceMetadataLabelClass,
  confluenceMetadataShellBase,
} from "@/components/confluence-card-layout";
import { joinTimeframeTags, parseTimeframeTags } from "@/lib/confluence-timeframe-tags";

/** Standard timeframe options for the picker; any number can be attached per confluence. */
export const TF_PRESETS = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1H",
  "2H",
  "4H",
  "1D",
  "1W",
] as const;

type TimeframeTagsEditorProps = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
};

function TimeframeTagsEditorInner({
  value,
  onChange,
  disabled,
}: TimeframeTagsEditorProps) {
  const tags = parseTimeframeTags(value);
  const [custom, setCustom] = useState("");
  const [timeframeSelectKey, setTimeframeSelectKey] = useState(0);

  function setTags(next: string[]) {
    onChange(joinTimeframeTags(next));
  }

  function addTag(t: string) {
    const x = t.trim();
    if (!x) return;
    const lower = x.toLowerCase();
    if (tags.some((a) => a.toLowerCase() === lower)) return;
    setTags([...tags, x]);
  }

  function removeAt(i: number) {
    setTags(tags.filter((_, j) => j !== i));
  }

  const innerSelectClass =
    "w-full min-w-0 rounded-md border border-white/10 bg-zinc-950/90 px-2 py-2.5 text-xs font-medium text-white outline-none focus:border-sky-500/40 sm:w-[7.5rem] sm:shrink-0 sm:py-2";
  const innerInputClass =
    "min-h-[44px] min-w-0 flex-1 rounded-md border border-white/10 bg-zinc-950/90 px-2.5 py-2 text-xs font-medium text-white outline-none placeholder:text-zinc-600 focus:border-sky-500/40 sm:min-h-0";

  return (
    <div
      className={`${confluenceMetadataShellBase} min-h-0 max-w-full border-white/10 bg-black/40`}
    >
      <span className={`${confluenceMetadataLabelClass} text-left`}>
        Valid timeframes
      </span>
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
        {tags.length === 0 ? (
          <span className="text-[11px] font-medium text-zinc-500">
            None selected — optional critical rule context
          </span>
        ) : null}
        {tags.map((tag, i) => (
          <span
            key={`${i}-${tag}`}
            className="inline-flex max-w-full min-h-9 items-center gap-1 rounded-md border border-sky-500/25 bg-sky-500/[0.08] px-2.5 py-1 text-xs font-semibold tracking-tight text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.06)]"
          >
            <span className="min-w-0 truncate">{tag}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeAt(i)}
              className="flex h-7 min-h-[28px] w-7 min-w-[28px] shrink-0 items-center justify-center rounded text-sm font-bold leading-none text-sky-200/80 hover:bg-red-500/20 hover:text-red-200 disabled:opacity-40"
              aria-label={`Remove timeframe ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {!disabled ? (
        <div className="mt-3 flex min-w-0 max-w-full flex-col gap-2 border-t border-white/[0.06] pt-3 sm:flex-row sm:flex-wrap sm:items-stretch">
          <select
            key={timeframeSelectKey}
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) {
                addTag(v);
                setTimeframeSelectKey((k) => k + 1);
              }
            }}
            className={innerSelectClass}
            aria-label="Add standard timeframe"
          >
            <option value="">Timeframe…</option>
            {TF_PRESETS.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
          <div className="flex min-w-0 max-w-full flex-[1_1_12rem] items-stretch gap-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(custom);
                  setCustom("");
                }
              }}
              placeholder="Custom label"
              className={innerInputClass}
              aria-label="Custom timeframe"
            />
            <button
              type="button"
              onClick={() => {
                addTag(custom);
                setCustom("");
              }}
              className="min-h-[44px] shrink-0 rounded-md border border-sky-500/35 bg-sky-500/15 px-3 text-xs font-semibold text-sky-100 hover:bg-sky-500/25 sm:min-h-0 sm:py-2"
            >
              Add
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const TimeframeTagsEditor = memo(TimeframeTagsEditorInner);
