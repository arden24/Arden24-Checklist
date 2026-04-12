"use client";

/**
 * Reserved vertical space + pulse to avoid layout shift while lazy panels load.
 */
export function PanelSkeleton({
  className = "",
  lines = 5,
  minHeight,
}: {
  className?: string;
  lines?: number;
  /** e.g. "min-h-[16rem]" for chart-sized slots */
  minHeight?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-white/[0.06] bg-zinc-950/50 p-4 ${minHeight ?? ""} ${className}`.trim()}
      aria-hidden
    >
      <div className="mb-3 h-3 w-1/3 rounded bg-zinc-800/80" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-2.5 rounded bg-zinc-800/60"
            style={{ width: `${72 + ((i * 17) % 24)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
