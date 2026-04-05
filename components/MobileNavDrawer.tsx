"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import type { MainNavItem } from "@/components/main-nav";
import {
  MOBILE_EXTRA_LINKS,
  isMainNavItemActive,
  isMobileExtraLinkActive,
} from "@/components/main-nav";

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  pathname: string;
  navItems: MainNavItem[];
  liveTradesCount: number;
  user: User | null;
  loading: boolean;
  onSignOut: () => void;
};

export default function MobileNavDrawer({
  open,
  onClose,
  pathname,
  navItems,
  liveTradesCount,
  user,
  loading,
  onSignOut,
}: MobileNavDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const id = requestAnimationFrame(() => closeButtonRef.current?.focus());
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

  if (!open) return null;

  const linkFocus =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

  return (
    <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true" aria-label="Main menu">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500/40"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className="absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col border-l border-white/10 bg-zinc-950 shadow-2xl pt-[env(safe-area-inset-top,0px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="text-sm font-semibold text-white">Menu</span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 text-zinc-300 touch-manipulation hover:bg-white/5 ${linkFocus}`}
            aria-label="Close menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4" aria-label="Primary">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Navigate
          </p>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = isMainNavItemActive(pathname, item.href);
              const badgeCount = item.showBadge ? liveTradesCount : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={`${linkFocus} flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold touch-manipulation ${
                      active
                        ? "bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/25"
                        : "text-zinc-200 hover:bg-white/5"
                    }`}
                  >
                    <span className="relative flex shrink-0">
                      {item.icon}
                      {badgeCount > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-bold text-black">
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="mt-6 px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            More
          </p>
          <ul className="space-y-1">
            {MOBILE_EXTRA_LINKS.map((item) => {
              const active = isMobileExtraLinkActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={`${linkFocus} flex min-h-12 items-center rounded-xl px-3 py-3 text-sm touch-manipulation ${
                      active
                        ? "bg-sky-500/10 font-semibold text-sky-200 ring-1 ring-sky-500/20"
                        : "font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          {!loading &&
            (user ? (
              <div className="flex flex-col gap-2">
                <Link
                  href="/account"
                  onClick={onClose}
                  className={`${linkFocus} flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-black/40 px-3 text-sm font-medium text-zinc-200 touch-manipulation hover:border-sky-400/60`}
                >
                  Account
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className={`${linkFocus} min-h-12 rounded-xl border border-white/10 bg-black/40 px-3 text-sm font-medium text-zinc-200 touch-manipulation hover:border-red-400/60 hover:text-red-300`}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/"
                  onClick={onClose}
                  className={`${linkFocus} flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-black/30 px-3 text-sm font-medium text-zinc-300 touch-manipulation hover:bg-white/5`}
                >
                  Home
                </Link>
                <Link
                  href="/sign-in"
                  onClick={onClose}
                  className={`${linkFocus} flex min-h-12 items-center justify-center rounded-xl border border-sky-400/60 bg-sky-500/10 text-sm font-medium text-sky-200 touch-manipulation`}
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  onClick={onClose}
                  className={`${linkFocus} flex min-h-12 items-center justify-center rounded-xl border border-sky-400/60 bg-sky-500/10 text-sm font-medium text-sky-200 touch-manipulation`}
                >
                  Sign up
                </Link>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
