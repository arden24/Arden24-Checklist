"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type AppModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** When false, clicking the backdrop does not call onClose */
  closeOnBackdrop?: boolean;
  /** Panel max width tailwind fragment, e.g. max-w-md */
  panelClassName?: string;
  labelledBy?: string;
  describedBy?: string;
  /**
   * Keeps keyboard focus inside the dialog panel (e.g. help content).
   * Backdrop stays out of the tab order via tabIndex={-1}.
   */
  trapFocus?: boolean;
};

export function AppModal({
  open,
  onClose,
  children,
  closeOnBackdrop = true,
  panelClassName = "max-w-md",
  labelledBy,
  describedBy,
  trapFocus = false,
}: AppModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const fallbackTitleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !trapFocus) return;
    const panel = panelRef.current;
    if (!panel) return;

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target;
      if (t instanceof Node && panel.contains(t)) return;
      const first = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    };

    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [open, trapFocus]);

  useEffect(() => {
    if (!open) return;
    const el = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    window.setTimeout(() => el?.focus(), 10);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center px-3 pt-3 sm:items-center sm:px-4 sm:pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px)+0.5rem)]"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
        onClick={() => closeOnBackdrop && onClose()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? fallbackTitleId}
        aria-describedby={describedBy}
        className={`relative z-[151] max-h-[min(92dvh,720px)] w-full min-w-0 overflow-y-auto rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-5 shadow-[0_24px_80px_rgba(0,0,0,0.85)] sm:p-6 ${panelClassName}`.trim()}
      >
        {children}
      </div>
    </div>
  );
}
