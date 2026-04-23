"use client";

import { useId, type ReactNode } from "react";
import { AppModal } from "@/components/AppModal";
import type { PageHelpContent, PageHelpKey } from "@/lib/help/page-help-content";
import { getPageHelpContent } from "@/lib/help/page-help-content";

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

export function HelpModal({ pageKey, open, onClose }: HelpModalProps) {
  const content: PageHelpContent = getPageHelpContent(pageKey);
  const titleId = useId();
  const purposeId = useId();

  return (
    <AppModal
      open={open}
      onClose={onClose}
      trapFocus
      panelClassName="max-w-lg"
      labelledBy={titleId}
      describedBy={purposeId}
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
    </AppModal>
  );
}
