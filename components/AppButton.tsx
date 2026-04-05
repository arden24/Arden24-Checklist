"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

type AppButtonProps = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variants: Record<Variant, string> = {
  primary:
    "rounded-xl border border-sky-500/80 bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm font-medium text-zinc-200 hover:border-sky-400/50 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50",
  ghost:
    "rounded-xl border border-transparent px-4 py-3 text-sm font-medium text-zinc-300 hover:border-white/10 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
  destructive:
    "rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200 hover:border-red-400/60 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50",
};

const base =
  "inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:min-h-0 sm:py-2.5";

export default function AppButton({
  variant = "primary",
  className = "",
  children,
  type = "button",
  ...props
}: AppButtonProps) {
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
