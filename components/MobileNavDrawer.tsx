"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { User } from "@supabase/supabase-js";
import type { MainNavItem } from "@/components/main-nav";
import { isMainNavItemActive } from "@/components/main-nav";
import {
  QUICK_ACTIONS_CORE,
  isQuickActionActive,
  quickActionPrimaryShellClass,
} from "@/components/quick-actions-config";
import {
  MOBILE_DRAWER_TRANSITION_MS,
  drawerLinkFocusClass,
  drawerMotionClass,
  useDrawerFocusTrap,
  useReturnFocusToTrigger,
} from "@/lib/mobile-drawer";
import { useWindowHash } from "@/lib/use-window-hash";

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  pathname: string;
  navItems: MainNavItem[];
  liveTradesCount: number;
  user: User | null;
  loading: boolean;
  onSignOut: () => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  onDrawerVisibleChange?: (visible: boolean) => void;
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
  menuButtonRef,
  onDrawerVisibleChange,
}: MobileNavDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const bodyOverflowRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onDrawerVisibleChange?.(visible);
  }, [visible, onDrawerVisibleChange]);

  useEffect(() => {
    if (open) {
      setVisible(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setAnimateIn(false);
    const t = window.setTimeout(() => setVisible(false), MOBILE_DRAWER_TRANSITION_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia("(min-width: 768px)");
    function closeOnDesktop() {
      if (mq.matches) onClose();
    }
    mq.addEventListener("change", closeOnDesktop);
    return () => mq.removeEventListener("change", closeOnDesktop);
  }, [mounted, onClose]);

  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  useEffect(() => {
    if (!visible) return;
    bodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    });
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = bodyOverflowRef.current ?? "";
    };
  }, [visible]);

  useReturnFocusToTrigger(visible, menuButtonRef);
  useDrawerFocusTrap(panelRef, visible && animateIn);
  const windowHash = useWindowHash(pathname);

  if (!mounted || !visible) return null;

  const navLinkClass = (active: boolean) =>
    `${drawerLinkFocusClass} flex w-full min-h-[3rem] shrink-0 items-center gap-3.5 rounded-xl px-3.5 py-3.5 text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em] touch-manipulation transition-colors duration-150 ease-out motion-reduce:transition-none ${
      active
        ? "border border-sky-400/28 bg-sky-500/[0.11] text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.09),inset_0_1px_0_0_rgba(255,255,255,0.035)]"
        : "border border-transparent text-zinc-400 active:border-white/[0.06] active:bg-white/[0.05] active:text-zinc-100"
    }`;

  function quickTileClass(active: boolean, primary?: boolean) {
    const base = `${drawerLinkFocusClass} flex min-h-11 w-full min-w-0 touch-manipulation items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors duration-150 ease-out motion-reduce:transition-none`;
    if (active) {
      return `${base} border-sky-400/35 bg-sky-500/[0.12] text-sky-50`;
    }
    if (primary) {
      return `${base} text-zinc-50 ${quickActionPrimaryShellClass} active:border-sky-400/45 active:bg-sky-500/[0.16]`;
    }
    return `${base} border-white/[0.08] bg-zinc-900/45 text-zinc-100 active:border-sky-400/25 active:bg-sky-500/[0.08]`;
  }

  const footerBtnClass = `${drawerLinkFocusClass} flex w-full min-h-12 items-center justify-center rounded-xl border border-white/[0.07] bg-zinc-950/70 px-4 text-sm font-medium tracking-wide text-zinc-400 touch-manipulation transition-colors duration-150 ease-out motion-reduce:transition-none active:border-sky-400/28 active:bg-sky-500/[0.08] active:text-sky-100/90`;

  const showQuickActions = Boolean(user) && !loading;

  const portal = (
    <div
      className="md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arden-mobile-drawer-title"
    >
      <div
        role="presentation"
        aria-hidden="true"
        className={`fixed inset-0 z-[90] bg-slate-950/75 backdrop-blur-[3px] transition-opacity motion-reduce:transition-none ${drawerMotionClass} ${
          animateIn ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onPointerDown={(e) => {
          if (e.button !== 0 && e.pointerType === "mouse") return;
          onClose();
        }}
      />

      <aside
        ref={panelRef}
        className={`fixed top-0 right-0 z-[100] flex h-[100dvh] max-h-[100dvh] w-[80%] max-w-[320px] flex-col border-l border-sky-500/12 bg-gradient-to-b from-zinc-950 from-40% via-zinc-950 to-black shadow-[inset_1px_0_0_rgba(56,189,248,0.055),-24px_0_64px_rgba(0,0,0,0.52)] transition-transform motion-reduce:transition-none ${drawerMotionClass} will-change-transform ${
          animateIn ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.055] px-4 pb-2.5 pt-1.5">
          <Link
            id="arden-mobile-drawer-title"
            href="/dashboard"
            onClick={onClose}
            className={`${drawerLinkFocusClass} min-h-11 min-w-0 truncate pr-2 text-base font-semibold tracking-tight text-white drop-shadow-[0_0_14px_rgba(56,189,248,0.08)]`}
          >
            Arden24
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className={`${drawerLinkFocusClass} flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-xl border border-white/[0.09] bg-zinc-900/65 text-zinc-400 touch-manipulation shadow-[inset_0_1px_0_0_rgba(255,255,255,0.035)] transition-colors duration-150 ease-out active:border-sky-400/35 active:bg-sky-500/[0.12] active:text-sky-100`}
            aria-label="Close navigation menu"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Single scroll region: quick actions + primary nav share space; header/footer stay fixed */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          {showQuickActions ? (
            <div className="shrink-0 border-b border-white/[0.06] px-4 py-2">
              <p
                id="arden-mobile-quick-actions-label"
                className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500"
              >
                Quick actions
              </p>
              <ul className="grid min-w-0 grid-cols-1 gap-1.5" aria-labelledby="arden-mobile-quick-actions-label">
                {QUICK_ACTIONS_CORE.map((action) => {
                  const active = isQuickActionActive(pathname, action.href, windowHash);
                  const label = action.labelCompact ?? action.label;
                  return (
                    <li key={action.id} className="min-w-0">
                      <Link
                        href={action.href}
                        onClick={onClose}
                        className={quickTileClass(active, action.primary)}
                        aria-current={active ? "page" : undefined}
                      >
                        <span
                          className={
                            action.primary
                              ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 bg-black/25 [&>svg]:h-4 [&>svg]:w-4"
                              : "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sky-500/20 bg-sky-500/[0.08] [&>svg]:h-4 [&>svg]:w-4"
                          }
                        >
                          {action.icon}
                        </span>
                        <span className="min-w-0 flex-1 text-[0.875rem] font-semibold leading-snug tracking-tight">
                          {label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <nav className="min-w-0 px-4 py-3" aria-label="Primary navigation">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Menu</p>
            <ul className="flex flex-col gap-2">
              {navItems.map((item) => {
                const active = isMainNavItemActive(pathname, item.href);
                const badgeCount = item.showBadge ? liveTradesCount : 0;
                return (
                  <li key={item.href} className="w-full min-w-0">
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={navLinkClass(active)}
                    >
                      <span className="relative flex shrink-0">
                        {item.icon}
                        {badgeCount > 0 && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-400/95 px-1 text-[10px] font-bold text-zinc-950 shadow-[0_0_6px_rgba(56,189,248,0.32)]">
                            {badgeCount > 99 ? "99+" : badgeCount}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1 text-left">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="shrink-0 border-t border-sky-500/[0.08] bg-black/22 px-4 pb-2.5 pt-3 backdrop-blur-[6px]">
          {!loading &&
            (user ? (
              <div className="flex flex-col gap-2">
                <Link href="/account" onClick={onClose} className={footerBtnClass}>
                  Account
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className={`${drawerLinkFocusClass} flex w-full min-h-12 items-center justify-center rounded-xl border border-white/[0.07] bg-zinc-950/55 px-4 text-sm font-medium tracking-wide text-zinc-400 touch-manipulation transition-colors duration-150 ease-out active:border-red-400/35 active:bg-red-500/[0.1] active:text-red-200/90`}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/sign-in"
                  onClick={onClose}
                  className={`${footerBtnClass} border-sky-400/28 bg-sky-500/[0.1] text-sky-100/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] active:border-sky-400/45 active:bg-sky-500/[0.18] active:text-white`}
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  onClick={onClose}
                  className={`${footerBtnClass} border-sky-400/28 bg-sky-500/[0.1] text-sky-100/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] active:border-sky-400/45 active:bg-sky-500/[0.18] active:text-white`}
                >
                  Sign up
                </Link>
              </div>
            ))}
        </div>
      </aside>
    </div>
  );

  return createPortal(portal, document.body);
}
