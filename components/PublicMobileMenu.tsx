"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MOBILE_DRAWER_TRANSITION_MS,
  drawerLinkFocusClass,
  drawerMotionClass,
  useDrawerFocusTrap,
  useReturnFocusToTrigger,
} from "@/lib/mobile-drawer";

export default function PublicMobileMenu() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
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
      if (mq.matches) setOpen(false);
    }
    mq.addEventListener("change", closeOnDesktop);
    return () => mq.removeEventListener("change", closeOnDesktop);
  }, [mounted]);

  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

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

  return (
    <>
      <button
        ref={menuButtonRef}
        type="button"
        onClick={() => setOpen(true)}
        className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-zinc-200 touch-manipulation md:hidden ${drawerLinkFocusClass}`}
        aria-label="Open navigation menu"
        aria-haspopup="dialog"
        aria-expanded={open || visible}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>

      {mounted &&
        visible &&
        createPortal(
          <div
            className="md:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="arden-public-drawer-title"
          >
            <div
              role="presentation"
              aria-hidden="true"
              className={`fixed inset-0 z-[90] bg-slate-950/75 backdrop-blur-[3px] transition-opacity motion-reduce:transition-none ${drawerMotionClass} ${
                animateIn ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              onPointerDown={(e) => {
                if (e.button !== 0 && e.pointerType === "mouse") return;
                setOpen(false);
              }}
            />

            <aside
              ref={panelRef}
              className={`fixed top-0 right-0 z-[100] flex max-h-[100dvh] min-h-[100dvh] w-[80%] max-w-[320px] flex-col border-l border-sky-500/12 bg-gradient-to-b from-zinc-950 from-40% via-zinc-950 to-black shadow-[inset_1px_0_0_rgba(56,189,248,0.055),-24px_0_64px_rgba(0,0,0,0.52)] transition-transform motion-reduce:transition-none ${drawerMotionClass} will-change-transform ${
                animateIn ? "translate-x-0" : "translate-x-full"
              }`}
              style={{
                paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
              }}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.055] px-4 pb-3 pt-1.5">
                <span
                  id="arden-public-drawer-title"
                  className="min-h-11 truncate pr-2 text-base font-semibold tracking-tight text-white drop-shadow-[0_0_14px_rgba(56,189,248,0.08)]"
                >
                  Arden24
                </span>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  className={`${drawerLinkFocusClass} flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-lg border border-white/[0.09] bg-zinc-900/65 text-zinc-400 touch-manipulation shadow-[inset_0_1px_0_0_rgba(255,255,255,0.035)] transition-[border-color,background-color,color,box-shadow] duration-200 hover:border-sky-400/32 hover:bg-sky-500/[0.09] hover:text-sky-100`}
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

              <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-6">
                <Link
                  href="/sign-in"
                  onClick={() => setOpen(false)}
                  className={`${drawerLinkFocusClass} mb-2.5 flex min-h-[3rem] w-full items-center justify-center rounded-xl border border-sky-400/28 bg-sky-500/[0.11] text-[0.9375rem] font-semibold tracking-[-0.01em] text-sky-100 touch-manipulation shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(56,189,248,0.07)] transition-[background-color,border-color,box-shadow,color] duration-200 hover:border-sky-400/48 hover:bg-sky-500/18 hover:text-white active:bg-sky-500/20`}
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setOpen(false)}
                  className={`${drawerLinkFocusClass} flex min-h-[3rem] w-full items-center justify-center rounded-xl border border-sky-400/28 bg-sky-500/[0.11] text-[0.9375rem] font-semibold tracking-[-0.01em] text-sky-100 touch-manipulation shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(56,189,248,0.07)] transition-[background-color,border-color,box-shadow,color] duration-200 hover:border-sky-400/48 hover:bg-sky-500/18 hover:text-white active:bg-sky-500/20`}
                >
                  Sign up
                </Link>
                <div
                  className="my-6 h-px w-full bg-gradient-to-r from-transparent via-sky-500/20 to-transparent"
                  aria-hidden
                />
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className={`${drawerLinkFocusClass} flex min-h-11 w-full items-center justify-center rounded-xl border border-transparent text-sm font-medium tracking-wide text-zinc-500 transition-[color,background-color,border-color] duration-200 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-zinc-300`}
                >
                  Home
                </Link>
              </div>

              <p className="shrink-0 border-t border-sky-500/[0.08] bg-black/22 px-4 pt-3.5 pb-2.5 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500/90 backdrop-blur-[6px]">
                For journaling and discipline only
              </p>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
