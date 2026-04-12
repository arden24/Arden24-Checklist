"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const quickLinks = [
  { href: "/calculator", label: "Lot size calculator", icon: "∑" },
  { href: "/dashboard#dashboard-calculator", label: "Log a trade", icon: "✎" },
  { href: "/checklist", label: "Checklist & log trade", icon: "✓" },
  { href: "/strategies/new", label: "New strategy", icon: "+" },
  { href: "/dashboard", label: "Dashboard", icon: "▣" },
];

export default function QuickAccess() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const root = rootRef.current;
      if (root && !root.contains(e.target as Node)) close();
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (loading || !user) return null;

  return (
    <div ref={rootRef} className="relative">
      {open ? (
        <div
          className="absolute left-0 top-full z-[70] mt-2 w-[min(100vw-2rem,14rem)] max-w-[calc(100vw-2rem)] touch-manipulation rounded-xl border border-white/10 bg-zinc-950 py-2 shadow-[0_16px_48px_rgba(0,0,0,0.75)]"
          role="menu"
          aria-label="Quick access"
        >
          <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
            Quick access
          </p>
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={close}
              className="flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm text-zinc-200 active:bg-white/[0.06] sm:min-h-0 sm:py-2 md:hover:bg-sky-500/10 md:hover:text-sky-200"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300">
                {item.icon}
              </span>
              <span className="min-w-0 leading-snug">{item.label}</span>
            </Link>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-xl border border-white/10 bg-zinc-950 p-2 text-sky-400 transition hover:border-sky-400/60 hover:bg-sky-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:min-h-0 sm:min-w-0"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Close quick access menu" : "Open quick access menu"}
        title="Quick access"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M8 6h8M8 10h8M8 14h4M14 14h4M8 18h4M14 18h4" />
        </svg>
        <span className="ml-1.5 hidden max-w-[120px] overflow-hidden text-xs font-medium text-zinc-300 opacity-0 transition-all duration-200 sm:inline sm:max-w-0 sm:opacity-0 md:group-hover:max-w-[120px] md:group-hover:opacity-100 md:group-hover:text-sky-200">
          Quick access
        </span>
      </button>
    </div>
  );
}
