"use client";

import { useState, useRef, useEffect } from "react";
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
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (loading || !user) return null;

  return (
    <div className="relative" ref={panelRef}>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-700 bg-zinc-950 py-2 shadow-xl">
          <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500">
            Quick access
          </p>
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-200 hover:bg-sky-500/10 hover:text-sky-200"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex items-center justify-center rounded-xl border border-white/10 bg-zinc-950 p-2 text-sky-400 transition hover:border-sky-400/60 hover:bg-sky-500/10"
        aria-label={open ? "Close quick access" : "Quick access"}
        title="Quick access"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
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
        <span className="ml-1.5 max-w-0 overflow-hidden text-xs font-medium text-zinc-300 opacity-0 transition-all duration-200 group-hover:max-w-[120px] group-hover:opacity-100 group-hover:text-sky-200">
          Quick access
        </span>
      </button>
    </div>
  );
}
