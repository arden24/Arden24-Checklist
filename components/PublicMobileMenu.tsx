"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const linkRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export default function PublicMobileMenu() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const id = requestAnimationFrame(() => closeRef.current?.focus());
      return () => {
        cancelAnimationFrame(id);
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-zinc-200 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:hidden"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute inset-y-0 right-0 flex w-[min(100%,18rem)] flex-col border-l border-white/10 bg-zinc-950 p-4 pt-[max(1rem,env(safe-area-inset-top,0px))] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex justify-end">
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 text-zinc-300 touch-manipulation hover:bg-white/5 ${linkRing}`}
                aria-label="Close menu"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className={`mb-2 flex min-h-12 items-center justify-center rounded-xl border border-sky-400/60 bg-sky-500/10 text-sm font-medium text-sky-200 touch-manipulation ${linkRing}`}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setOpen(false)}
              className={`flex min-h-12 items-center justify-center rounded-xl border border-sky-400/60 bg-sky-500/10 text-sm font-medium text-sky-200 touch-manipulation ${linkRing}`}
            >
              Sign up
            </Link>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className={`mt-6 flex min-h-12 items-center justify-center text-sm text-zinc-500 hover:text-zinc-300 ${linkRing}`}
            >
              Home
            </Link>
            <div className="flex-1" />
            <p className="pb-[env(safe-area-inset-bottom,0px)] pt-4 text-center text-[10px] text-zinc-600">
              Arden24
            </p>
          </div>
        </div>
      )}
    </>
  );
}
