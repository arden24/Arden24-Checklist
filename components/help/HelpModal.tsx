"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import type { PageHelpContent, PageHelpKey } from "@/lib/help/page-help-content";
import { getPageHelpContent } from "@/lib/help/page-help-content";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type HelpModalProps = {
  pageKey: PageHelpKey;
  open: boolean;
  onClose: () => void;
};

function HelpSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-5 first:mt-0">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed text-zinc-300">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 list-disc space-y-2 pl-5 marker:text-zinc-500">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * Viewport-safe help panel below the fixed app header (not centered AppModal layout).
 */
export function HelpModal({ pageKey, open, onClose }: HelpModalProps) {
  const content: PageHelpContent = getPageHelpContent(pageKey);
  const titleId = useId();
  const purposeId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

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
    if (!open) return;
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
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    window.setTimeout(() => el?.focus(), 10);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-x-hidden" role="presentation">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close help"
        className="absolute inset-0 z-[9999] bg-black/75 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={purposeId}
        className="help-popover fixed right-4 top-[calc(var(--app-header-offset)+0.5rem)] z-[10000] max-h-[calc(100dvh-120px)] w-[min(22.5rem,calc(100vw-2rem))] min-w-0 overflow-y-auto overflow-x-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black p-5 shadow-[0_24px_80px_rgba(0,0,0,0.85)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <h2 id={titleId} className="text-lg font-semibold text-white">
            {content.modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-sky-400/50 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          >
            Close
          </button>
        </div>

        <HelpSection title="What this page is for">
          <p id={purposeId}>{content.purpose}</p>
        </HelpSection>

        <HelpSection title="How to use it">
          <BulletList items={content.howToUse} />
        </HelpSection>

        <HelpSection title="Tips / best practice">
          <BulletList items={content.tips} />
        </HelpSection>

        <HelpSection title="Common mistakes to avoid">
          <BulletList items={content.mistakes} />
        </HelpSection>

        <p className="mt-6 border-t border-white/10 pt-4 text-[11px] leading-snug text-zinc-500">
          Arden24 is for journaling and self-review only. It does not provide financial advice, signals,
          or recommendations to buy or sell any instrument.
        </p>
      </div>
    </div>
  );
}
