"use client";

import type { ButtonHTMLAttributes } from "react";

type HelpButtonProps = {
  onClick: () => void;
  className?: string;
  /** `header` matches Account / Sign out chips in the app navbar. */
  variant?: "default" | "header";
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label">;

const variants = {
  default:
    "inline-flex min-h-11 touch-manipulation shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-[color,background-color,border-color] duration-150 hover:border-sky-400/50 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:min-h-0",
  header:
    "inline-flex min-h-11 shrink-0 touch-manipulation items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-2.5 py-2 text-xs font-medium text-zinc-200 transition-[color,background-color,border-color] duration-150 hover:border-sky-400/60 hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:min-h-0 sm:gap-2 sm:px-3 sm:py-1.5",
} as const;

/**
 * Opens contextual help (paired with HelpModal).
 */
export function HelpButton({
  onClick,
  className = "",
  variant = "default",
  "aria-label": ariaLabel,
}: HelpButtonProps) {
  const base = variants[variant];
  return (
    <button
      type="button"
      className={`${base} ${className}`.trim()}
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={ariaLabel}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-sky-500/40 bg-sky-500/10 text-xs font-semibold text-sky-300" aria-hidden>
        ?
      </span>
      Help
    </button>
  );
}
