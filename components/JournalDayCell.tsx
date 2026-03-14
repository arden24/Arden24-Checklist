"use client";

type JournalDayCellProps = {
  day: number | null;
  pnl: number | null;
  isSelected: boolean;
  isCurrentMonth: boolean;
  isToday: boolean;
  onClick: () => void;
};

function formatPnlShort(pnl: number): string {
  if (pnl > 0) return `+${pnl.toFixed(0)}`;
  if (pnl < 0) return pnl.toFixed(0);
  return "0";
}

export default function JournalDayCell({
  day,
  pnl,
  isSelected,
  isCurrentMonth,
  isToday,
  onClick,
}: JournalDayCellProps) {
  const isEmpty = day === null;
  const bgClass =
    pnl !== null && pnl > 0
      ? "bg-emerald-500/20 border-emerald-400/30"
      : pnl !== null && pnl < 0
      ? "bg-red-500/20 border-red-400/30"
      : "bg-slate-800/40 border-white/5";

  const textMuted = !isCurrentMonth ? "text-zinc-500" : "text-zinc-200";
  const borderGlow = isSelected
    ? "ring-2 ring-emerald-400/60 shadow-[0_0_12px_rgba(52,211,153,0.15)]"
    : "";

  if (isEmpty) {
    return (
      <div
        className="min-h-[80px] rounded-xl border border-white/5 bg-slate-900/30"
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[80px] w-full rounded-xl border text-left transition-all hover:opacity-90 ${bgClass} ${borderGlow} ${textMuted}`}
    >
      <div className="flex flex-col gap-0.5 p-2">
        <span
          className={`text-sm font-semibold ${
            isToday ? "rounded-full bg-emerald-500/30 px-1.5 text-emerald-200" : ""
          }`}
        >
          {day}
        </span>
        {pnl !== null && (
          <span
            className={`text-xs font-medium ${
              pnl > 0
                ? "text-emerald-400"
                : pnl < 0
                ? "text-red-400"
                : "text-zinc-400"
            }`}
          >
            {formatPnlShort(pnl)}
          </span>
        )}
      </div>
    </button>
  );
}
