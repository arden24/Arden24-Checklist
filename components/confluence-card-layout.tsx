import type { ReactNode } from "react";
import { parseTimeframeTags } from "@/lib/confluence-timeframe-tags";

/** Shared label for Score / Timeframes / Critical metadata blocks (strategy editor + checklist). */
export const confluenceMetadataLabelClass =
  "mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400";

/** Base shell for metadata cards (Score uses accent variants on top of this). */
export const confluenceMetadataShellBase =
  "min-w-0 rounded-lg border px-3 py-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]";

export function confluenceScoreStyles(weight: unknown): {
  w: number;
  shellClass: string;
  valueClass: string;
} {
  const w = Number.isFinite(Number(weight)) ? Number(weight) : 1;
  const shellClass =
    w >= 4
      ? "border-amber-400/35 bg-amber-500/[0.07] shadow-[0_0_0_1px_rgba(251,191,36,0.08)]"
      : w >= 2
        ? "border-sky-400/25 bg-sky-500/[0.06]"
        : "border-white/10 bg-black/40";
  const valueClass =
    w >= 4 ? "text-amber-100" : w >= 2 ? "text-sky-100" : "text-zinc-100";
  return { w, shellClass, valueClass };
}

/** Vertical gap between confluence cards in a list. */
export const confluenceCardListClass =
  "min-w-0 max-w-full list-none space-y-5 p-0 sm:space-y-6";

/** Outer shell for one confluence step (edit or checklist). */
export const confluenceCardOuterClass =
  "min-w-0 max-w-full overflow-hidden rounded-xl border border-white/[0.12] bg-zinc-950/[0.72] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.06] sm:rounded-2xl";

export const confluenceCardHeaderClass =
  "flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.1] bg-zinc-900/50 px-4 py-3 sm:px-5";

export const confluenceStepBadgeClass =
  "inline-flex shrink-0 items-center rounded-lg border border-white/18 bg-zinc-950/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-100";

export const confluenceCardBodyClass =
  "space-y-5 p-4 sm:space-y-6 sm:p-5";

export const confluenceMainGridClass =
  "grid min-w-0 max-w-full grid-cols-1 gap-5 md:grid-cols-[260px_minmax(0,1fr)] md:gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6";

export const confluenceScreenshotColumnClass = "min-w-0 max-w-full space-y-3";

/**
 * Max height for confluence screenshot areas; images use `object-contain` so the
 * full photo stays visible. Shared by strategy edit and pre-trade checklist.
 */
export const confluenceScreenshotMaxHeightClass =
  "max-h-[220px] md:max-h-[280px] lg:max-h-[320px]";

/** `sizes` hint for checklist screenshots (column width ~260–320px on md+). */
export const confluenceScreenshotSizesAttr =
  "(max-width: 768px) 100vw, min(360px, 42vw)";

/** Frames the screenshot preview (same visual weight on mobile and desktop). */
export function ConfluenceScreenshotFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-white/12 bg-black/55 p-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
      {children}
    </div>
  );
}

export const confluenceRuleShellClass =
  "min-w-0 max-w-full rounded-xl border border-white/10 bg-zinc-900/45 p-3 sm:p-4";

export const confluenceMetadataRowClass =
  "flex min-w-0 max-w-full flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-5";

export const confluenceFooterRowClass =
  "mt-1 border-t border-white/[0.08] pt-4";

type ConfluenceCardProps = {
  stepNumber: number;
  headerTrailing?: ReactNode;
  screenshotColumn: ReactNode;
  rule: ReactNode;
  metadata: ReactNode;
  footer?: ReactNode;
};

/**
 * Shared skeleton for strategy edit and pre-trade checklist: header (step + optional
 * checklist control), screenshot column, rule, metadata row, optional footer actions.
 */
export function ConfluenceCard({
  stepNumber,
  headerTrailing,
  screenshotColumn,
  rule,
  metadata,
  footer,
}: ConfluenceCardProps) {
  return (
    <li className={confluenceCardOuterClass}>
      <div className={confluenceCardHeaderClass}>
        <span className={confluenceStepBadgeClass}>Step {stepNumber}</span>
        {headerTrailing ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
            {headerTrailing}
          </div>
        ) : null}
      </div>
      <div className={confluenceCardBodyClass}>
        <div className={confluenceMainGridClass}>
          <div className={confluenceScreenshotColumnClass}>{screenshotColumn}</div>
          <div className="flex min-w-0 max-w-full flex-col gap-5 sm:gap-6">
            <div className={confluenceRuleShellClass}>{rule}</div>
            <div className={confluenceMetadataRowClass}>{metadata}</div>
            {footer ? <div className={confluenceFooterRowClass}>{footer}</div> : null}
          </div>
        </div>
      </div>
    </li>
  );
}

type ConfluenceScoreReadOnlyProps = {
  weight: unknown;
};

export function ConfluenceScoreReadOnly({ weight }: ConfluenceScoreReadOnlyProps) {
  const score = confluenceScoreStyles(weight);
  return (
    <div
      className={`${confluenceMetadataShellBase} flex w-full min-w-0 shrink-0 flex-col items-stretch lg:w-[12.5rem] lg:max-w-[13.5rem] ${score.shellClass}`}
    >
      <span className={`${confluenceMetadataLabelClass} text-center`}>Score</span>
      <div className="flex min-h-[2.75rem] min-w-0 items-center justify-center">
        <span
          className={`text-2xl font-semibold tabular-nums sm:text-xl ${score.valueClass}`}
        >
          {score.w}
        </span>
      </div>
      <span className="mt-2 text-center text-[10px] font-medium text-zinc-500">
        Checklist points
      </span>
    </div>
  );
}

type ConfluenceTimeframeReadOnlyProps = {
  value: string;
};

export function ConfluenceTimeframeReadOnly({ value }: ConfluenceTimeframeReadOnlyProps) {
  const tags = parseTimeframeTags(value);
  return (
    <div
      className={`${confluenceMetadataShellBase} min-h-0 max-w-full flex-1 border-white/10 bg-black/40`}
    >
      <span className={`${confluenceMetadataLabelClass} text-left`}>
        Valid timeframes
      </span>
      {tags.length === 0 ? (
        <span className="text-[11px] font-medium text-zinc-500">
          None specified — optional context
        </span>
      ) : (
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
          {tags.map((tag, i) => (
            <span
              key={`${i}-${tag}`}
              className="inline-flex max-w-full items-center rounded-md border border-sky-500/25 bg-sky-500/[0.08] px-2.5 py-1 text-xs font-semibold tracking-tight text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.06)]"
            >
              <span className="min-w-0 truncate">{tag}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

type ConfluenceCriticalReadOnlyProps = {
  critical: boolean;
};

/** Mirrors the strategy editor segmented control; read-only. */
export function ConfluenceCriticalReadOnly({
  critical,
}: ConfluenceCriticalReadOnlyProps) {
  return (
    <div
      className={`${confluenceMetadataShellBase} flex w-full min-w-0 shrink-0 flex-col border-white/10 bg-black/40 lg:w-[12.75rem] lg:max-w-[14rem] ${
        critical
          ? "border-amber-400/30 bg-amber-500/[0.07] shadow-[0_0_0_1px_rgba(251,191,36,0.06)]"
          : ""
      }`}
    >
      <span className={`${confluenceMetadataLabelClass} text-center`}>
        Critical rule
      </span>
      <div className="flex rounded-lg border border-white/10 bg-zinc-950/95 p-1">
        <span
          className={`min-h-10 flex-1 rounded-md py-2.5 text-center text-xs font-semibold sm:min-h-0 sm:py-2 ${
            !critical
              ? "bg-white/12 text-white shadow-[0_1px_0_0_rgba(255,255,255,0.06)]"
              : "text-zinc-500"
          }`}
        >
          Standard
        </span>
        <span
          className={`min-h-10 flex-1 rounded-md py-2.5 text-center text-xs font-semibold sm:min-h-0 sm:py-2 ${
            critical
              ? "border border-amber-500/35 bg-amber-500/20 text-amber-100 shadow-sm"
              : "text-zinc-500"
          }`}
        >
          Critical
        </span>
      </div>
      <span className="mt-2 text-center text-[10px] leading-snug text-zinc-600">
        Critical confluences must pass on the checklist
      </span>
    </div>
  );
}
