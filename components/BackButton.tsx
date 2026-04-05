"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type BackButtonProps = {
  /** Used when there is no safe browser history to go back to */
  fallbackHref?: string;
  className?: string;
  label?: string;
};

const baseClass =
  "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-medium text-zinc-200 touch-manipulation transition hover:border-sky-400/60 hover:text-sky-300 active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:min-h-0 sm:min-w-0 sm:px-3 sm:py-1.5 sm:text-xs";

export default function BackButton({
  fallbackHref,
  className = "",
  label = "Back",
}: BackButtonProps) {
  const router = useRouter();
  const { user } = useAuth();
  const fallback = fallbackHref ?? (user ? "/dashboard" : "/");

  function handleBack() {
    if (typeof window === "undefined") {
      router.push(fallback);
      return;
    }
    const canGoBack = window.history.length > 1;
    if (canGoBack) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`${baseClass} ${className}`.trim()}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/10" aria-hidden>
        <svg
          viewBox="0 0 20 20"
          className="h-3 w-3 text-sky-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11.75 4.75 7 9.5l4.75 4.75" />
        </svg>
      </span>
      <span>{label}</span>
    </button>
  );
}
